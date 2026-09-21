import { User } from './user.model';

/**
 * Representa la sesión de autenticación activa del usuario en la app,
 * incluyendo el token de acceso y el estado de autenticación.
 */

export interface AuthSession {
  user: User | null;
  token: string | null;
  refreshToken?: string | null;
  isAuthenticated: boolean;
}

/** Credenciales enviadas al iniciar sesión. */
export interface LoginCredentials {
  email: string;
  password: string;
}

/** Respuesta del backend al autenticar correctamente al usuario. */
export interface AuthResponse {
  user: User;
  token: string;
  refreshToken?: string;
}
