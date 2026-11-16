import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
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
import { CreateRoomDto } from './dtos/create-room.dto.js';
import { ListRoomsQueryDto } from './dtos/list-rooms-query.dto.js';
import { RoomResponseDto } from './dtos/room-response.dto.js';
import { UpdateRoomDto } from './dtos/update-room.dto.js';
import { RoomsService } from './rooms.service.js';

const NAME_TAKEN = {
  code: 'ROOM_NAME_TAKEN',
  message: 'Ya existe una sala con ese nombre.',
  details: [{ field: 'name', message: 'Ya existe una sala con ese nombre.' }],
};

@ApiTags('rooms')
@ApiBearerAuth()
@Controller('rooms')
export class RoomsController {
  constructor(private readonly rooms: RoomsService) {}

  /** 200 · 401. Members only ever see active rooms. */
  @ApiOperation({
    summary: 'Listar salas',
    description:
      'Ordenadas por nombre. **No está paginado**: el número de salas es pequeño y las pantallas las necesitan todas.\n\nLos `member` solo ven salas activas. `includeInactive=true` solo tiene efecto para `admin`.',
  })
  @ApiOkResponse({ type: [RoomResponseDto] })
  @ApiUnauthorizedError()
  @Get()
  list(@Query() query: ListRoomsQueryDto, @CurrentUser() user: AuthUser) {
    return this.rooms.list(
      user.role === Role.Admin && query.includeInactive === true,
    );
  }

  /** 201 · 400 · 401 · 403. */
  @ApiOperation({
    summary: 'Crear una sala',
    description:
      'Solo `admin`. El nombre es único. Si no se indica `timezone`, se usa `America/Argentina/Buenos_Aires`. La sala nace activa.',
  })
  @ApiCreatedResponse({ type: RoomResponseDto })
  @ApiValidationError()
  @ApiUnauthorizedError()
  @ApiForbiddenError('Solo un admin puede crear salas.')
  @ApiError(409, 'Ya existe otra sala con ese nombre.', NAME_TAKEN)
  @Roles(Role.Admin)
  @Post()
  create(@Body() dto: CreateRoomDto) {
    return this.rooms.create(dto);
  }

  /** 200 · 400 · 401 · 403 · 404. */
  @ApiOperation({
    summary: 'Editar, desactivar o reactivar una sala',
    description:
      'Solo `admin`. Actualización parcial: envía únicamente lo que cambia (un campo puede omitirse, pero no enviarse como `null`).\n\n- **Desactivar:** `{ "isActive": false }`. La sala deja de aceptar reservas nuevas; las existentes —pasadas y futuras— se conservan y se pueden cancelar una a una.\n- **Edición concurrente:** envía la `version` que leíste. Si otra persona cambió la sala entretanto, responde `409 ROOM_MODIFIED` en vez de pisar su cambio.\n- **Zona horaria:** no se puede cambiar si la sala tiene reservas pendientes (`422`), porque se guardan en UTC y su hora local se movería.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Id de la sala' })
  @ApiOkResponse({ type: RoomResponseDto })
  @ApiValidationError()
  @ApiUnauthorizedError()
  @ApiForbiddenError('Solo un admin puede editar salas.')
  @ApiRoomNotFoundError()
  @ApiError(
    409,
    'La sala cambió mientras se editaba, o el nombre ya existe.',
    {
      code: 'ROOM_MODIFIED',
      message:
        'Otra persona modificó esta sala mientras la editabas. Revisa los datos actuales y vuelve a guardar.',
    },
    NAME_TAKEN,
  )
  @ApiError(422, 'Cambiar la zona horaria rompería reservas pendientes.', {
    code: 'ROOM_HAS_RESERVATIONS',
    message:
      'No se puede cambiar la zona horaria: la sala tiene 2 reservas pendientes y su hora cambiaría. Cancélalas antes o crea una sala nueva.',
    details: [
      {
        field: 'timezone',
        message: 'La sala tiene reservas pendientes: su hora cambiaría.',
      },
    ],
  })
  @Roles(Role.Admin)
  @Patch(':id')
  update(@Param('id', parseUuid()) id: string, @Body() dto: UpdateRoomDto) {
    return this.rooms.update(id, dto);
  }
}
