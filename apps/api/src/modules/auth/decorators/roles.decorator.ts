import { SetMetadata } from '@nestjs/common';
import type { Role } from '../../users/enums/role.enum.js';

export const ROLES_KEY = 'roles';

/** Restricts a route to certain roles: `@Roles(Role.Admin)`. No decorator = any authenticated user. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
