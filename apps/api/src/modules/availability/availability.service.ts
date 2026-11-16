import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThanOrEqual, Repository } from 'typeorm';
import { dayRangeUtc } from '../../common/time/zoned-time.js';
import { Reservation } from '../reservations/entities/reservation.entity.js';
import { ReservationStatus } from '../reservations/enums/reservation-status.enum.js';
import { overlaps } from '../reservations/reservation-rules.js';
import { Room } from '../rooms/entities/room.entity.js';
import type { AvailabilityQueryDto } from './dtos/availability-query.dto.js';
import type { AvailabilityResponse } from './interfaces/availability-response.interface.js';

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectRepository(Room) private readonly rooms: Repository<Room>,
    @InjectRepository(Reservation)
    private readonly reservations: Repository<Reservation>,
  ) {}

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

    const busy = await this.reservations
      .createQueryBuilder('r')
      .innerJoin('r.user', 'u')
      .addSelect(['u.id', 'u.name'])
      .where({
        roomId: In(rooms.map((r) => r.id)),
        status: ReservationStatus.Active,
      })
      .andWhere('r.starts_at < :to AND r.ends_at > :from', { from, to })
      .orderBy('r.starts_at', 'ASC')
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
            .map((r) => ({
              id: r.id,
              title: r.title,
              startsAt: r.startsAt,
              endsAt: r.endsAt,
              userId: r.userId,
              userName: r.user.name,
            })),
        };
      }),
    };
  }
}
