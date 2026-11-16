import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Clock } from '../../common/clock/clock.js';
import { isPgError, PG } from '../../common/database/pg-errors.js';
import { AppException } from '../../common/exceptions/app.exception.js';
import { Reservation } from '../reservations/entities/reservation.entity.js';
import { ReservationStatus } from '../reservations/enums/reservation-status.enum.js';
import type { CreateRoomDto } from './dtos/create-room.dto.js';
import type { UpdateRoomDto } from './dtos/update-room.dto.js';
import { Room } from './entities/room.entity.js';

@Injectable()
export class RoomsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(Room) private readonly rooms: Repository<Room>,
    private readonly clock: Clock,
  ) {}

  list(includeInactive: boolean) {
    return this.rooms.find({
      where: includeInactive ? {} : { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async findOrFail(id: string) {
    const room = await this.rooms.findOneBy({ id });
    if (!room) throw roomNotFound();
    return room;
  }

  /** 409 ROOM_NAME_TAKEN if the name exists (the unique constraint also covers two creations at once). */
  async create(dto: CreateRoomDto) {
    try {
      const { id } = await this.rooms.save(this.rooms.create(dto));
      // Re-read so the response has the same shape as every other room response.
      return await this.findOrFail(id);
    } catch (e) {
      throw nameTakenOr(e);
    }
  }

  /**
   * Partial update inside a transaction that locks the room row, so that:
   * - two admins saving at once are serialized and the second one fails the `version` check (409);
   * - a time zone change sees every reservation already committed for the room (bookings lock the row FOR SHARE).
   * Order of checks = order of status codes: 404 → 409 stale version → 422 time zone → 409 name taken.
   */
  async update(id: string, { version, ...changes }: UpdateRoomDto) {
    try {
      return await this.dataSource.transaction(async (tx) => {
        const room = await tx.findOne(Room, {
          where: { id },
          lock: { mode: 'pessimistic_write' },
        });
        if (!room) throw roomNotFound();

        if (version !== undefined && version !== room.version) {
          throw new AppException(
            HttpStatus.CONFLICT,
            'ROOM_MODIFIED',
            'Otra persona modificó esta sala mientras la editabas. Revisa los datos actuales y vuelve a guardar.',
          );
        }

        if (
          changes.timezone !== undefined &&
          changes.timezone !== room.timezone
        ) {
          // Reservations are stored in UTC: a new zone would move the local time of every booking.
          const upcoming = await tx
            .createQueryBuilder(Reservation, 'r')
            .where('r.room_id = :id AND r.status = :active', {
              id,
              active: ReservationStatus.Active,
            })
            .andWhere('r.ends_at > :now', { now: this.clock.now() })
            .getCount();
          if (upcoming > 0) {
            throw new AppException(
              HttpStatus.UNPROCESSABLE_ENTITY,
              'ROOM_HAS_RESERVATIONS',
              `No se puede cambiar la zona horaria: la sala tiene ${upcoming} ${upcoming === 1 ? 'reserva pendiente' : 'reservas pendientes'} y su hora cambiaría. Cancélalas antes o crea una sala nueva.`,
              [
                {
                  field: 'timezone',
                  message:
                    'La sala tiene reservas pendientes: su hora cambiaría.',
                },
              ],
            );
          }
        }

        return await tx.save(tx.merge(Room, room, changes));
      });
    } catch (e) {
      throw nameTakenOr(e);
    }
  }
}

function roomNotFound() {
  return new AppException(
    HttpStatus.NOT_FOUND,
    'ROOM_NOT_FOUND',
    'La sala no existe.',
  );
}

/** Translates the unique violation on `rooms.name` into a 409 pointing at the field; anything else is rethrown. */
function nameTakenOr(e: unknown) {
  if (!isPgError(e, PG.UNIQUE_VIOLATION)) return e;
  const message = 'Ya existe una sala con ese nombre.';
  return new AppException(HttpStatus.CONFLICT, 'ROOM_NAME_TAKEN', message, [
    { field: 'name', message },
  ]);
}
