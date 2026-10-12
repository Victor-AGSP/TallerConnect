import { Text } from 'react-native';

import {
  renderRouterWithProviders,
  resetStores,
  screen,
  waitFor,
} from '../test-utils';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { mockUserByRole } from '@/mocks/users.mock';
import type { UserRole } from '@/constants/roles';

/**
 * Restricciones de acceso por rol sobre los dos componentes de guarda que
 * expone la aplicación: `ProtectedRoute` (API con `allowedRole`) y
 * `RoleGuard` (API con `role`).
 *
 * Complementa a `protected-routes.test.tsx`, que cubre las mismas reglas a
 * través de los layouts de cada grupo de rutas. Aquí se verifica que el
 * contenido protegido nunca se renderice para un rol no autorizado y que una
 * sesión incompleta se trate como no autenticada.
 *
 * Estas guardas son controles de interfaz: la autorización efectiva la aplica
 * el backend, cuyo rechazo (401/403) se verifica en `interceptors.test.ts`.
 */

const CONTENT_BY_ROLE = {
  administrador: 'Contenido solo para administración',
  mecanico: 'Contenido solo para mecánicos',
  cliente: 'Contenido solo para clientes',
} as const;

const PATH_BY_ROLE = {
  administrador: '/administrador',
  mecanico: '/mecanico',
  cliente: '/cliente',
} as const;

/** Rutas protegidas con `ProtectedRoute` (API `allowedRole`). */
const protectedRouteRoutes = {
  '(auth)/login': () => <Text>Iniciar sesión</Text>,
  '(admin)/administrador': () => (
    <ProtectedRoute allowedRole="administrador">
      <Text>{CONTENT_BY_ROLE.administrador}</Text>
    </ProtectedRoute>
  ),
  '(mecanico)/mecanico': () => (
    <ProtectedRoute allowedRole="mecanico">
      <Text>{CONTENT_BY_ROLE.mecanico}</Text>
    </ProtectedRoute>
  ),
  '(cliente)/cliente': () => (
    <ProtectedRoute allowedRole="cliente">
      <Text>{CONTENT_BY_ROLE.cliente}</Text>
    </ProtectedRoute>
  ),
};

/** Rutas protegidas con `RoleGuard` (API `role`). */
const roleGuardRoutes = {
  '(auth)/login': () => <Text>Iniciar sesión</Text>,
  '(admin)/administrador': () => (
    <RoleGuard role="administrador">
      <Text>{CONTENT_BY_ROLE.administrador}</Text>
    </RoleGuard>
  ),
  '(cliente)/cliente': () => (
    <RoleGuard role="cliente">
      <Text>{CONTENT_BY_ROLE.cliente}</Text>
    </RoleGuard>
  ),
};

function sessionForRole(role: UserRole) {
  return {
    user: mockUserByRole[role],
    token: 'token-de-prueba',
    role,
    isAuthenticated: true,
    isLoading: false,
    isHydrated: true,
  };
}

beforeEach(() => resetStores());

describe('ProtectedRoute: acceso autorizado', () => {
  it.each(['administrador', 'mecanico', 'cliente'] as const)(
    'permite al rol %s ver el contenido de su propia ruta',
    async (role) => {
      const router = renderRouterWithProviders(protectedRouteRoutes, {
        initialUrl: PATH_BY_ROLE[role],
        initialAuthState: sessionForRole(role),
      });
      await router;

      await waitFor(() =>
        expect(router.getPathname()).toBe(PATH_BY_ROLE[role]),
      );
      expect(screen.getByText(CONTENT_BY_ROLE[role])).toBeTruthy();
    },
  );
});

describe('ProtectedRoute: acceso restringido', () => {
  it.each([
    ['cliente', '/administrador', 'administrador'],
    ['cliente', '/mecanico', 'mecanico'],
    ['mecanico', '/administrador', 'administrador'],
    ['mecanico', '/cliente', 'cliente'],
    ['administrador', '/mecanico', 'mecanico'],
    ['administrador', '/cliente', 'cliente'],
  ] as const)(
    'impide que el rol %s abra %s y no renderiza su contenido',
    async (role, requestedPath, restrictedRole) => {
      const router = renderRouterWithProviders(protectedRouteRoutes, {
        initialUrl: requestedPath,
        initialAuthState: sessionForRole(role),
      });
      await router;

      await waitFor(() => expect(router.getPathname()).toBe(PATH_BY_ROLE[role]));

      // El contenido reservado al otro rol nunca llega a renderizarse.
      expect(screen.queryByText(CONTENT_BY_ROLE[restrictedRole])).toBeNull();
      expect(screen.getByText(CONTENT_BY_ROLE[role])).toBeTruthy();
    },
  );

  it.each(['/administrador', '/mecanico', '/cliente'] as const)(
    'envía al login al entrar a %s sin una sesión autenticada',
    async (requestedPath) => {
      const router = renderRouterWithProviders(protectedRouteRoutes, {
        initialUrl: requestedPath,
        initialAuthState: {
          isAuthenticated: false,
          isLoading: false,
          isHydrated: true,
        },
      });
      await router;

      await waitFor(() => expect(router.getPathname()).toBe('/login'));
      expect(screen.getByText('Iniciar sesión')).toBeTruthy();
    },
  );
});

describe('RoleGuard: sesiones incompletas', () => {
  it('trata como no autenticada una sesión marcada como activa pero sin usuario', async () => {
    const router = renderRouterWithProviders(roleGuardRoutes, {
      initialUrl: '/administrador',
      initialAuthState: {
        user: null,
        token: 'token-de-prueba',
        role: 'administrador',
        isAuthenticated: true,
        isLoading: false,
        isHydrated: true,
      },
    });
    await router;

    await waitFor(() => expect(router.getPathname()).toBe('/login'));
    expect(screen.queryByText(CONTENT_BY_ROLE.administrador)).toBeNull();
  });

  it('no expone el contenido protegido mientras la sesión sigue cargando', async () => {
    const router = renderRouterWithProviders(roleGuardRoutes, {
      initialUrl: '/administrador',
      initialAuthState: {
        isLoading: true,
        isHydrated: false,
      },
    });
    await router;

    expect(screen.getByText('Cargando...')).toBeTruthy();
    expect(screen.queryByText(CONTENT_BY_ROLE.administrador)).toBeNull();
  });

  it('aplica la misma restricción por rol que ProtectedRoute', async () => {
    const router = renderRouterWithProviders(roleGuardRoutes, {
      initialUrl: '/administrador',
      initialAuthState: sessionForRole('cliente'),
    });
    await router;

    await waitFor(() => expect(router.getPathname()).toBe('/cliente'));
    expect(screen.queryByText(CONTENT_BY_ROLE.administrador)).toBeNull();
    expect(screen.getByText(CONTENT_BY_ROLE.cliente)).toBeTruthy();
  });
});
