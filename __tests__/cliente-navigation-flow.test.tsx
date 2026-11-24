import { Text } from 'react-native';
import { router } from 'expo-router';

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
import AuthLayout from '@/app/(auth)/_layout';
import LoginScreen from '@/app/(auth)/login';
import ClienteLayout from '@/app/(cliente)/_layout';
import ClienteScreen from '@/app/(cliente)/cliente';
import MiOrdenPresupuestoScreen from '@/app/(cliente)/mis-ordenes/[id]/presupuesto';
import MisVehiculosScreen from '@/app/(cliente)/mis-vehiculos';
import ClienteOrderDetailRoute from '@/app/(cliente)/ordenes/[id]';
import ClienteVehicleDetailScreen from '@/app/(cliente)/vehiculos/[id]';
import MecanicoLayout from '@/app/(mecanico)/_layout';
import { orderResponsePayloads } from '@/mocks/payloads/order.payload';
import { vehicleResponsePayloads } from '@/mocks/payloads/vehicle.payload';
import { mockUserByRole } from '@/mocks/users.mock';
import { apiClient } from '@/services/api/client';
import { useAuthStore } from '@/stores/authStore';

/**
 * SCRUM-228 — Navegación del rol Cliente con las rutas reales de `src/app`.
 *
 * Recorre portal → mis vehículos → detalle de vehículo → detalle de orden →
 * presupuesto, la navegación hacia atrás, la protección de rutas de otros
 * roles, el cierre de sesión y los estados de error. Solo se sustituye
 * `apiClient` (servicios y mappers reales) y el almacenamiento seguro.
 * Expo Router se ejecuta en memoria: no es una ejecución en Android.
 */

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));
jest.mock('@/services/api/client', () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn() },
}));

const get = jest.mocked(apiClient.get);

const VEHICLE = vehicleResponsePayloads.completo; // vehiculo_id 1
const ORDER = { ...orderResponsePayloads.en_reparacion, vehiculo_id: VEHICLE.vehiculo_id };
const ORDER_ID = String(ORDER.orden_id);

const routes = {
  '(auth)/_layout': AuthLayout,
  '(auth)/login': LoginScreen,
  '(admin)/_layout': AdminLayout,
  '(admin)/administrador': () => <Text>Panel administrador</Text>,
  '(mecanico)/_layout': MecanicoLayout,
  '(mecanico)/mecanico': () => <Text>Órdenes del mecánico</Text>,
  '(cliente)/_layout': ClienteLayout,
  '(cliente)/cliente': ClienteScreen,
  '(cliente)/mis-vehiculos': MisVehiculosScreen,
  '(cliente)/vehiculos/[id]': ClienteVehicleDetailScreen,
  '(cliente)/ordenes/[id]': ClienteOrderDetailRoute,
  '(cliente)/mis-ordenes/[id]/presupuesto': MiOrdenPresupuestoScreen,
};

const clienteSession = {
  user: mockUserByRole.cliente,
  token: 'token-de-prueba',
  role: 'cliente' as const,
  isAuthenticated: true,
  isLoading: false,
  isHydrated: true,
};

function serveBackend(overrides: Record<string, () => unknown> = {}) {
  const table: Record<string, () => unknown> = {
    '/vehiculos': () => ({ data: [VEHICLE] }),
    [`/vehiculos/${VEHICLE.vehiculo_id}`]: () => ({ data: VEHICLE }),
    '/ordenes': () => ({ data: [ORDER] }),
    [`/ordenes/${ORDER_ID}`]: () => ({ data: ORDER }),
    '/presupuestos': () => ({ data: { presupuestos: [], total: 0 } }),
    ...overrides,
  };
  get.mockImplementation(async (url: string) => {
    const handler = table[url];
    if (!handler) throw new Error(`GET no esperado en la prueba: ${url}`);
    return handler() as never;
  });
}

const http = (status: number) => () => {
  throw { isAxiosError: true, message: `status ${status}`, response: { status, data: {} } };
};

async function openAsCliente(initialUrl: string) {
  const view = renderRouterWithProviders(routes, { initialUrl, initialAuthState: clienteSession });
  await view;
  return { view };
}

async function press(name: string | RegExp) {
  await fireEvent.press(screen.getByRole('button', { name }));
}

beforeEach(() => {
  jest.resetAllMocks();
  resetStores();
  serveBackend();
});
afterEach(cleanup);

describe('Recorrido principal del Cliente', () => {
  it('portal → vehículos → vehículo → orden → presupuesto, y vuelve atrás paso a paso', async () => {
    await openAsCliente('/cliente');
    await waitFor(() => expect(screen.getByRole('header', { name: 'Mi taller' })).toBeTruthy());

    await press('Ver mis vehículos');
    await waitFor(() => expect(screen).toHavePathname('/mis-vehiculos'));
    await waitFor(() => expect(screen.getByTestId(`vehicle-card-${VEHICLE.vehiculo_id}`)).toBeTruthy());

    await press(/Ver detalle del vehículo/);
    await waitFor(() => expect(screen).toHavePathname(`/vehiculos/${VEHICLE.vehiculo_id}`));
    await waitFor(() => expect(screen.getByTestId(`vehicle-order-${ORDER_ID}`)).toBeTruthy());

    await fireEvent.press(screen.getByTestId(`vehicle-order-${ORDER_ID}`));
    await waitFor(() => expect(screen).toHavePathname(`/ordenes/${ORDER_ID}`));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Ver presupuesto' })).toBeTruthy());
    // El Cliente no recibe herramientas del mecánico.
    expect(screen.queryByTestId('order-update-panel')).toBeNull();
    expect(screen.queryByTestId('evidence-capture-panel')).toBeNull();
    expect(screen.getByTestId('order-evidence-list')).toBeTruthy();

    await press('Ver presupuesto');
    await waitFor(() => expect(screen).toHavePathname(`/mis-ordenes/${ORDER_ID}/presupuesto`));
    await waitFor(() => expect(screen.getByTestId('order-budget-empty')).toBeTruthy());

    for (const expected of [`/ordenes/${ORDER_ID}`, `/vehiculos/${VEHICLE.vehiculo_id}`, '/mis-vehiculos', '/cliente']) {
      await act(async () => router.back());
      await waitFor(() => expect(screen).toHavePathname(expected));
    }
  });

  it('los botones «Volver» de las pantallas regresan a la anterior', async () => {
    await openAsCliente('/mis-vehiculos');
    await waitFor(() => expect(screen.getByTestId(`vehicle-card-${VEHICLE.vehiculo_id}`)).toBeTruthy());
    await press(/Ver detalle del vehículo/);
    await waitFor(() => expect(screen.getByTestId('vehicle-detail-back-bottom')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('vehicle-detail-back-bottom'));

    await waitFor(() => expect(screen).toHavePathname('/mis-vehiculos'));
  });
});

describe('Enlace directo sin historial (arranque desde enlace en Android o recarga web)', () => {
  it('«Volver a vehículos» lleva a la lista del Cliente', async () => {
    await openAsCliente(`/vehiculos/${VEHICLE.vehiculo_id}`);
    await waitFor(() => expect(screen.getByTestId('vehicle-detail-back-bottom')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('vehicle-detail-back-bottom'));

    await waitFor(() => expect(screen).toHavePathname('/mis-vehiculos'));
  });

  it('«Volver» del vehículo con error también tiene salida', async () => {
    serveBackend({ '/vehiculos/999': http(404) });
    await openAsCliente('/vehiculos/999');
    await waitFor(() => expect(screen.getByTestId('vehicle-detail-back')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('vehicle-detail-back'));

    await waitFor(() => expect(screen).toHavePathname('/mis-vehiculos'));
  });

  it('«Volver» de la orden lleva al portal del Cliente', async () => {
    await openAsCliente(`/ordenes/${ORDER_ID}`);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Ver presupuesto' })).toBeTruthy());

    await press('Volver');

    await waitFor(() => expect(screen).toHavePathname('/cliente'));
  });

  it('«Volver» de la orden con error también tiene salida', async () => {
    serveBackend({ [`/ordenes/${ORDER_ID}`]: http(500) });
    await openAsCliente(`/ordenes/${ORDER_ID}`);
    await waitFor(() => expect(screen.getByTestId('order-detail-error')).toBeTruthy());

    await press('Volver');

    await waitFor(() => expect(screen).toHavePathname('/cliente'));
  });
});

describe('Protección de rutas', () => {
  it.each(['/administrador', '/mecanico'])('un Cliente que abre %s vuelve a su portal', async (url) => {
    await openAsCliente(url);
    await waitFor(() => expect(screen).toHavePathname('/cliente'));
    expect(screen.queryByText(/Panel administrador|Órdenes del mecánico/)).toBeNull();
  });

  it('sin sesión, un enlace directo a un vehículo lleva al login sin consultar la API', async () => {
    await renderRouterWithProviders(routes, {
      initialUrl: `/vehiculos/${VEHICLE.vehiculo_id}`,
      initialAuthState: { isAuthenticated: false, isLoading: false, isHydrated: true },
    });
    await waitFor(() => expect(screen).toHavePathname('/login'));
    expect(get).not.toHaveBeenCalled();
  });
});

describe('Cierre de sesión', () => {
  it('«Cerrar sesión» lleva al login y las rutas del Cliente dejan de estar accesibles', async () => {
    await openAsCliente('/cliente');
    await waitFor(() => expect(screen.getByRole('header', { name: 'Mi taller' })).toBeTruthy());

    await press('Cerrar sesión');

    await waitFor(() => expect(screen).toHavePathname('/login'));
    expect(useAuthStore.getState().isAuthenticated).toBe(false);

    await act(async () => router.push('/mis-vehiculos'));
    await waitFor(() => expect(screen).toHavePathname('/login'));
  });
});

describe('Estados de error durante la navegación', () => {
  it('un vehículo inexistente (404) muestra error con reintento y salida', async () => {
    serveBackend({ '/vehiculos/999': http(404) });
    await openAsCliente('/vehiculos/999');

    await waitFor(() => expect(screen.getByTestId('vehicle-detail-error')).toBeTruthy());
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy();
    expect(screen.getByTestId('vehicle-detail-back')).toBeTruthy();
  });

  it('un 403 en la orden se informa sin cerrar la sesión', async () => {
    serveBackend({ [`/ordenes/${ORDER_ID}`]: http(403) });
    await openAsCliente(`/ordenes/${ORDER_ID}`);

    await waitFor(() => expect(screen.getByText('No tienes permisos para realizar esta acción.')).toBeTruthy());
    expect(screen).toHavePathname(`/ordenes/${ORDER_ID}`);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });
});
