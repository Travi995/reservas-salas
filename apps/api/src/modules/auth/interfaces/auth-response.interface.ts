import type { AuthUser } from './auth-user.interface.js';

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}
