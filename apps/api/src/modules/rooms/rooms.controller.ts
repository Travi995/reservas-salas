import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { parseUuid } from '../../common/pipes/parse-uuid.pipe.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import type { AuthUser } from '../auth/interfaces/auth-user.interface.js';
import { Role } from '../users/enums/role.enum.js';
import { CreateRoomDto } from './dtos/create-room.dto.js';
import { ListRoomsQueryDto } from './dtos/list-rooms-query.dto.js';
import { UpdateRoomDto } from './dtos/update-room.dto.js';
import { RoomsService } from './rooms.service.js';

@ApiTags('rooms')
@ApiBearerAuth()
@Controller('rooms')
export class RoomsController {
  constructor(private readonly rooms: RoomsService) {}

  /** 200 · 401. Members only ever see active rooms. */
  @Get()
  list(@Query() query: ListRoomsQueryDto, @CurrentUser() user: AuthUser) {
    return this.rooms.list(
      user.role === Role.Admin && query.includeInactive === true,
    );
  }

  /** 201 · 400 · 401 · 403. */
  @Roles(Role.Admin)
  @Post()
  create(@Body() dto: CreateRoomDto) {
    return this.rooms.create(dto);
  }

  /** 200 · 400 · 401 · 403 · 404. */
  @Roles(Role.Admin)
  @Patch(':id')
  update(@Param('id', parseUuid()) id: string, @Body() dto: UpdateRoomDto) {
    return this.rooms.update(id, dto);
  }
}
