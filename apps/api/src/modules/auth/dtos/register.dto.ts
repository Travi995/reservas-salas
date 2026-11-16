import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class RegisterDto {
  @ApiProperty({ example: 'Ana Pérez', maxLength: 80 })
  @Transform(trim)
  @IsString({ message: 'El nombre debe ser texto.' })
  @IsNotEmpty({ message: 'Indica tu nombre.' })
  @MaxLength(80, { message: 'El nombre admite como máximo 80 caracteres.' })
  name: string;

  @ApiProperty({ example: 'ana@empresa.com' })
  @Transform(trim)
  @IsEmail({}, { message: 'Introduce un email válido.' })
  @MaxLength(254, { message: 'El email es demasiado largo.' })
  email: string;

  @ApiProperty({ example: 'unaClaveSegura', minLength: 8, maxLength: 128 })
  @IsString({ message: 'La contraseña debe ser texto.' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  @MaxLength(128, {
    message: 'La contraseña admite como máximo 128 caracteres.',
  })
  password: string;
}
