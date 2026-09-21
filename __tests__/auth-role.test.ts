import { resetStores } from '../test-utils';
import { mockUserByRole } from '@/mocks/users.mock';
import { useAuthStore } from '@/stores/authStore';
import { getAuthRouteForRole } from '@/utils/auth-routing';

describe('identificación del rol autenticado', () => {
  beforeEach(() => resetStores());

  it.each([
    ['administrador', '/administrador'],
    ['mecanico', '/mecanico'],
    ['cliente', '/cliente'],
  ] as const)('dirige al rol %s a su inicio', (role, route) => {
    useAuthStore.getState().setAuth(mockUserByRole[role], 'token');

    const authenticatedRole = useAuthStore.getState().role;

    expect(authenticatedRole).toBe(role);
    expect(getAuthRouteForRole(authenticatedRole)).toBe(route);
  });

  it('envía a login cuando no hay un rol autenticado', () => {
    expect(getAuthRouteForRole(null)).toBe('/login');
  });
});
