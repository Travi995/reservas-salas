import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsInt, Min } from 'class-validator';
import { IsUndefinable } from '../../../common/decorators/is-undefinable.decorator.js';
import { CreateRoomDto } from './create-room.dto.js';

/**
 * Partial update. Deactivating is `{ "isActive": false }`.
 * Fields may be omitted but not sent as `null` (`skipNullProperties: false`).
 */
export class UpdateRoomDto extends PartialType(CreateRoomDto, {
  skipNullProperties: false,
}) {
  @ApiPropertyOptional({
    example: false,
    description:
      '`false` desactiva la sala (no acepta reservas nuevas); `true` la reactiva',
  })
  @IsUndefinable()
  @IsBoolean({ message: 'isActive debe ser true o false.' })
  isActive?: boolean;

  /**
   * Optimistic lock: the `version` the client read. If the room changed since then the update
   * is rejected with 409 ROOM_MODIFIED instead of silently overwriting someone else's change.
   */
  @ApiPropertyOptional({
    example: 3,
    description:
      '`version` que leyó el cliente; si la sala cambió desde entonces, `409 ROOM_MODIFIED`',
  })
  @IsUndefinable()
  @IsInt({ message: 'version debe ser un número entero.' })
  @Min(1, { message: 'version debe ser al menos 1.' })
  version?: number;
}
