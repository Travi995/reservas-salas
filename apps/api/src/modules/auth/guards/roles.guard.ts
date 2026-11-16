import {
  HttpStatus,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppException } from '../../../common/exceptions/app.exception.js';
import type { Role } from '../../users/enums/role.enum.js';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import type { AuthUser } from '../interfaces/auth-user.interface.js';

/** Guard global que se ejecuta después del AuthGuard: comprueba @Roles(). 403 si el rol no alcanza. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(
      ROLES_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );
    if (!roles?.length) return true;
    const user = ctx.switchToHttp().getRequest<{ user?: AuthUser }>().user;
    if (user && roles.includes(user.role)) return true;
    throw new AppException(
      HttpStatus.FORBIDDEN,
      'FORBIDDEN',
      'No tienes permiso para hacer esto.',
    );
  }
}
