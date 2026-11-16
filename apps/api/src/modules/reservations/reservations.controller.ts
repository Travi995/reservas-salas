import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { parseUuid } from '../../common/pipes/parse-uuid.pipe.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import type { AuthUser } from '../auth/interfaces/auth-user.interface.js';
import { Role } from '../users/enums/role.enum.js';
import { CreateRecurringReservationDto } from './dtos/create-recurring-reservation.dto.js';
import { CreateReservationDto } from './dtos/create-reservation.dto.js';
import { ListReservationsQueryDto } from './dtos/list-reservations-query.dto.js';
import { MyReservationsQueryDto } from './dtos/my-reservations-query.dto.js';
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

  /** 201 · 400 · 401 · 404 room · 409 any date clashes (nothing is created) · 422 business rule. */
  @Post('recurring')
  createRecurring(
    @Body() dto: CreateRecurringReservationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.reservations.createRecurring(dto, user);
  }

  /** 200 · 400 · 401 · 403. Admin only: every reservation, paginated, searchable and filterable. */
  @Roles(Role.Admin)
  @Get()
  list(@Query() query: ListReservationsQueryDto) {
    return this.reservations.findAll(query);
  }

  /** 200 · 400 · 401. One page of upcoming (soonest first) or past (most recent first). */
  @Get('me')
  mine(@Query() query: MyReservationsQueryDto, @CurrentUser() user: AuthUser) {
    return this.reservations.findMine(user.id, query);
  }

  /** 200 · 400 · 401 · 403 not yours · 404 · 409 already cancelled · 422 already started. A state change, not a delete. */
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(@Param('id', parseUuid()) id: string, @CurrentUser() user: AuthUser) {
    return this.reservations.cancel(id, user);
  }
}
