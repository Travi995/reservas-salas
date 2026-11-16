import { randomUUID } from 'node:crypto';
import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
  Brackets,
  DataSource,
  EntityManager,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { Clock } from '../../common/clock/clock.js';
import { isPgError, PG } from '../../common/database/pg-errors.js';
import { paginate, type Paginated } from '../../common/pagination/paginated.js';
import { AppException } from '../../common/exceptions/app.exception.js';
import { formatTime, zonedToUtc } from '../../common/time/zoned-time.js';
import type { AuthUser } from '../auth/interfaces/auth-user.interface.js';
import { Room } from '../rooms/entities/room.entity.js';
import { Role } from '../users/enums/role.enum.js';
import type { CreateRecurringReservationDto } from './dtos/create-recurring-reservation.dto.js';
import type { CreateReservationDto } from './dtos/create-reservation.dto.js';
import type { ListReservationsQueryDto } from './dtos/list-reservations-query.dto.js';
import type {
  SortedPaginationQueryDto,
  SortField,
} from './dtos/sorted-pagination-query.dto.js';
import type {
  MyReservationsQueryDto,
  ReservationScope,
} from './dtos/my-reservations-query.dto.js';
import { Reservation } from './entities/reservation.entity.js';
import { ReservationStatus } from './enums/reservation-status.enum.js';
import type {
  AdminReservationResponse,
  MyReservationsPage,
  RecurringReservationResponse,
  ReservationResponse,
} from './interfaces/reservation-response.interface.js';
import { formatDate, weeklyDates } from './recurrence.js';
import { checkTimeRules } from './reservation-rules.js';

/** One occurrence of a series, already converted to UTC with the room's zone. */
interface Slot {
  date: string;
  startsAt: Date;
  endsAt: Date;
}

/** Lost a race against another booking of the same room: both are answered as a 409, never a 500. */
const LOST_RACE = [PG.EXCLUSION_VIOLATION, PG.DEADLOCK_DETECTED];

/**
 * SQL expression behind each sortable column (fixed strings: user input only selects one).
 * Text is compared case-insensitively; `time` is the time of day in the room's own time zone.
 */
const SORT_EXPRESSIONS: Record<SortField, string> = {
  date: 'r.starts_at',
  time: '(r.starts_at AT TIME ZONE room.time_zone)::time',
  title: 'LOWER(r.title)',
  room: 'LOWER(room.name)',
  user: 'LOWER("user".name)',
  status: 'r.status::text',
};

@Injectable()
export class ReservationsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(Reservation)
    private readonly reservations: Repository<Reservation>,
    private readonly clock: Clock,
  ) {}

  /**
   * Creates a reservation. Order of checks = order of status codes:
   * 404 room → 422 inactive room → 422 time rules → 409 overlap.
   * Bookings of one room run one at a time (advisory lock), so the pre-check sees the winner and names its slot;
   * the EXCLUDE constraint stays as the final guarantee (ADR-0003).
   */
  async create(
    dto: CreateReservationDto,
    user: AuthUser,
  ): Promise<ReservationResponse> {
    try {
      return await this.dataSource.transaction(async (tx) => {
        const room = await this.lockBookableRoom(tx, dto.roomId);
        const startsAt = zonedToUtc(dto.date, dto.startTime, room.timezone);
        const endsAt = zonedToUtc(dto.date, dto.endTime, room.timezone);
        const violation = checkTimeRules(startsAt, endsAt, this.clock.now());
        if (violation)
          throw new AppException(
            violation.status,
            violation.code,
            violation.message,
          );

        const conflict = await this.findConflict(tx, room.id, startsAt, endsAt);
        if (conflict) throw this.overlapError(conflict, room, user.id);

        const { id } = await tx.save(
          tx.create(Reservation, {
            roomId: room.id,
            userId: user.id,
            title: dto.title,
            startsAt,
            endsAt,
          }),
        );
        return this.toResponse(
          await tx.findOneByOrFail(Reservation, { id }),
          room,
        );
      });
    } catch (e) {
      // Lost the race: another request inserted an overlapping reservation after our pre-check.
      if (isPgError(e, ...LOST_RACE)) {
        throw await this.overlapErrorAfterRace(dto, user.id);
      }
      throw e;
    }
  }

  /**
   * Weekly series, all or nothing (optional feature of the brief): every occurrence must pass the
   * section 4 rules and be free. If any date clashes, nothing is created and the 409 lists every
   * conflicting date. All inserts share one transaction, so the EXCLUDE constraint still guards races.
   */
  async createRecurring(
    dto: CreateRecurringReservationDto,
    user: AuthUser,
  ): Promise<RecurringReservationResponse> {
    try {
      return await this.dataSource.transaction(async (tx) => {
        const room = await this.lockBookableRoom(tx, dto.roomId);
        const slots = this.seriesSlots(dto, room);

        const now = this.clock.now();
        for (const slot of slots) {
          const violation = checkTimeRules(slot.startsAt, slot.endsAt, now);
          if (violation)
            throw new AppException(
              violation.status,
              violation.code,
              violation.message,
            );
        }

        const conflicts = await this.findSeriesConflicts(tx, room, slots);
        if (conflicts.length) throw this.seriesOverlapError(conflicts, room);

        const seriesId = randomUUID();
        await tx.insert(
          Reservation,
          slots.map((s) => ({
            roomId: room.id,
            userId: user.id,
            title: dto.title,
            startsAt: s.startsAt,
            endsAt: s.endsAt,
            seriesId,
          })),
        );
        const rows = await tx.find(Reservation, {
          where: { seriesId },
          order: { startsAt: 'ASC' },
        });
        return {
          seriesId,
          reservations: rows.map((r) => this.toResponse(r, room)),
        };
      });
    } catch (e) {
      if (isPgError(e, ...LOST_RACE)) {
        // Lost a race on one of the dates: recompute the conflicts outside the rolled-back transaction.
        const room = await this.dataSource
          .getRepository(Room)
          .findOneByOrFail({ id: dto.roomId });
        const conflicts = await this.findSeriesConflicts(
          this.dataSource.manager,
          room,
          this.seriesSlots(dto, room),
        );
        throw this.seriesOverlapError(conflicts, room);
      }
      throw e;
    }
  }

  /** One page of the user's upcoming (soonest first) or past (most recent first) reservations. */
  async findMine(
    userId: string,
    query: MyReservationsQueryDto,
  ): Promise<MyReservationsPage> {
    const qb = this.reservations
      .createQueryBuilder('r')
      .innerJoinAndSelect('r.room', 'room')
      .leftJoin('r.cancelledBy', 'canceller')
      .addSelect(['canceller.id', 'canceller.name'])
      .where('r.user_id = :userId', { userId });
    this.applyScope(qb, query.scope);
    // The list keeps cancelled reservations (marked as such); the tab counter must not count them.
    const activeItems = await qb
      .clone()
      .andWhere('r.status = :active', { active: ReservationStatus.Active })
      .getCount();
    this.applySort(qb, query, { withUser: false });
    const page = await this.page(qb, query.page, query.pageSize, (r) =>
      this.toResponse(r),
    );
    return { ...page, meta: { ...page.meta, activeItems } };
  }

  /** Admin listing of every reservation, filtered, searched and paginated in the database. */
  async findAll(
    query: ListReservationsQueryDto,
  ): Promise<Paginated<AdminReservationResponse>> {
    const qb = this.reservations
      .createQueryBuilder('r')
      .innerJoinAndSelect('r.room', 'room')
      .innerJoin('r.user', 'user')
      .addSelect(['user.id', 'user.name', 'user.email'])
      .leftJoin('r.cancelledBy', 'canceller')
      .addSelect(['canceller.id', 'canceller.name']);

    if (query.status)
      qb.andWhere('r.status = :status', { status: query.status });
    if (query.roomId)
      qb.andWhere('r.room_id = :roomId', { roomId: query.roomId });
    if (query.search) {
      // Escape LIKE wildcards so "%" or "_" typed by the user are matched literally.
      const term = `%${query.search.replace(/[\\%_]/g, '\\$&')}%`;
      qb.andWhere(
        new Brackets((w) =>
          w
            // unaccent on both sides: "reunion" finds "Reunión", "nunez" finds "Ñúñez".
            .where('unaccent(r.title) ILIKE unaccent(:term)')
            .orWhere('unaccent(room.name) ILIKE unaccent(:term)')
            .orWhere('unaccent(user.name) ILIKE unaccent(:term)')
            .orWhere('user.email ILIKE :term'),
        ),
        { term },
      );
    }
    if (query.scope) this.applyScope(qb, query.scope);
    else qb.orderBy('r.starts_at', 'DESC').addOrderBy('r.id', 'ASC');

    this.applySort(qb, query, { withUser: true });
    return this.page(qb, query.page, query.pageSize, (r) => ({
      ...this.toResponse(r),
      user: { id: r.user.id, name: r.user.name, email: r.user.email },
    }));
  }

  /**
   * By date only, independent of the status filter (so "cancelled + upcoming" works):
   * upcoming = not finished yet (includes the ones in progress), soonest first;
   * past = already finished, most recent first. `r.id` breaks ties so pages are stable.
   */
  private applyScope(
    qb: SelectQueryBuilder<Reservation>,
    scope: ReservationScope,
  ) {
    const now = this.clock.now();
    if (scope === 'upcoming') {
      qb.andWhere('r.ends_at > :now', { now })
        .orderBy('r.starts_at', 'ASC')
        .addOrderBy('r.id', 'ASC');
    } else {
      qb.andWhere('r.ends_at <= :now', { now })
        .orderBy('r.starts_at', 'DESC')
        .addOrderBy('r.id', 'ASC');
    }
  }

  /**
   * Optional column sort chosen by the client; replaces the default order of the listing.
   * Ties fall back to start time and id so pagination stays stable. Case-insensitive for text.
   */
  private applySort(
    qb: SelectQueryBuilder<Reservation>,
    { sortBy, sortDir }: Pick<SortedPaginationQueryDto, 'sortBy' | 'sortDir'>,
    /** «My reservations» has no `user` join (every row is the caller's), so that column is a no-op there. */
    { withUser }: { withUser: boolean },
  ) {
    if (!sortBy || (sortBy === 'user' && !withUser)) return;
    qb.addSelect(SORT_EXPRESSIONS[sortBy], 'sort_key')
      .orderBy('sort_key', sortDir === 'desc' ? 'DESC' : 'ASC')
      .addOrderBy('r.starts_at', 'ASC')
      .addOrderBy('r.id', 'ASC');
  }

  /** LIMIT/OFFSET + COUNT in the database; the client never receives more than one page. */
  private async page<T>(
    qb: SelectQueryBuilder<Reservation>,
    page: number,
    pageSize: number,
    map: (r: Reservation) => T,
  ): Promise<Paginated<T>> {
    const [rows, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
    return paginate(rows.map(map), total, page, pageSize);
  }

  /** Owner or admin, only before it starts (applies to admins too). 404 → 403 → 409 → 422. */
  async cancel(id: string, user: AuthUser): Promise<ReservationResponse> {
    const reservation = await this.reservations.findOne({
      where: { id },
      relations: { room: true },
    });
    if (!reservation) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        'RESERVATION_NOT_FOUND',
        'La reserva no existe.',
      );
    }
    if (user.role !== Role.Admin && reservation.userId !== user.id) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        'FORBIDDEN',
        'Solo puedes cancelar tus propias reservas.',
      );
    }
    if (reservation.status === ReservationStatus.Cancelled) {
      throw new AppException(
        HttpStatus.CONFLICT,
        'ALREADY_CANCELLED',
        'La reserva ya estaba cancelada.',
      );
    }
    const now = this.clock.now();
    if (reservation.startsAt <= now) {
      throw new AppException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'ALREADY_STARTED',
        'No se puede cancelar una reserva que ya empezó.',
      );
    }

    // Conditional update: if two cancellations race, only one changes the row.
    const result = await this.reservations
      .createQueryBuilder()
      .update()
      .set({
        status: ReservationStatus.Cancelled,
        cancelledAt: now,
        cancelledById: user.id,
      })
      .where('id = :id AND status = :active', {
        id,
        active: ReservationStatus.Active,
      })
      .execute();
    if (!result.affected) {
      throw new AppException(
        HttpStatus.CONFLICT,
        'ALREADY_CANCELLED',
        'La reserva ya estaba cancelada.',
      );
    }
    return {
      ...this.toResponse(
        reservation,
        reservation.room,
        ReservationStatus.Cancelled,
      ),
      cancelledBy: { id: user.id, name: user.name },
    };
  }

  /**
   * Serializes the bookings of one room and locks its row. 404 → 422 inactive.
   *
   * - Advisory lock (per room, released at commit/rollback): without it, two overlapping inserts wait on
   *   each other inside the EXCLUDE check and Postgres aborts one with a deadlock (a 500 for the user).
   *   Queued behind the lock, the second request reads the committed winner and gets a precise 409.
   *   Other rooms, reads and room edits are not blocked.
   * - Row lock FOR SHARE: a concurrent deactivation or time zone change waits until we commit.
   */
  private async lockBookableRoom(tx: EntityManager, roomId: string) {
    await tx.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [
      roomId,
    ]);
    const room = await tx.findOne(Room, {
      where: { id: roomId },
      lock: { mode: 'pessimistic_read' },
    });
    if (!room)
      throw new AppException(
        HttpStatus.NOT_FOUND,
        'ROOM_NOT_FOUND',
        'La sala no existe.',
      );
    if (!room.isActive) {
      throw new AppException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'ROOM_INACTIVE',
        'La sala está desactivada y no acepta reservas nuevas.',
      );
    }
    return room;
  }

  private seriesSlots(dto: CreateRecurringReservationDto, room: Room): Slot[] {
    return weeklyDates(dto.date, dto.weeks).map((date) => ({
      date,
      startsAt: zonedToUtc(date, dto.startTime, room.timezone),
      endsAt: zonedToUtc(date, dto.endTime, room.timezone),
    }));
  }

  private async findSeriesConflicts(
    manager: EntityManager,
    room: Room,
    slots: Slot[],
  ) {
    const conflicts: Array<{ slot: Slot; existing: Reservation }> = [];
    for (const slot of slots) {
      const existing = await this.findConflict(
        manager,
        room.id,
        slot.startsAt,
        slot.endsAt,
      );
      if (existing) conflicts.push({ slot, existing });
    }
    return conflicts;
  }

  /** 409 naming every clashing date; `details` has one entry per occurrence for the UI. */
  private seriesOverlapError(
    conflicts: Array<{ slot: Slot; existing: Reservation }>,
    room: Room,
  ) {
    if (!conflicts.length) {
      return new AppException(
        HttpStatus.CONFLICT,
        'ROOM_OVERLAP',
        'Alguna de las fechas acaba de ser reservada. Inténtalo de nuevo.',
      );
    }
    const describe = ({ slot, existing }: (typeof conflicts)[number]) =>
      `${formatDate(slot.date)} de ${formatTime(existing.startsAt, room.timezone)} a ${formatTime(existing.endsAt, room.timezone)}`;
    return new AppException(
      HttpStatus.CONFLICT,
      'ROOM_OVERLAP',
      `No se creó ninguna reserva. La sala ya está ocupada el ${conflicts.map(describe).join('; el ')}.`,
      conflicts.map((c) => ({
        field: c.slot.date,
        message: `La sala ya está reservada de ${formatTime(c.existing.startsAt, room.timezone)} a ${formatTime(c.existing.endsAt, room.timezone)}.`,
      })),
    );
  }

  private findConflict(
    tx: EntityManager,
    roomId: string,
    startsAt: Date,
    endsAt: Date,
  ) {
    return tx
      .createQueryBuilder(Reservation, 'r')
      .where('r.room_id = :roomId AND r.status = :active', {
        roomId,
        active: ReservationStatus.Active,
      })
      .andWhere(
        new Brackets((w) =>
          w.where('r.starts_at < :endsAt AND r.ends_at > :startsAt', {
            startsAt,
            endsAt,
          }),
        ),
      )
      .orderBy('r.starts_at')
      .getOne();
  }

  /**
   * When the clash is with the requester's own reservation (typically a retry after a lost response),
   * say so: otherwise they think someone else took the room.
   */
  private overlapError(conflict: Reservation, room: Room, userId?: string) {
    const from = formatTime(conflict.startsAt, room.timezone);
    const to = formatTime(conflict.endsAt, room.timezone);
    const mine = userId !== undefined && conflict.userId === userId;
    return new AppException(
      HttpStatus.CONFLICT,
      'ROOM_OVERLAP',
      mine
        ? `Ya tienes una reserva en esta sala de ${from} a ${to} («${conflict.title}»). Revísala en Mis reservas.`
        : `La sala ya está reservada de ${from} a ${to}.`,
    );
  }

  private async overlapErrorAfterRace(
    dto: CreateReservationDto,
    userId: string,
  ) {
    const room = await this.dataSource
      .getRepository(Room)
      .findOneByOrFail({ id: dto.roomId });
    const startsAt = zonedToUtc(dto.date, dto.startTime, room.timezone);
    const endsAt = zonedToUtc(dto.date, dto.endTime, room.timezone);
    const conflict = await this.findConflict(
      this.dataSource.manager,
      room.id,
      startsAt,
      endsAt,
    );
    return conflict
      ? this.overlapError(conflict, room, userId)
      : new AppException(
          HttpStatus.CONFLICT,
          'ROOM_OVERLAP',
          'La sala ya está reservada en ese horario.',
        );
  }

  private toResponse(
    r: Reservation,
    room: Room = r.room,
    status: ReservationStatus = r.status,
  ): ReservationResponse {
    return {
      id: r.id,
      title: r.title,
      startsAt: r.startsAt,
      endsAt: r.endsAt,
      status,
      seriesId: r.seriesId,
      cancelledBy: r.cancelledBy
        ? { id: r.cancelledBy.id, name: r.cancelledBy.name }
        : null,
      room,
    };
  }
}
