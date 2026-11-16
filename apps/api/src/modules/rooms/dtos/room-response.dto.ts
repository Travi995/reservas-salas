import { ApiProperty } from '@nestjs/swagger';

/** Documentation of a room as the API returns it (the entity is not decorated for Swagger). */
export class RoomResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: '5f0c1c0e-7a52-4b53-8a49-3d9a1d2b7c10',
  })
  id: string;

  @ApiProperty({ example: 'Sala Andes' })
  name: string;

  @ApiProperty({ example: 8, description: 'Personas que caben' })
  capacity: number;

  @ApiProperty({ example: 'Oficina Centro, planta 2' })
  location: string;

  @ApiProperty({
    example: 'America/Argentina/Buenos_Aires',
    description:
      'Zona horaria IANA de la oficina. Las horas de las reservas y el «día» de la disponibilidad se calculan en ella.',
  })
  timezone: string;

  @ApiProperty({
    example: true,
    description:
      'Una sala inactiva no acepta reservas nuevas; las existentes se conservan.',
  })
  isActive: boolean;

  @ApiProperty({
    example: 1,
    description:
      'Se incrementa en cada cambio. Envíala en `PATCH /rooms/{id}` para detectar ediciones simultáneas (`409 ROOM_MODIFIED`).',
  })
  version: number;
}
