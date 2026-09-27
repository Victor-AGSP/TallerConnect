import { UserRole } from '@/constants/roles';

/**
 * Rutas principales asociadas a cada rol.
 *
 * Estas rutas representan las pantallas iniciales
 * que puede utilizar cada tipo de usuario.
 */
export const ROLE_ROUTES = {
  cliente: '/cliente',
  mecanico: '/mecanico',
  administrador: '/administrador',
} as const;

/**
 * Obtiene la ruta inicial correspondiente
 * al rol del usuario autenticado.
 */
export function getRouteByRole(
  role: UserRole
) {
  return ROLE_ROUTES[role];
}