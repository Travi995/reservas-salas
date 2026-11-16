import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { parseUuid } from '../../common/pipes/parse-uuid.pipe.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthUser } from '../auth/interfaces/auth-user.interface.js';
import { CreateReservationDto } from './dtos/create-reservation.dto.js';
import { ReservationsService } from './reservations.service.js';

@ApiTags('reservations')
@ApiBearerAuth()
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservations: ReservationsService) {}

  /** 201 · 400 · 401 · 404 room · 409 overlap · 422 business rule. */
  @Post()
  create(@Body() dto: CreateReservationDto, @CurrentUser() user: AuthUser) {
    return this.reservations.create(dto, user);
  }

  /** 200 · 401. Upcoming (soonest first) and past (most recent first), split. */
  @Get('me')
  mine(@CurrentUser() user: AuthUser) {
    return this.reservations.findMine(user.id);
  }

  /** 200 · 400 · 401 · 403 not yours · 404 · 409 already cancelled · 422 already started. A state change, not a delete. */
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(@Param('id', parseUuid()) id: string, @CurrentUser() user: AuthUser) {
    return this.reservations.cancel(id, user);
  }
}
