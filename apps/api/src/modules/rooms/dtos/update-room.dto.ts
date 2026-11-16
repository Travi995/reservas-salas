import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateRoomDto } from './create-room.dto.js';

/** Partial update. Deactivating is `{ "isActive": false }`. */
export class UpdateRoomDto extends PartialType(CreateRoomDto) {
  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean({ message: 'isActive debe ser true o false.' })
  isActive?: boolean;
}
