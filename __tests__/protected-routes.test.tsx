import { Text } from 'react-native';

import {
  act,
  renderRouterWithProviders,
  resetStores,
  screen,
  waitFor,
} from '../test-utils';
import AdminLayout from '@/app/(admin)/_layout';
import ClienteLayout from '@/app/(cliente)/_layout';
import AuthLayout from '@/app/(auth)/_layout';
import MecanicoLayout from '@/app/(mecanico)/_layout';
import { mockUserByRole } from '@/mocks/users.mock';
import { useAuthStore } from '@/stores/authStore';

const routes = {
  '(auth)/_layout': AuthLayout,
  '(auth)/login': () => <Text>Iniciar sesión</Text>,
  '(admin)/_layout': AdminLayout,
  '(admin)/administrador': () => <Text>Panel administrador</Text>,
  '(cliente)/_layout': ClienteLayout,
  '(cliente)/cliente': () => <Text>Portal cliente</Text>,
  '(mecanico)/_layout': MecanicoLayout,
  '(mecanico)/mecanico': () => <Text>Órdenes del mecánico</Text>,
};

const routeByRole = {
  administrador: {
    path: '/administrador',
    content: 'Panel administrador',
  },
  cliente: {
    path: '/cliente',
    content: 'Portal cliente',
  },
  mecanico: {
    path: '/mecanico',
    content: 'Órdenes del mecánico',
  },
} as const;

function sessionForRole(role: keyof typeof routeByRole) {
  return {
    user: mockUserByRole[role],
    token: 'token-de-prueba',
    role,
    isAuthenticated: true,
    isLoading: false,
    isHydrated: true,
  };
}

describe('rutas protegidas por sesión y rol', () => {
  beforeEach(() => resetStores());

  it.each([
    '/administrador',
    '/cliente',
    '/mecanico',
  ] as const)(
    'redirige de %s al login si no hay una sesión autenticada',
    async (initialUrl) => {
      const router = renderRouterWithProviders(routes, {
        initialUrl,
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

  it.each(Object.entries(routeByRole))(
    'permite que el rol %s acceda a su ruta',
    async (role, destination) => {
      const router = renderRouterWithProviders(routes, {
        initialUrl: destination.path,
        initialAuthState: sessionForRole(role as keyof typeof routeByRole),
      });
      await router;

      await waitFor(() => expect(router.getPathname()).toBe(destination.path));
      expect(screen.getByText(destination.content)).toBeTruthy();
    },
  );

  it.each([
    ['cliente', '/administrador', '/cliente'],
    ['cliente', '/mecanico', '/cliente'],
    ['mecanico', '/administrador', '/mecanico'],
    ['mecanico', '/cliente', '/mecanico'],
    ['administrador', '/cliente', '/administrador'],
    ['administrador', '/mecanico', '/administrador'],
  ] as const)(
    'redirige al rol %s a su propia ruta al intentar entrar a %s',
    async (role, requestedPath, expectedPath) => {
      const router = renderRouterWithProviders(routes, {
        initialUrl: requestedPath,
        initialAuthState: sessionForRole(role),
      });
      await router;

      await waitFor(() => expect(router.getPathname()).toBe(expectedPath));
      expect(screen.getByText(routeByRole[role].content)).toBeTruthy();
    },
  );

  it.each([
    ['cliente', 'mecanico'],
    ['mecanico', 'administrador'],
    ['administrador', 'cliente'],
  ] as const)(
    'revalida la ruta abierta cuando la sesión cambia de %s a %s',
    async (initialRole, updatedRole) => {
      const initialDestination = routeByRole[initialRole];
      const updatedDestination = routeByRole[updatedRole];
      const router = renderRouterWithProviders(routes, {
        initialUrl: initialDestination.path,
        initialAuthState: sessionForRole(initialRole),
      });
      await router;

      expect(screen.getByText(initialDestination.content)).toBeTruthy();

      await act(async () => {
        useAuthStore.setState(sessionForRole(updatedRole));
      });

      await waitFor(() =>
        expect(router.getPathname()).toBe(updatedDestination.path),
      );
      expect(screen.getByText(updatedDestination.content)).toBeTruthy();
      expect(screen.queryByText(initialDestination.content)).toBeNull();
    },
  );

  it('espera a que termine la recuperación de sesión antes de decidir la ruta', async () => {
    const router = renderRouterWithProviders(routes, {
      initialUrl: '/administrador',
      initialAuthState: { isLoading: true, isHydrated: false },
    });
    await router;

    expect(screen.getByText('Cargando...')).toBeTruthy();

    await act(async () => {
      useAuthStore.setState(sessionForRole('administrador'));
    });

    await waitFor(() => expect(router.getPathname()).toBe('/administrador'));
    expect(screen.getByText('Panel administrador')).toBeTruthy();
  });
});
