import type { Role } from '../../users/enums/role.enum.js';

/** Contenido del JWT. `sub` = id del usuario. */
export interface JwtPayload {
  sub: string;
  role: Role;
}
