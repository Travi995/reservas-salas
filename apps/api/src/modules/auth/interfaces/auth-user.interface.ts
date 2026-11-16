import type { Role } from '../../users/enums/role.enum.js';

/** Authenticated user that the AuthGuard puts on `request.user`. */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}
