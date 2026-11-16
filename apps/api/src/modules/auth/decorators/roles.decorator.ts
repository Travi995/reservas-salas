import { SetMetadata } from '@nestjs/common';
import type { Role } from '../../users/enums/role.enum.js';

export const ROLES_KEY = 'roles';

/** Restringe una ruta a ciertos roles: `@Roles(Role.Admin)`. Sin decorador = cualquier usuario autenticado. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
