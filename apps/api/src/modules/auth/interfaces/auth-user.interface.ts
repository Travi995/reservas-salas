import type { Role } from '../../users/enums/role.enum.js';

/** Usuario autenticado que el AuthGuard deja en `request.user`. */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}
