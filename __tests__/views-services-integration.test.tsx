import {
  cleanup,
  renderRouterWithProviders,
  resetStores,
  screen,
  waitFor,
} from '../test-utils';
import OrdenScreen from '@/app/(admin)/ordenes/[id]';
import VehiculosScreen from '@/app/(admin)/vehiculos';
import MisVehiculosScreen from '@/app/(cliente)/mis-vehiculos';
import MiOrdenScreen from '@/app/(cliente)/mis-ordenes/[id]';
import VehiculosAsignadosScreen from '@/app/(mecanico)/vehiculos-asignados';
import OrdenAsignadaScreen from '@/app/(mecanico)/ordenes-asignadas/[id]';
import { apiClient } from '@/services/api/client';

/**
 * Integración entre las vistas y VehiclesService / OrdersService.
 *
 * A diferencia de `vehicle-list-integration.test.tsx` y
 * `order-detail-integration.test.tsx` —que sustituyen el servicio por un
 * mock para comprobar el comportamiento de la vista— aquí se ejercita la
 * cadena completa con los servicios reales: solo se simula el cliente HTTP.
 *
 * Así queda cubierto el recorrido respuesta de la API Gateway → DTO →
 * mapper → modelo → interfaz, incluida la normalización de errores, que un
 * mock del servicio no puede verificar.
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
  '(cliente)/mis-vehiculos': MisVehiculosScreen,
  '(mecanico)/vehiculos-asignados': VehiculosAsignadosScreen,
  '(admin)/vehiculos': VehiculosScreen,
  '(cliente)/mis-ordenes/[id]': MiOrdenScreen,
  '(mecanico)/ordenes-asignadas/[id]': OrdenAsignadaScreen,
  '(admin)/ordenes/[id]': OrdenScreen,
};

/** Error de Axios con respuesta del servidor. */
function httpError(status: number, detail?: string) {
  return {
    isAxiosError: true,
    message: `Request failed with status code ${status}`,
    response: {
      status,
      data: detail ? { detail } : {},
    },
  };
}

/** Error de Axios sin respuesta: backend inalcanzable. */
function networkError() {
  return { isAxiosError: true, message: 'Network Error' };
}

beforeEach(() => {
  jest.clearAllMocks();
  resetStores();
});

afterEach(() => cleanup());

describe('vistas de vehículos con VehiclesService real', () => {
  it.each([
    ['cliente', '/mis-vehiculos', '/vehiculos'],
    ['mecánico', '/vehiculos-asignados', '/vehiculos/asignados'],
    ['administración', '/vehiculos', '/vehiculos'],
  ] as const)(
    'la vista de %s consulta %s a través del servicio',
    async (_role, path, endpoint) => {
      mockedApiClient.get.mockResolvedValueOnce({ data: [] } as never);

      const router = renderRouterWithProviders(routes, { initialUrl: path });
      await router;

      await waitFor(() =>
        expect(screen.getByTestId('vehicle-list-empty')).toBeTruthy(),
      );

      expect(mockedApiClient.get).toHaveBeenCalledWith(endpoint);
    },
  );

  it('mapea y representa una respuesta con atributos en español', async () => {
    mockedApiClient.get.mockResolvedValueOnce({
      data: [
        {
          vehiculo_id: 7,
          patente: 'ABCD12',
          marca: 'Toyota',
          modelo: 'Yaris',
          anio: 2021,
          kilometraje: 42000,
        },
      ],
    } as never);

    const router = renderRouterWithProviders(routes, {
      initialUrl: '/mis-vehiculos',
    });
    await router;

    await waitFor(() =>
      expect(screen.getByTestId('vehicle-card-7')).toBeTruthy(),
    );

    expect(
      screen.getByLabelText(
        'Vehículo AB·CD·12. Toyota Yaris. Año: 2021. Kilometraje: 42.000 km',
      ),
    ).toBeTruthy();
  });

  it('mapea y representa una respuesta con atributos en inglés y campos nulos', async () => {
    mockedApiClient.get.mockResolvedValueOnce({
      data: [
        {
          id: 8,
          license_plate: 'EFGH34',
          brand: 'Nissan',
          model: 'Versa',
          year: null,
          mileage: null,
        },
      ],
    } as never);

    const router = renderRouterWithProviders(routes, {
      initialUrl: '/vehiculos',
    });
    await router;

    await waitFor(() =>
      expect(screen.getByTestId('vehicle-card-8')).toBeTruthy(),
    );

    expect(
      screen.getByLabelText(
        'Vehículo EF·GH·34. Nissan Versa. Año: Sin año. Kilometraje: Sin kilometraje',
      ),
    ).toBeTruthy();
  });

  it('representa el listado vacío cuando la API responde sin vehículos', async () => {
    mockedApiClient.get.mockResolvedValueOnce({ data: [] } as never);

    const router = renderRouterWithProviders(routes, {
      initialUrl: '/mis-vehiculos',
    });
    await router;

    await waitFor(() =>
      expect(screen.getByTestId('vehicle-list-empty')).toBeTruthy(),
    );

    expect(
      screen.getByText('Todavía no tienes vehículos registrados en el taller.'),
    ).toBeTruthy();
  });

  it('muestra el mensaje del backend cuando la respuesta trae detalle', async () => {
    mockedApiClient.get.mockRejectedValueOnce(
      httpError(404, 'Vehículos no encontrados'),
    );

    const router = renderRouterWithProviders(routes, {
      initialUrl: '/mis-vehiculos',
    });
    await router;

    await waitFor(() =>
      expect(screen.getByTestId('vehicle-list-error')).toBeTruthy(),
    );

    expect(screen.getByText('Vehículos no encontrados')).toBeTruthy();
  });

  it('muestra el mensaje normalizado de un error de servidor sin detalle', async () => {
    mockedApiClient.get.mockRejectedValueOnce(httpError(500));

    const router = renderRouterWithProviders(routes, {
      initialUrl: '/vehiculos',
    });
    await router;

    await waitFor(() =>
      expect(screen.getByTestId('vehicle-list-error')).toBeTruthy(),
    );

    expect(
      screen.getByText(
        'Error interno en el servidor. Intenta nuevamente más tarde.',
      ),
    ).toBeTruthy();
  });

  it('muestra el mensaje normalizado cuando el backend es inalcanzable', async () => {
    mockedApiClient.get.mockRejectedValueOnce(networkError());

    const router = renderRouterWithProviders(routes, {
      initialUrl: '/vehiculos-asignados',
    });
    await router;

    await waitFor(() =>
      expect(screen.getByTestId('vehicle-list-error')).toBeTruthy(),
    );

    expect(
      screen.getByText(
        'Backend no disponible o sin conexión a internet. Revisa tu conexión.',
      ),
    ).toBeTruthy();
  });
});

describe('vistas de órdenes con OrdersService real', () => {
  it.each([
    ['cliente', '/mis-ordenes/124'],
    ['mecánico', '/ordenes-asignadas/124'],
    ['administración', '/ordenes/124'],
  ] as const)(
    'la vista de %s consulta el detalle a través del servicio',
    async (_role, path) => {
      mockedApiClient.get.mockResolvedValueOnce({
        data: { orden_id: 124, vehiculo_id: 7, cliente_id: 12, estado_codigo: 3 },
      } as never);

      const router = renderRouterWithProviders(routes, { initialUrl: path });
      await router;

      await waitFor(() =>
        expect(screen.getByTestId('order-detail-124')).toBeTruthy(),
      );

      expect(mockedApiClient.get).toHaveBeenCalledWith('/ordenes/124');
    },
  );

  it('traduce el código numérico de estado a la etiqueta de la interfaz', async () => {
    mockedApiClient.get.mockResolvedValueOnce({
      data: {
        orden_id: 124,
        vehiculo_id: 7,
        ingreso_id: 201,
        cliente_id: 12,
        creado_por_id: 99,
        mecanico_actual_id: 2,
        estado_codigo: 4,
        creado_en: '2026-03-01T09:00:00Z',
        actualizado_en: '2026-03-05T14:00:00Z',
      },
    } as never);

    const router = renderRouterWithProviders(routes, {
      initialUrl: '/mis-ordenes/124',
    });
    await router;

    await waitFor(() =>
      expect(screen.getByTestId('order-detail-124')).toBeTruthy(),
    );

    // estado_codigo 4 es Esperando repuestos en el contrato y en el mapper.
    // Los códigos que aún difieren se registran en
    // docs/integracion-cruzada-ordenes.md (C1).
    expect(
      screen.getByLabelText('Estado de la orden: Esperando repuestos'),
    ).toBeTruthy();

    expect(screen.getByLabelText('Vehículo: 7')).toBeTruthy();
    expect(screen.getByLabelText('Ingreso: 201')).toBeTruthy();
    expect(screen.getByLabelText('Mecánico asignado: 2')).toBeTruthy();
    expect(screen.getByLabelText('Cliente: No disponible')).toBeTruthy();
    expect(screen.getByLabelText('Creada por: 99')).toBeTruthy();
    expect(screen.getByLabelText('Fecha de creación: 01-03-2026')).toBeTruthy();
    expect(
      screen.getByLabelText('Última actualización: 05-03-2026'),
    ).toBeTruthy();
  });

  it('muestra un error ante una orden sin estado oficial', async () => {
    mockedApiClient.get.mockResolvedValueOnce({
      data: { orden_id: 130, vehiculo_id: 9 },
    } as never);

    const router = renderRouterWithProviders(routes, {
      initialUrl: '/ordenes/130',
    });
    await router;

    await waitFor(() =>
      expect(screen.getByTestId('order-detail-error')).toBeTruthy(),
    );

    expect(
      screen.getByText('Estado de orden desconocido: undefined'),
    ).toBeTruthy();
  });

  it('muestra el mensaje normalizado cuando la orden no existe', async () => {
    mockedApiClient.get.mockRejectedValueOnce(httpError(404));

    const router = renderRouterWithProviders(routes, {
      initialUrl: '/mis-ordenes/999',
    });
    await router;

    await waitFor(() =>
      expect(screen.getByTestId('order-detail-error')).toBeTruthy(),
    );

    expect(
      screen.getByText('El recurso solicitado no fue encontrado.'),
    ).toBeTruthy();
  });

  it('muestra el mensaje de permisos insuficientes devuelto por el backend', async () => {
    mockedApiClient.get.mockRejectedValueOnce(httpError(403));

    const router = renderRouterWithProviders(routes, {
      initialUrl: '/ordenes-asignadas/124',
    });
    await router;

    await waitFor(() =>
      expect(screen.getByTestId('order-detail-error')).toBeTruthy(),
    );

    expect(
      screen.getByText('No tienes permisos para realizar esta acción.'),
    ).toBeTruthy();
  });
});
