import type { Role } from '../../users/enums/role.enum.js';

/** JWT payload. `sub` = user id. */
export interface JwtPayload {
  sub: string;
  role: Role;
}
