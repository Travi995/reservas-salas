import { HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hash, verify } from 'argon2';
import { AppException } from '../../common/exceptions/app.exception.js';
import type { User } from '../users/entities/user.entity.js';
import { Role } from '../users/enums/role.enum.js';
import { UsersService } from '../users/users.service.js';
import type { LoginDto } from './dtos/login.dto.js';
import type { RegisterDto } from './dtos/register.dto.js';
import type { AuthResponse } from './interfaces/auth-response.interface.js';
import type { AuthUser } from './interfaces/auth-user.interface.js';
import type { JwtPayload } from './interfaces/jwt-payload.interface.js';

@Injectable()
export class AuthService {
  /** Dummy hash: if the email does not exist we still verify against it, so timing does not reveal which emails exist. */
  private readonly dummyHash = hash('timing-attack-dummy');

  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  /** Public registration always creates a `member`: the role never comes from the body (ADR-0005). */
  async register(dto: RegisterDto): Promise<AuthResponse> {
    const user = await this.users.create({
      name: dto.name,
      email: dto.email,
      passwordHash: await hash(dto.password),
      role: Role.Member,
    });
    return this.issue(user);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.users.findByEmailWithPassword(dto.email);
    const valid = await verify(
      user?.passwordHash ?? (await this.dummyHash),
      dto.password,
    );
    if (!user || !valid) {
      // Same message for unknown email and wrong password.
      throw new AppException(
        HttpStatus.UNAUTHORIZED,
        'INVALID_CREDENTIALS',
        'Email o contraseña incorrectos.',
      );
    }
    return this.issue(user);
  }

  private async issue(user: User): Promise<AuthResponse> {
    const payload: JwtPayload = { sub: user.id, role: user.role };
    return {
      accessToken: await this.jwt.signAsync(payload),
      user: toAuthUser(user),
    };
  }
}

export function toAuthUser(user: User): AuthUser {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}
