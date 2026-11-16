import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppException } from '../../common/exceptions/app.exception.js';
import type { CreateRoomDto } from './dtos/create-room.dto.js';
import type { UpdateRoomDto } from './dtos/update-room.dto.js';
import { Room } from './entities/room.entity.js';

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room) private readonly rooms: Repository<Room>,
  ) {}

  list(includeInactive: boolean) {
    return this.rooms.find({
      where: includeInactive ? {} : { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async findOrFail(id: string) {
    const room = await this.rooms.findOneBy({ id });
    if (!room)
      throw new AppException(
        HttpStatus.NOT_FOUND,
        'ROOM_NOT_FOUND',
        'La sala no existe.',
      );
    return room;
  }

  async create(dto: CreateRoomDto) {
    const { id } = await this.rooms.save(this.rooms.create(dto));
    // Re-read so the response has the same shape as every other room response.
    return this.findOrFail(id);
  }

  async update(id: string, dto: UpdateRoomDto) {
    const room = await this.findOrFail(id);
    return this.rooms.save(this.rooms.merge(room, dto));
  }
}
