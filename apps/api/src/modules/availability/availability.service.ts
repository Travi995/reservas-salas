import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThanOrEqual, Repository } from 'typeorm';
import { AppException } from '../../common/exceptions/app.exception.js';
import { dayRangeUtc } from '../../common/time/zoned-time.js';
import { Reservation } from '../reservations/entities/reservation.entity.js';
import { ReservationStatus } from '../reservations/enums/reservation-status.enum.js';
import { overlaps } from '../reservations/reservation-rules.js';
import { Room } from '../rooms/entities/room.entity.js';
import type { AvailabilityQueryDto } from './dtos/availability-query.dto.js';
import type { WeekQueryDto } from './dtos/week-query.dto.js';
import type {
  AvailabilityResponse,
  BusySlot,
  WeekResponse,
} from './interfaces/availability-response.interface.js';
import { localDate, mondayOf, weekDates } from './week.js';

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectRepository(Room) private readonly rooms: Repository<Room>,
    @InjectRepository(Reservation)
    private readonly reservations: Repository<Reservation>,
  ) {}

  /**
   * Busy slots of one room from Monday to Sunday, in the room's time zone.
   * Inactive rooms are allowed: their past reservations must stay visible (brief, section 2).
   * Reservations never cross midnight, so each one belongs to the day it starts on.
   */
  async forWeek({ roomId, date }: WeekQueryDto): Promise<WeekResponse> {
    const room = await this.rooms.findOneBy({ id: roomId });
    if (!room)
      throw new AppException(
        HttpStatus.NOT_FOUND,
        'ROOM_NOT_FOUND',
        'La sala no existe.',
      );

    const dates = weekDates(mondayOf(date));
    const from = dayRangeUtc(dates[0], room.timezone).start;
    const to = dayRangeUtc(dates[6], room.timezone).end;

    const busy = await this.busyQuery()
      .where({ roomId: room.id, status: ReservationStatus.Active })
      .andWhere('r.starts_at < :to AND r.ends_at > :from', { from, to })
      .getMany();

    return {
      room,
      weekStart: dates[0],
      days: dates.map((d) => ({
        date: d,
        reservations: busy
          .filter((r) => localDate(r.startsAt, room.timezone) === d)
          .map(toSlot),
      })),
    };
  }

  private busyQuery() {
    return this.reservations
      .createQueryBuilder('r')
      .innerJoin('r.user', 'u')
      .addSelect(['u.id', 'u.name'])
      .orderBy('r.starts_at', 'ASC');
  }

  /** Active rooms (optionally with a minimum capacity) and their busy slots on `date`, in each room's own day. */
  async forDay({
    date,
    minCapacity,
  }: AvailabilityQueryDto): Promise<AvailabilityResponse> {
    const rooms = await this.rooms.find({
      where: {
        isActive: true,
        ...(minCapacity ? { capacity: MoreThanOrEqual(minCapacity) } : {}),
      },
      order: { name: 'ASC' },
    });
    if (rooms.length === 0) return { date, rooms: [] };

    // Each room has its own day range; one query covers all of them, then we split per room.
    const ranges = new Map(
      rooms.map((r) => [r.id, dayRangeUtc(date, r.timezone)]),
    );
    const from = new Date(
      Math.min(...[...ranges.values()].map((r) => r.start.getTime())),
    );
    const to = new Date(
      Math.max(...[...ranges.values()].map((r) => r.end.getTime())),
    );

    const busy = await this.busyQuery()
      .where({
        roomId: In(rooms.map((r) => r.id)),
        status: ReservationStatus.Active,
      })
      .andWhere('r.starts_at < :to AND r.ends_at > :from', { from, to })
      .getMany();

    return {
      date,
      rooms: rooms.map((room) => {
        const day = ranges.get(room.id)!;
        return {
          room,
          reservations: busy
            .filter(
              (r) =>
                r.roomId === room.id &&
                overlaps(r.startsAt, r.endsAt, day.start, day.end),
            )
            .map(toSlot),
        };
      }),
    };
  }
}

function toSlot(r: Reservation): BusySlot {
  return {
    id: r.id,
    title: r.title,
    startsAt: r.startsAt,
    endsAt: r.endsAt,
    userId: r.userId,
    userName: r.user.name,
  };
}
