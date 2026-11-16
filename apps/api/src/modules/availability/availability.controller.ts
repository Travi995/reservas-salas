import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  ApiRoomNotFoundError,
  ApiUnauthorizedError,
  ApiValidationError,
} from '../../common/swagger/api-error.docs.js';
import { AvailabilityService } from './availability.service.js';
import {
  AvailabilityResponseDto,
  WeekResponseDto,
} from './dtos/availability-response.dto.js';
import { AvailabilityQueryDto } from './dtos/availability-query.dto.js';
import { WeekQueryDto } from './dtos/week-query.dto.js';

@ApiTags('availability')
@ApiBearerAuth()
@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availability: AvailabilityService) {}

  /** 200 · 400 · 401. Busy slots per active room for one day. */
  @ApiOperation({
    summary: 'Horarios ocupados de un día, por sala',
    description:
      'Para una fecha devuelve, **por cada sala activa**, sus franjas ocupadas (las reservas canceladas no cuentan). El «día» es el de cada sala, en su propia zona horaria.\n\n`minCapacity` filtra las salas para al menos esa cantidad de personas (por ejemplo `8` = «salas para 8 o más»).',
  })
  @ApiOkResponse({ type: AvailabilityResponseDto })
  @ApiValidationError()
  @ApiUnauthorizedError()
  @Get()
  forDay(@Query() query: AvailabilityQueryDto) {
    return this.availability.forDay(query);
  }

  /** 200 · 400 · 401 · 404. Weekly calendar of one room (Monday to Sunday of the week containing `date`). */
  @ApiOperation({
    summary: 'Calendario semanal de una sala',
    description:
      'Siete días, de lunes a domingo, de la semana que contiene `date`, en la zona horaria de la sala. Sirve también para salas desactivadas, para ver su historial.',
  })
  @ApiOkResponse({ type: WeekResponseDto })
  @ApiValidationError()
  @ApiUnauthorizedError()
  @ApiRoomNotFoundError()
  @Get('week')
  forWeek(@Query() query: WeekQueryDto) {
    return this.availability.forWeek(query);
  }
}
