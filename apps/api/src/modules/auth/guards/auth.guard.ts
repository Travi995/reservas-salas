import {
  HttpStatus,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { AppException } from '../../../common/exceptions/app.exception.js';
import { UsersService } from '../../users/users.service.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import type { AuthUser } from '../interfaces/auth-user.interface.js';
import type { JwtPayload } from '../interfaces/jwt-payload.interface.js';

/**
 * Global guard: requires `Authorization: Bearer <jwt>` except on @Public() routes.
 * Loads the user from the DB on every request: if they are deleted or their role changes, the old token does not "remember" it.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly users: UsersService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const token = this.extractBearer(req);
    if (!token)
      throw new AppException(
        HttpStatus.UNAUTHORIZED,
        'UNAUTHORIZED',
        'Necesitas iniciar sesión.',
      );

    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      throw new AppException(
        HttpStatus.UNAUTHORIZED,
        'INVALID_TOKEN',
        'Tu sesión ha caducado o no es válida. Inicia sesión de nuevo.',
      );
    }

    const user = await this.users.findById(payload.sub);
    if (!user) {
      throw new AppException(
        HttpStatus.UNAUTHORIZED,
        'INVALID_TOKEN',
        'Tu sesión ha caducado o no es válida. Inicia sesión de nuevo.',
      );
    }
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
    return true;
  }

  private extractBearer(req: Request): string | null {
    const [scheme, token] = req.headers.authorization?.split(' ') ?? [];
    return scheme === 'Bearer' && token ? token : null;
  }
}
