import { Text } from 'react-native';
import {
  AxiosError,
  AxiosHeaders,
  type AxiosAdapter,
  type InternalAxiosRequestConfig,
} from 'axios';

import {
  act,
  cleanup,
  renderRouterWithProviders,
  resetStores,
  screen,
  waitFor,
} from '../test-utils';
import AdminLayout from '@/app/(admin)/_layout';
import OrdenScreen from '@/app/(admin)/ordenes/[id]';
import AuthLayout from '@/app/(auth)/_layout';
import ClienteLayout from '@/app/(cliente)/_layout';
import MiOrdenScreen from '@/app/(cliente)/mis-ordenes/[id]';
import MecanicoLayout from '@/app/(mecanico)/_layout';
import OrdenAsignadaScreen from '@/app/(mecanico)/ordenes-asignadas/[id]';
import type { UserRole } from '@/constants/roles';
import { mockUserByRole } from '@/mocks/users.mock';
import { apiClient } from '@/services/api/client';
import { useAuthStore } from '@/stores/authStore';
import { STORAGE_KEYS, storage } from '@/utils/storage';

/**
 * Restricciones de acceso por rol sobre las vistas de órdenes.
 *
 * Usa los layouts reales de cada grupo (RoleGuard), las pantallas reales y
 * OrdersService con el cliente HTTP real, sus interceptores y el store de
 * sesión. Solo se sustituye el adaptador de red de Axios, de modo que se
 * verifica tanto la protección visual (redirecciones sin consultar al
 * backend) como la respuesta de la app ante la autorización real del
 * backend (401 cierra la sesión; 403 y 404 se informan sin cerrarla,
 * según el contrato de MS2).
 */

const routes = {
  '(auth)/_layout': AuthLayout,
  '(auth)/login': () => <Text>Iniciar sesión</Text>,
  '(admin)/_layout': AdminLayout,
  '(admin)/administrador': () => <Text>Panel administrador</Text>,
  '(admin)/ordenes/[id]': OrdenScreen,
  '(cliente)/_layout': ClienteLayout,
  '(cliente)/cliente': () => <Text>Portal cliente</Text>,
  '(cliente)/mis-ordenes/[id]': MiOrdenScreen,
  '(mecanico)/_layout': MecanicoLayout,
  '(mecanico)/mecanico': () => <Text>Órdenes del mecánico</Text>,
  '(mecanico)/ordenes-asignadas/[id]': OrdenAsignadaScreen,
};

const ORDER_PATH_BY_ROLE = {
  cliente: '/mis-ordenes/31',
  mecanico: '/ordenes-asignadas/31',
  administrador: '/ordenes/31',
} as const;

const HOME_BY_ROLE = {
  cliente: { path: '/cliente', content: 'Portal cliente' },
  mecanico: { path: '/mecanico', content: 'Órdenes del mecánico' },
  administrador: { path: '/administrador', content: 'Panel administrador' },
} as const;

const CONTRACT_ORDER = {
  orden_id: 31,
  vehiculo_id: 12,
  ingreso_id: 18,
  estado_codigo: 2,
  mecanico_actual_id: 50,
  creado_por_id: 99,
  creado_en: '2026-09-28T10:30:00-03:00',
  actualizado_en: '2026-09-28T11:00:00-03:00',
};

const TOKEN = 'token-de-prueba';

function sessionForRole(role: UserRole) {
  return {
    user: mockUserByRole[role],
    token: TOKEN,
    role,
    isAuthenticated: true,
    isLoading: false,
    isHydrated: true,
  };
}

function ok(config: InternalAxiosRequestConfig, data: unknown) {
  return Promise.resolve({
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  });
}

function httpError(config: InternalAxiosRequestConfig, status: number) {
  const response = {
    data: {},
    status,
    statusText: String(status),
    headers: {},
    config,
  };

  return Promise.reject(
    new AxiosError(
      `Request failed with status code ${status}`,
      AxiosError.ERR_BAD_REQUEST,
      config,
      null,
      response,
    ),
  );
}

const adapter = jest.fn<ReturnType<AxiosAdapter>, Parameters<AxiosAdapter>>();
const originalAdapter = apiClient.defaults.adapter;

beforeEach(() => {
  adapter.mockReset();
  apiClient.defaults.adapter = adapter;
  resetStores();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  // Token persistido por el login, que el interceptor adjunta a cada petición.
  jest
    .spyOn(storage, 'get')
    .mockImplementation(async (key) =>
      key === STORAGE_KEYS.AUTH_TOKEN ? TOKEN : null,
    );
});

afterEach(() => {
  cleanup();
  apiClient.defaults.adapter = originalAdapter;
  jest.restoreAllMocks();
});

describe('vistas de órdenes: acceso autorizado', () => {
  it.each(['cliente', 'mecanico', 'administrador'] as const)(
    'el rol %s consulta su detalle con el token de la sesión',
    async (role) => {
      adapter.mockImplementation((config) => ok(config, CONTRACT_ORDER));

      const router = renderRouterWithProviders(routes, {
        initialUrl: ORDER_PATH_BY_ROLE[role],
        initialAuthState: sessionForRole(role),
      });
      await router;

      await waitFor(() =>
        expect(screen.getByTestId('order-detail-31')).toBeTruthy(),
      );

      expect(router.getPathname()).toBe(ORDER_PATH_BY_ROLE[role]);
      expect(adapter).toHaveBeenCalledTimes(1);

      const [config] = adapter.mock.calls[0];
      expect(config.url).toBe('/ordenes/31');
      expect(AxiosHeaders.from(config.headers).get('Authorization')).toBe(
        `Bearer ${TOKEN}`,
      );
    },
  );
});

describe('vistas de órdenes: protección visual por rol', () => {
  it.each([
    ['cliente', 'administrador'],
    ['cliente', 'mecanico'],
    ['mecanico', 'administrador'],
    ['mecanico', 'cliente'],
    ['administrador', 'cliente'],
    ['administrador', 'mecanico'],
  ] as const)(
    'el rol %s no accede al detalle de órdenes de %s ni consulta al backend',
    async (role, otherRole) => {
      const router = renderRouterWithProviders(routes, {
        initialUrl: ORDER_PATH_BY_ROLE[otherRole],
        initialAuthState: sessionForRole(role),
      });
      await router;

      await waitFor(() =>
        expect(router.getPathname()).toBe(HOME_BY_ROLE[role].path),
      );

      expect(screen.getByText(HOME_BY_ROLE[role].content)).toBeTruthy();
      expect(screen.queryByTestId('order-detail-31')).toBeNull();
      expect(adapter).not.toHaveBeenCalled();
    },
  );

  it.each(Object.values(ORDER_PATH_BY_ROLE))(
    'sin sesión, %s redirige al login sin consultar al backend',
    async (path) => {
      const router = renderRouterWithProviders(routes, {
        initialUrl: path,
        initialAuthState: {
          isAuthenticated: false,
          isLoading: false,
          isHydrated: true,
        },
      });
      await router;

      await waitFor(() => expect(router.getPathname()).toBe('/login'));

      expect(screen.getByText('Iniciar sesión')).toBeTruthy();
      expect(adapter).not.toHaveBeenCalled();
    },
  );

  it('no consulta la orden hasta que termina la recuperación de la sesión', async () => {
    adapter.mockImplementation((config) => ok(config, CONTRACT_ORDER));

    const router = renderRouterWithProviders(routes, {
      initialUrl: '/ordenes/31',
      initialAuthState: { isLoading: true, isHydrated: false },
    });
    await router;

    expect(screen.getByText('Cargando...')).toBeTruthy();
    expect(screen.queryByTestId('order-detail-31')).toBeNull();
    expect(adapter).not.toHaveBeenCalled();

    await act(async () => {
      useAuthStore.setState(sessionForRole('administrador'));
    });

    await waitFor(() =>
      expect(screen.getByTestId('order-detail-31')).toBeTruthy(),
    );
    expect(router.getPathname()).toBe('/ordenes/31');
    expect(adapter).toHaveBeenCalledTimes(1);
  });
});

describe('vistas de órdenes: autorización del backend', () => {
  it('un 401 del backend cierra la sesión y devuelve al login', async () => {
    adapter.mockImplementation((config) => httpError(config, 401));

    const router = renderRouterWithProviders(routes, {
      initialUrl: '/mis-ordenes/31',
      initialAuthState: sessionForRole('cliente'),
    });
    await router;

    await waitFor(() => expect(router.getPathname()).toBe('/login'));

    expect(screen.getByText('Iniciar sesión')).toBeTruthy();
    expect(screen.queryByTestId('order-detail-31')).toBeNull();
    expect(useAuthStore.getState()).toMatchObject({
      isAuthenticated: false,
      user: null,
      token: null,
    });
  });

  it('una orden no visible para el usuario (404) muestra el error sin cerrar la sesión', async () => {
    adapter.mockImplementation((config) => httpError(config, 404));

    const router = renderRouterWithProviders(routes, {
      initialUrl: '/ordenes-asignadas/31',
      initialAuthState: sessionForRole('mecanico'),
    });
    await router;

    await waitFor(() =>
      expect(screen.getByTestId('order-detail-error')).toBeTruthy(),
    );

    expect(
      screen.getByText('El recurso solicitado no fue encontrado.'),
    ).toBeTruthy();
    expect(router.getPathname()).toBe('/ordenes-asignadas/31');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(adapter).toHaveBeenCalledTimes(1);
  });

  // MS2 usa 403 para falta de rol (E6 en docs/discrepancias-integracion.md):
  // la sesión sigue siendo válida y la vista informa el permiso faltante.
  it.each(['cliente', 'mecanico', 'administrador'] as const)(
    'un 403 del backend muestra el error de permisos sin cerrar la sesión (%s)',
    async (role) => {
      adapter.mockImplementation((config) => httpError(config, 403));

      const router = renderRouterWithProviders(routes, {
        initialUrl: ORDER_PATH_BY_ROLE[role],
        initialAuthState: sessionForRole(role),
      });
      await router;

      await waitFor(() =>
        expect(screen.getByTestId('order-detail-error')).toBeTruthy(),
      );

      expect(
        screen.getByText('No tienes permisos para realizar esta acción.'),
      ).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy();
      expect(router.getPathname()).toBe(ORDER_PATH_BY_ROLE[role]);
      expect(useAuthStore.getState()).toMatchObject({
        isAuthenticated: true,
        role,
        token: TOKEN,
      });
      expect(adapter).toHaveBeenCalledTimes(1);
    },
  );
});
