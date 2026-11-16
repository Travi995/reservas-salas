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
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { parseUuid } from '../../common/pipes/parse-uuid.pipe.js';
import {
  ApiError,
  ApiForbiddenError,
  ApiRoomNotFoundError,
  ApiUnauthorizedError,
  ApiValidationError,
} from '../../common/swagger/api-error.docs.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import type { AuthUser } from '../auth/interfaces/auth-user.interface.js';
import { Role } from '../users/enums/role.enum.js';
import { CreateRecurringReservationDto } from './dtos/create-recurring-reservation.dto.js';
import { CreateReservationDto } from './dtos/create-reservation.dto.js';
import { ListReservationsQueryDto } from './dtos/list-reservations-query.dto.js';
import { MyReservationsQueryDto } from './dtos/my-reservations-query.dto.js';
import {
  AdminReservationsPageDto,
  MyReservationsPageDto,
  RecurringReservationResponseDto,
  ReservationResponseDto,
} from './dtos/reservation-response.dto.js';
import { ReservationsService } from './reservations.service.js';

/** Business rules that answer 422, shared by both create endpoints. */
const BUSINESS_RULES = [
  {
    code: 'END_BEFORE_START',
    message: 'La hora de fin tiene que ser posterior a la de inicio.',
  },
  { code: 'IN_THE_PAST', message: 'No se puede reservar en el pasado.' },
  {
    code: 'DURATION_OUT_OF_RANGE',
    message: 'La reserva debe durar entre 15 minutos y 4 horas.',
  },
  {
    code: 'ROOM_INACTIVE',
    message: 'La sala está desactivada y no acepta reservas nuevas.',
  },
];

@ApiTags('reservations')
@ApiBearerAuth()
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservations: ReservationsService) {}

  /** 201 · 400 · 401 · 404 room · 409 overlap · 422 business rule. */
  @ApiOperation({
    summary: 'Crear una reserva',
    description:
      'Reserva una sala para el usuario autenticado. `date`, `startTime` y `endTime` son la **hora local de la sala**.\n\nReglas (también para admin): fin posterior al inicio, no en el pasado, duración de 15 min a 4 h, la sala activa y sin solapes. Una reserva no puede cruzar la medianoche. `10:00–11:00` y `11:00–12:00` **no** se solapan.\n\n**Concurrencia:** si dos personas piden el mismo hueco a la vez, exactamente una recibe `201` y la otra `409 ROOM_OVERLAP` con la franja que choca; nunca un `500`. Lo garantiza la base de datos (restricción `EXCLUDE`) más un bloqueo por sala.',
  })
  @ApiCreatedResponse({ type: ReservationResponseDto })
  @ApiValidationError()
  @ApiUnauthorizedError()
  @ApiRoomNotFoundError()
  @ApiError(409, 'La sala ya está ocupada en parte de ese horario.', {
    code: 'ROOM_OVERLAP',
    message: 'La sala ya está reservada de 10:00 a 11:00.',
  })
  @ApiError(
    422,
    'Rompe una regla de negocio (el código dice cuál).',
    ...BUSINESS_RULES,
  )
  @Post()
  create(@Body() dto: CreateReservationDto, @CurrentUser() user: AuthUser) {
    return this.reservations.create(dto, user);
  }

  /** 201 · 400 · 401 · 404 room · 409 any date clashes (nothing is created) · 422 business rule. */
  @ApiOperation({
    summary: 'Crear una serie semanal',
    description:
      'Mismo cuerpo que `POST /reservations` más `weeks` (2 a 12). `date` es la primera ocurrencia y se repite el mismo día de la semana y a la misma hora de la sala (también si hay cambio de horario de verano).\n\n**Todo o nada:** se valida la serie entera en una sola transacción. Si alguna fecha choca o rompe una regla, **no se crea ninguna**, y el `409` indica qué fechas y con qué franja.',
  })
  @ApiCreatedResponse({ type: RecurringReservationResponseDto })
  @ApiValidationError()
  @ApiUnauthorizedError()
  @ApiRoomNotFoundError()
  @ApiError(409, 'Al menos una fecha choca; no se creó ninguna.', {
    code: 'ROOM_OVERLAP',
    message:
      'No se creó ninguna reserva. La sala ya está ocupada el 27/11/2026 de 10:00 a 11:00.',
  })
  @ApiError(
    422,
    'Alguna ocurrencia rompe una regla de negocio.',
    ...BUSINESS_RULES,
  )
  @Post('recurring')
  createRecurring(
    @Body() dto: CreateRecurringReservationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.reservations.createRecurring(dto, user);
  }

  /** 200 · 400 · 401 · 403. Admin only: every reservation, paginated, searchable and filterable. */
  @ApiOperation({
    summary: 'Listar todas las reservas (admin)',
    description:
      'Solo `admin`. Paginado en el servidor, con búsqueda y filtros combinables.\n\n- `search`: sin distinguir mayúsculas ni tildes, sobre título, sala, nombre y email de quien reservó («reunion» encuentra «Reunión»).\n- `scope`: `upcoming` = aún no terminó; `past` = ya terminó. Se decide solo por fecha, sea cual sea el estado, así que «canceladas + próximas» funciona.\n- Orden estable, con desempate por `id`.',
  })
  @ApiOkResponse({ type: AdminReservationsPageDto })
  @ApiValidationError()
  @ApiUnauthorizedError()
  @ApiForbiddenError('Solo un admin puede ver todas las reservas.')
  @Roles(Role.Admin)
  @Get()
  list(@Query() query: ListReservationsQueryDto) {
    return this.reservations.findAll(query);
  }

  /** 200 · 400 · 401. One page of upcoming (soonest first) or past (most recent first). */
  @ApiOperation({
    summary: 'Mis reservas',
    description:
      'Las del usuario autenticado, separadas en `upcoming` (más próxima primero) y `past` (más reciente primero).\n\n«Próximas» incluye las reservas en curso y las canceladas que aún no han pasado (con `status: cancelled`). `meta.activeItems` cuenta solo las activas, para el contador de la pestaña.',
  })
  @ApiOkResponse({ type: MyReservationsPageDto })
  @ApiValidationError()
  @ApiUnauthorizedError()
  @Get('me')
  mine(@Query() query: MyReservationsQueryDto, @CurrentUser() user: AuthUser) {
    return this.reservations.findMine(user.id, query);
  }

  /** 200 · 400 · 401 · 403 not yours · 404 · 409 already cancelled · 422 already started. A state change, not a delete. */
  @ApiOperation({
    summary: 'Cancelar una reserva',
    description:
      "La cancela el dueño, o cualquier `admin`. Solo si **aún no empezó** (también para el admin). Es un cambio de estado, no un borrado: el historial se conserva, junto con quién la canceló (`cancelledBy`), y el hueco queda libre al instante.\n\nDos cancelaciones simultáneas se resuelven con un `UPDATE ... WHERE status = 'active'`: una gana y la otra recibe `409 ALREADY_CANCELLED`.",
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Id de la reserva' })
  @ApiOkResponse({
    type: ReservationResponseDto,
    description: 'La reserva, ya con `status: cancelled`.',
  })
  @ApiValidationError()
  @ApiUnauthorizedError()
  @ApiError(403, 'La reserva es de otra persona y no eres admin.', {
    code: 'FORBIDDEN',
    message: 'Solo puedes cancelar tus propias reservas.',
  })
  @ApiError(404, 'La reserva no existe.', {
    code: 'RESERVATION_NOT_FOUND',
    message: 'La reserva no existe.',
  })
  @ApiError(409, 'Ya estaba cancelada.', {
    code: 'ALREADY_CANCELLED',
    message: 'La reserva ya estaba cancelada.',
  })
  @ApiError(422, 'La reserva ya empezó.', {
    code: 'ALREADY_STARTED',
    message: 'No se puede cancelar una reserva que ya empezó.',
  })
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(@Param('id', parseUuid()) id: string, @CurrentUser() user: AuthUser) {
    return this.reservations.cancel(id, user);
  }
}
