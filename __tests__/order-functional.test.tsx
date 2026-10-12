import * as SecureStore from 'expo-secure-store';
import { router as appRouter, type Href } from 'expo-router';
import {
  AxiosError,
  AxiosHeaders,
  type AxiosAdapter,
  type InternalAxiosRequestConfig,
} from 'axios';

import {
  act,
  cleanup,
  fireEvent,
  renderRouterWithProviders,
  resetStores,
  screen,
  waitFor,
} from '../test-utils';
import AdminLayout from '@/app/(admin)/_layout';
import AdminScreen from '@/app/(admin)/administrador';
import OrdenScreen from '@/app/(admin)/ordenes/[id]';
import AuthLayout from '@/app/(auth)/_layout';
import LoginScreen from '@/app/(auth)/login';
import ClienteLayout from '@/app/(cliente)/_layout';
import ClienteScreen from '@/app/(cliente)/cliente';
import MiOrdenScreen from '@/app/(cliente)/mis-ordenes/[id]';
import IndexScreen from '@/app/index';
import MecanicoLayout from '@/app/(mecanico)/_layout';
import MecanicoScreen from '@/app/(mecanico)/mecanico';
import OrdenAsignadaScreen from '@/app/(mecanico)/ordenes-asignadas/[id]';
import { mockAuthResponses } from '@/mocks/auth.mock';
import { apiClient } from '@/services/api/client';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/stores/authStore';

/**
 * Pruebas funcionales automatizadas del módulo de órdenes (Jest, sin
 * emulador ni dispositivo).
 *
 * Recorren el caso de uso "consultar una orden de trabajo" con las pantallas,
 * layouts, store de sesión, OrdersService, cliente HTTP e interceptores
 * reales. Se simulan AuthService (como en `auth-full-flow.test.tsx`), el
 * almacenamiento seguro (en memoria) y el adaptador de red de Axios.
 *
 * Ninguna vista enlaza todavía al detalle de una orden, por lo que la
 * navegación hacia él se hace por ruta, como lo haría un enlace profundo.
 */

const secureStore = new Map<string, string>();

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('@/services/auth.service', () => ({
  authService: { login: jest.fn() },
}));

const login = jest.mocked(authService.login);

const routes = {
  index: IndexScreen,
  '(auth)/_layout': AuthLayout,
  '(auth)/login': LoginScreen,
  '(admin)/_layout': AdminLayout,
  '(admin)/administrador': AdminScreen,
  '(admin)/ordenes/[id]': OrdenScreen,
  '(cliente)/_layout': ClienteLayout,
  '(cliente)/cliente': ClienteScreen,
  '(cliente)/mis-ordenes/[id]': MiOrdenScreen,
  '(mecanico)/_layout': MecanicoLayout,
  '(mecanico)/mecanico': MecanicoScreen,
  '(mecanico)/ordenes-asignadas/[id]': OrdenAsignadaScreen,
};

const roleCases = [
  ['cliente', '/cliente', 'Mi taller', '/mis-ordenes/31'],
  ['mecanico', '/mecanico', 'Mis órdenes', '/ordenes-asignadas/31'],
  ['administrador', '/administrador', 'Panel del taller', '/ordenes/31'],
] as const;

type OrderPath = (typeof roleCases)[number][3];

/**
 * Abre el detalle de la orden por ruta, como un enlace profundo. Las rutas
 * tipadas (`.expo/types`) se generan localmente y pueden no incluir aún las
 * pantallas de detalle, por eso la ruta se pasa como `Href`.
 */
async function openOrder(path: OrderPath) {
  await act(async () => {
    appRouter.push(path as Href);
  });
}

/** Ejemplo oficial de `OrdenRespuesta` (MS2). */
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

function ok(config: InternalAxiosRequestConfig, data: unknown) {
  return Promise.resolve({
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  });
}

function timeout(config: InternalAxiosRequestConfig) {
  return Promise.reject(
    new AxiosError(
      'timeout of 15000ms exceeded',
      AxiosError.ECONNABORTED,
      config,
    ),
  );
}

const adapter = jest.fn<ReturnType<AxiosAdapter>, Parameters<AxiosAdapter>>();
const originalAdapter = apiClient.defaults.adapter;

async function loginAs(role: (typeof roleCases)[number][0]) {
  const response = mockAuthResponses[role];
  login.mockResolvedValueOnce(response);

  await fireEvent.changeText(
    screen.getByTestId('login-email'),
    response.user.email,
  );
  await fireEvent.changeText(
    screen.getByTestId('login-password'),
    'clave-segura',
  );
  await fireEvent.press(screen.getByTestId('login-submit'));

  return response;
}

function authorizationOf(call: Parameters<AxiosAdapter>) {
  return AxiosHeaders.from(call[0].headers).get('Authorization');
}

beforeEach(() => {
  resetStores();
  secureStore.clear();
  jest
    .mocked(SecureStore.getItemAsync)
    .mockImplementation(async (key) => secureStore.get(key) ?? null);
  jest
    .mocked(SecureStore.setItemAsync)
    .mockImplementation(async (key, value) => {
      secureStore.set(key, value);
    });
  jest
    .mocked(SecureStore.deleteItemAsync)
    .mockImplementation(async (key) => {
      secureStore.delete(key);
    });
  login.mockReset();
  adapter.mockReset();
  apiClient.defaults.adapter = adapter;
});

afterEach(() => {
  cleanup();
  apiClient.defaults.adapter = originalAdapter;
  jest.restoreAllMocks();
});

describe('caso de uso: consultar una orden de trabajo', () => {
  it.each(roleCases)(
    'el rol %s inicia sesión, consulta y actualiza una orden, vuelve al panel y cierra la sesión',
    async (role, home, heading, orderPath) => {
      adapter
        .mockImplementationOnce((config) => ok(config, CONTRACT_ORDER))
        .mockImplementationOnce((config) =>
          ok(config, {
            ...CONTRACT_ORDER,
            estado_codigo: 4,
            actualizado_en: '2026-09-29T09:00:00-03:00',
          }),
        );

      const router = renderRouterWithProviders(routes, {
        initialUrl: '/login',
      });
      await router;

      const session = await loginAs(role);

      await waitFor(() => expect(router.getPathname()).toBe(home));
      expect(screen.getByText(heading)).toBeTruthy();
      expect(adapter).not.toHaveBeenCalled();

      await openOrder(orderPath);

      await waitFor(() =>
        expect(screen.getByTestId('order-detail-31')).toBeTruthy(),
      );
      expect(router.getPathname()).toBe(orderPath);
      expect(
        screen.getByLabelText('Estado de la orden: Esperando diagnóstico'),
      ).toBeTruthy();
      expect(screen.getByLabelText('Vehículo: 12')).toBeTruthy();
      expect(screen.getByLabelText('Mecánico asignado: 50')).toBeTruthy();

      // La petición usa el token que dejó el login en el almacenamiento.
      expect(adapter.mock.calls[0][0].url).toBe('/ordenes/31');
      expect(authorizationOf(adapter.mock.calls[0])).toBe(
        `Bearer ${session.token}`,
      );

      await fireEvent.press(screen.getByRole('button', { name: 'Actualizar' }));

      await waitFor(() =>
        expect(
          screen.getByLabelText('Estado de la orden: Esperando repuestos'),
        ).toBeTruthy(),
      );
      expect(adapter).toHaveBeenCalledTimes(2);

      await act(async () => {
        appRouter.back();
      });

      await waitFor(() => expect(router.getPathname()).toBe(home));
      expect(screen.getByText(heading)).toBeTruthy();

      await fireEvent.press(screen.getByText('Cerrar sesión'));

      await waitFor(() => expect(router.getPathname()).toBe('/login'));

      // Tras cerrar la sesión el detalle ya no es accesible ni se consulta.
      await openOrder(orderPath);

      await waitFor(() => expect(router.getPathname()).toBe('/login'));
      expect(screen.queryByTestId('order-detail-31')).toBeNull();
      expect(adapter).toHaveBeenCalledTimes(2);
    },
  );

  it('el cliente recupera la orden reintentando tras agotarse los reintentos automáticos', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    // Petición inicial y los dos reintentos automáticos de GET (retry.ts).
    adapter
      .mockImplementationOnce(timeout)
      .mockImplementationOnce(timeout)
      .mockImplementationOnce(timeout)
      .mockImplementationOnce((config) => ok(config, CONTRACT_ORDER));

    const router = renderRouterWithProviders(routes, {
      initialUrl: '/login',
    });
    await router;

    await loginAs('cliente');
    await waitFor(() => expect(router.getPathname()).toBe('/cliente'));

    await openOrder('/mis-ordenes/31');

    expect(screen.getByTestId('order-detail-loading')).toBeTruthy();

    // renderRouter usa temporizadores simulados: se avanza el backoff (1 s + 2 s).
    await act(async () => {
      await jest.advanceTimersByTimeAsync(3000);
    });

    await waitFor(() =>
      expect(
        screen.getByText(
          'Tiempo de espera agotado. El servidor tardó demasiado en responder.',
        ),
      ).toBeTruthy(),
    );
    expect(adapter).toHaveBeenCalledTimes(3);

    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));

    await waitFor(() =>
      expect(screen.getByTestId('order-detail-31')).toBeTruthy(),
    );
    expect(screen.queryByTestId('order-detail-error')).toBeNull();
    expect(adapter).toHaveBeenCalledTimes(4);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });
});
