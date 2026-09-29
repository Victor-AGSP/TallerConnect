import type { UserRole } from '@/constants/roles';

export type AuthenticatedRoute = '/administrador' | '/mecanico' | '/cliente';
export type AuthRoute = AuthenticatedRoute | '/login';

const routesByRole: Record<UserRole, AuthenticatedRoute> = {
  administrador: '/administrador',
  mecanico: '/mecanico',
  cliente: '/cliente',
};

export function getAuthRouteForRole(role: UserRole | null): AuthRoute {
  return role ? routesByRole[role] : '/login';
}
