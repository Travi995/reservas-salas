import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
  Brackets,
  DataSource,
  EntityManager,
  QueryFailedError,
  Repository,
} from 'typeorm';
import { Clock } from '../../common/clock/clock.js';
import { AppException } from '../../common/exceptions/app.exception.js';
import { formatTime, zonedToUtc } from '../../common/time/zoned-time.js';
import type { AuthUser } from '../auth/interfaces/auth-user.interface.js';
import { Room } from '../rooms/entities/room.entity.js';
import { Role } from '../users/enums/role.enum.js';
import type { CreateReservationDto } from './dtos/create-reservation.dto.js';
import { Reservation } from './entities/reservation.entity.js';
import { ReservationStatus } from './enums/reservation-status.enum.js';
import type {
  MyReservationsResponse,
  ReservationResponse,
} from './interfaces/reservation-response.interface.js';
import { checkTimeRules } from './reservation-rules.js';

const EXCLUSION_VIOLATION = '23P01';

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
   * The pre-check gives a clear message; the EXCLUDE constraint is the real guarantee under concurrency (ADR-0003).
   */
  async create(
    dto: CreateReservationDto,
    user: AuthUser,
  ): Promise<ReservationResponse> {
    try {
      return await this.dataSource.transaction(async (tx) => {
        // FOR SHARE: a concurrent deactivation of this room waits until we commit.
        const room = await tx.findOne(Room, {
          where: { id: dto.roomId },
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
        if (conflict) throw this.overlapError(conflict, room);

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
      if (
        e instanceof QueryFailedError &&
        (e.driverError as { code?: string }).code === EXCLUSION_VIOLATION
      ) {
        throw await this.overlapErrorAfterRace(dto);
      }
      throw e;
    }
  }

  async findMine(userId: string): Promise<MyReservationsResponse> {
    const now = this.clock.now();
    const all = await this.reservations.find({
      where: { userId },
      relations: { room: true },
      order: { startsAt: 'ASC' },
    });
    // Upcoming = active and not finished yet (includes the ones in progress). Past = finished or cancelled.
    const upcoming = all.filter(
      (r) => r.status === ReservationStatus.Active && r.endsAt > now,
    );
    const past = all.filter((r) => !upcoming.includes(r)).reverse();
    return {
      upcoming: upcoming.map((r) => this.toResponse(r)),
      past: past.map((r) => this.toResponse(r)),
    };
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
      .set({ status: ReservationStatus.Cancelled, cancelledAt: now })
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
    return this.toResponse(
      reservation,
      reservation.room,
      ReservationStatus.Cancelled,
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

  private overlapError(conflict: Reservation, room: Room) {
    const from = formatTime(conflict.startsAt, room.timezone);
    const to = formatTime(conflict.endsAt, room.timezone);
    return new AppException(
      HttpStatus.CONFLICT,
      'ROOM_OVERLAP',
      `La sala ya está reservada de ${from} a ${to}.`,
    );
  }

  private async overlapErrorAfterRace(dto: CreateReservationDto) {
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
      ? this.overlapError(conflict, room)
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
      room,
    };
  }
}
