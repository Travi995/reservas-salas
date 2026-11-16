import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../users/enums/role.enum.js';

export class AuthUserDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Ana Pérez' })
  name: string;

  @ApiProperty({ example: 'ana@empresa.com' })
  email: string;

  @ApiProperty({ enum: Role, example: Role.Member })
  role: Role;
}

export class AuthResponseDto {
  @ApiProperty({
    description:
      'JWT para la cabecera `Authorization: Bearer <token>`. Caduca según `JWT_EXPIRES_IN` (8 h por defecto).',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({ type: AuthUserDto })
  user: AuthUserDto;
}
