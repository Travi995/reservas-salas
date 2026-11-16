import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import {
  ApiError,
  ApiUnauthorizedError,
  ApiValidationError,
} from '../../common/swagger/api-error.docs.js';
import { AuthService } from './auth.service.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { Public } from './decorators/public.decorator.js';
import { AuthResponseDto, AuthUserDto } from './dtos/auth-response.dto.js';
import { LoginDto } from './dtos/login.dto.js';
import { RegisterDto } from './dtos/register.dto.js';
import type { AuthUser } from './interfaces/auth-user.interface.js';

const TOO_MANY = {
  code: 'TOO_MANY_REQUESTS',
  message: 'Demasiadas peticiones. Inténtalo más tarde.',
};

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** 201 · 400 validation · 409 email already registered · 429 too many attempts. */
  @ApiOperation({
    summary: 'Registrarse',
    description:
      'Crea una cuenta con rol **`member`** (el registro público nunca crea admins) y devuelve ya el token, así que no hace falta iniciar sesión después. La contraseña se guarda con hash argon2id. El email es único y se guarda en minúsculas.\n\nLimitado por IP: 10 intentos por minuto entre login y registro (configurable con `AUTH_RATE_LIMIT`).',
  })
  @ApiCreatedResponse({ type: AuthResponseDto, description: 'Cuenta creada.' })
  @ApiValidationError()
  @ApiError(409, 'Ya existe una cuenta con ese email.', {
    code: 'EMAIL_TAKEN',
    message: 'Ya existe una cuenta con ese email.',
  })
  @ApiError(429, 'Demasiados intentos desde la misma IP.', TOO_MANY)
  @Public()
  @UseGuards(ThrottlerGuard)
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  /** 200 · 400 validation · 401 invalid credentials · 429 too many attempts. Creates no resource, hence 200 and not 201. */
  @ApiOperation({
    summary: 'Iniciar sesión',
    description:
      'Devuelve un JWT. Úsalo como `Authorization: Bearer <accessToken>` (en esta página, con el botón **Authorize**).\n\nResponde `200` y no `201` porque no crea ningún recurso. El error es el mismo —y tarda lo mismo— si el email no existe o la contraseña es incorrecta, para no revelar qué cuentas existen.\n\nUsuarios de prueba: `admin@demo.com` / `Admin1234!` y `member@demo.com` / `Member1234!`.',
  })
  @ApiOkResponse({ type: AuthResponseDto, description: 'Sesión iniciada.' })
  @ApiValidationError()
  @ApiError(401, 'Email o contraseña incorrectos.', {
    code: 'INVALID_CREDENTIALS',
    message: 'Email o contraseña incorrectos.',
  })
  @ApiError(429, 'Demasiados intentos desde la misma IP.', TOO_MANY)
  @Public()
  @UseGuards(ThrottlerGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  /** 200 · 401 missing or invalid token. */
  @ApiOperation({
    summary: 'Usuario autenticado',
    description:
      'Devuelve quién es el dueño del token. El usuario se recarga de la base de datos en cada petición: si cambió su rol o fue eliminado, el token deja de valer.',
  })
  @ApiOkResponse({ type: AuthUserDto })
  @ApiUnauthorizedError()
  @ApiBearerAuth()
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return user;
  }
}
