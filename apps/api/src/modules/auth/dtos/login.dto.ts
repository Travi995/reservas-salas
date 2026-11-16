import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { trim } from '../../../common/transforms/trim.transform.js';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@demo.com' })
  @Transform(trim)
  @IsEmail({}, { message: 'Introduce un email válido.' })
  email: string;

  @ApiProperty({ example: 'Admin1234!' })
  @IsString({ message: 'La contraseña debe ser texto.' })
  @IsNotEmpty({ message: 'Indica tu contraseña.' })
  password: string;
}
