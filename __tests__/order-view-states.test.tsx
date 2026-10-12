import {
  cleanup,
  fireEvent,
  renderRouterWithProviders,
  renderWithProviders,
  resetStores,
  screen,
  waitFor,
} from '../test-utils';
import OrdenScreen from '@/app/(admin)/ordenes/[id]';
import MiOrdenScreen from '@/app/(cliente)/mis-ordenes/[id]';
import OrdenAsignadaScreen from '@/app/(mecanico)/ordenes-asignadas/[id]';
import { OrderDetailView } from '@/components/orders/OrderDetailView';
import { apiClient } from '@/services/api/client';
import { ordersService } from '@/services/orders.service';

/**
 * Estados de carga, vacíos y de error de las vistas del módulo de órdenes,
 * ejercitados con OrdersService real: solo se simula el cliente HTTP, de modo
 * que los mensajes provienen de la normalización de errores de la app.
 *
 * Complementa `order-detail-integration.test.tsx` (servicio simulado),
 * `views-services-integration.test.tsx` (404 y 403) y
 * `manual-refresh-retry.test.tsx` (reintento y actualización manual).
 */

jest.mock('@/services/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  },
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

const routes = {
  '(cliente)/mis-ordenes/[id]': MiOrdenScreen,
  '(mecanico)/ordenes-asignadas/[id]': OrdenAsignadaScreen,
  '(admin)/ordenes/[id]': OrdenScreen,
};

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

/** Promesa controlable para observar el estado intermedio de una consulta. */
function deferred<T>() {
  let resolve: (value: T) => void = () => {};

  const promise = new Promise<T>((res) => {
    resolve = res;
  });

  return { promise, resolve };
}

function httpError(status: number) {
  return {
    isAxiosError: true,
    message: `Request failed with status code ${status}`,
    response: { status, data: {} },
  };
}

async function renderOrder(path = '/ordenes/31') {
  await renderRouterWithProviders(routes, { initialUrl: path });
}

/**
 * Monta la vista sin el router en memoria para observar consultas diferidas,
 * como en `manual-refresh-retry.test.tsx`; el servicio sigue siendo el real.
 */
function renderOrderView() {
  return renderWithProviders(
    <OrderDetailView
      eyebrow="Administración"
      orderId="31"
      loadOrder={(id) => ordersService.getOrderById(id)}
    />,
  );
}

async function expectErrorMessage(message: string) {
  await waitFor(() =>
    expect(screen.getByTestId('order-detail-error')).toBeTruthy(),
  );

  expect(screen.getByText(message)).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy();
  expect(screen.queryByTestId('order-detail-31')).toBeNull();
}

beforeEach(() => {
  jest.clearAllMocks();
  resetStores();
});

afterEach(() => {
  cleanup();
  // renderRouter activa temporizadores simulados; no deben alcanzar a las
  // pruebas que montan la vista directamente.
  jest.useRealTimers();
});

describe('vistas de órdenes: carga inicial', () => {
  it.each([
    ['cliente', '/mis-ordenes/31'],
    ['mecánico', '/ordenes-asignadas/31'],
    ['administración', '/ordenes/31'],
  ] as const)(
    'la vista de %s muestra la carga hasta que el servicio responde, con una sola consulta',
    async (_role, path) => {
      const response = deferred<{ data: typeof CONTRACT_ORDER }>();
      mockedApiClient.get.mockReturnValueOnce(response.promise as never);

      await renderOrder(path);

      expect(screen.getByTestId('order-detail-loading')).toBeTruthy();
      expect(screen.getByText('Cargando orden...')).toBeTruthy();
      expect(screen.queryByTestId('order-detail-error')).toBeNull();

      response.resolve({ data: CONTRACT_ORDER });

      await waitFor(() =>
        expect(screen.getByTestId('order-detail-31')).toBeTruthy(),
      );

      expect(screen.queryByTestId('order-detail-loading')).toBeNull();
      expect(mockedApiClient.get).toHaveBeenCalledTimes(1);
    },
  );
});

describe('vistas de órdenes: errores de servicio', () => {
  it('informa el tiempo de espera agotado', async () => {
    mockedApiClient.get.mockRejectedValueOnce({
      isAxiosError: true,
      code: 'ECONNABORTED',
      message: 'timeout of 15000ms exceeded',
    });

    await renderOrder();

    await expectErrorMessage(
      'Tiempo de espera agotado. El servidor tardó demasiado en responder.',
    );
  });

  it('informa la falta de conexión con el backend', async () => {
    mockedApiClient.get.mockRejectedValueOnce({
      isAxiosError: true,
      message: 'Network Error',
    });

    await renderOrder('/mis-ordenes/31');

    await expectErrorMessage(
      'Backend no disponible o sin conexión a internet. Revisa tu conexión.',
    );
  });

  it.each([500, 503])('informa un error %i del servidor', async (status) => {
    mockedApiClient.get.mockRejectedValueOnce(httpError(status));

    await renderOrder('/ordenes-asignadas/31');

    await expectErrorMessage(
      'Error interno en el servidor. Intenta nuevamente más tarde.',
    );
  });

  it('no repite la consulta por su cuenta tras un error', async () => {
    mockedApiClient.get.mockRejectedValueOnce(httpError(500));

    await renderOrder();

    await waitFor(() =>
      expect(screen.getByTestId('order-detail-error')).toBeTruthy(),
    );

    expect(mockedApiClient.get).toHaveBeenCalledTimes(1);
  });
});

describe('vistas de órdenes: reintento manual', () => {
  /**
   * El act() de la pulsación no termina mientras la consulta siga pendiente,
   * así que el estado intermedio se comprueba antes de resolverla y la
   * pulsación se espera después, sin solapar act() con waitFor().
   */
  async function flushMicrotasks() {
    for (let i = 0; i < 10; i += 1) {
      await Promise.resolve();
    }
  }

  it('muestra la carga durante el reintento y luego el detalle', async () => {
    const retry = deferred<{ data: typeof CONTRACT_ORDER }>();
    mockedApiClient.get
      .mockRejectedValueOnce({ isAxiosError: true, message: 'Network Error' })
      .mockReturnValueOnce(retry.promise as never);

    await renderOrderView();

    await waitFor(() =>
      expect(screen.getByTestId('order-detail-error')).toBeTruthy(),
    );

    const press = fireEvent.press(
      screen.getByRole('button', { name: 'Reintentar' }),
    );
    await flushMicrotasks();

    // Mientras el reintento sigue en curso la vista no queda en blanco.
    expect(screen.getByTestId('order-detail-loading')).toBeTruthy();
    expect(screen.queryByTestId('order-detail-error')).toBeNull();
    expect(mockedApiClient.get).toHaveBeenCalledTimes(2);

    retry.resolve({ data: CONTRACT_ORDER });
    await press;

    expect(screen.getByTestId('order-detail-31')).toBeTruthy();
    expect(screen.queryByTestId('order-detail-loading')).toBeNull();
    expect(mockedApiClient.get).toHaveBeenCalledTimes(2);
  });

  it('descarta las actualizaciones repetidas mientras una sigue en curso', async () => {
    const refresh = deferred<{ data: typeof CONTRACT_ORDER }>();
    mockedApiClient.get
      .mockResolvedValueOnce({ data: CONTRACT_ORDER } as never)
      .mockReturnValueOnce(refresh.promise as never);

    await renderOrderView();

    await waitFor(() =>
      expect(screen.getByTestId('order-detail-31')).toBeTruthy(),
    );

    const press = fireEvent.press(screen.getByTestId('order-detail-refresh'));
    await flushMicrotasks();

    expect(
      screen.getByTestId('order-detail-refresh').props.accessibilityState,
    ).toMatchObject({ busy: true, disabled: true });

    // Pulsaciones adicionales sobre el control deshabilitado no consultan.
    await fireEvent.press(screen.getByTestId('order-detail-refresh'));
    await fireEvent.press(screen.getByTestId('order-detail-refresh'));

    // Los datos ya cargados siguen visibles durante la actualización.
    expect(screen.getByTestId('order-detail-31')).toBeTruthy();
    expect(mockedApiClient.get).toHaveBeenCalledTimes(2);

    refresh.resolve({ data: CONTRACT_ORDER });
    await press;

    expect(
      screen.getByTestId('order-detail-refresh').props.accessibilityState,
    ).toMatchObject({ busy: false, disabled: false });
    expect(mockedApiClient.get).toHaveBeenCalledTimes(2);
  });
});

describe('vistas de órdenes: respuestas vacías', () => {
  // Dependen del mapper y del servicio de órdenes (docs/integracion-cruzada-ordenes.md, C4).
  it.todo('una respuesta 200 sin cuerpo muestra un mensaje comprensible');
  it.todo('una respuesta 200 sin identificador de orden no se representa como orden válida');
});
