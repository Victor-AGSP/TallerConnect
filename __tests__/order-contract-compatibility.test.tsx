import {
  cleanup,
  renderRouterWithProviders,
  resetStores,
  screen,
  waitFor,
} from '../test-utils';
import OrdenScreen from '@/app/(admin)/ordenes/[id]';
import MiOrdenScreen from '@/app/(cliente)/mis-ordenes/[id]';
import OrdenAsignadaScreen from '@/app/(mecanico)/ordenes-asignadas/[id]';
import { mapOrderResponse } from '@/mappers/order.mapper';
import { apiClient } from '@/services/api/client';
import { ordersService } from '@/services/orders.service';
import { formatDate } from '@/utils/formatters';

/**
 * Compatibilidad entre el contrato de MS2 (`OrdenRespuesta`) y las capas de
 * la app: DTO → mapper → modelo → servicio → vista.
 *
 * Los payloads son los ejemplos publicados en `/ms2/openapi.json`. Solo se
 * simula el cliente HTTP. Las diferencias conocidas con el contrato están
 * registradas en `docs/integracion-cruzada-ordenes.md` y quedan como
 * pendientes (`it.todo`) en lugar de fijar un comportamiento incorrecto.
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

/** Ejemplos oficiales de `OrdenRespuesta`. */
const CONTRACT_RECEIVED = {
  orden_id: 31,
  vehiculo_id: 12,
  ingreso_id: 18,
  estado_codigo: 1,
  mecanico_actual_id: null,
  creado_por_id: 99,
  creado_en: '2026-09-28T10:30:00-03:00',
  actualizado_en: '2026-09-28T10:30:00-03:00',
};

const CONTRACT_DIAGNOSIS = {
  ...CONTRACT_RECEIVED,
  estado_codigo: 2,
  mecanico_actual_id: 50,
  actualizado_en: '2026-09-28T11:00:00-03:00',
};

beforeEach(() => {
  jest.clearAllMocks();
  resetStores();
});

afterEach(() => cleanup());

describe('contrato OrdenRespuesta → mapper → modelo', () => {
  it('transforma todos los campos obligatorios del contrato', () => {
    expect(mapOrderResponse(CONTRACT_DIAGNOSIS)).toEqual({
      id: '31',
      vehicleId: '12',
      intakeId: '18',
      status: 'esperando_diagnostico',
      assignedMechanicId: '50',
      // El contrato no incluye cliente: el mapper usa creado_por_id (C3).
      clientId: '99',
      createdById: '99',
      createdAt: '2026-09-28T10:30:00-03:00',
      updatedAt: '2026-09-28T11:00:00-03:00',
    });
  });

  it('conserva un mecánico nulo del contrato como orden sin asignar', () => {
    expect(mapOrderResponse(CONTRACT_RECEIVED).assignedMechanicId).toBeNull();
  });

  it.each([
    [1, 'recibido'],
    [2, 'esperando_diagnostico'],
    [4, 'esperando_repuestos'],
    [6, 'listo_para_entrega'],
    [7, 'entregado'],
  ] as const)(
    'el código %i coincide con el catálogo oficial (%s)',
    (code, expected) => {
      expect(
        mapOrderResponse({ ...CONTRACT_RECEIVED, estado_codigo: code }).status,
      ).toBe(expected);
    },
  );

  // Pendientes del mapper de órdenes (C1 en docs/integracion-cruzada-ordenes.md).
  it.todo('el código 3 corresponde a Esperando aprobación de presupuesto');
  it.todo('el código 5 corresponde a En reparación');
  it.todo('el código 8 corresponde a Cancelado');
});

describe('contrato OrdenRespuesta → servicio', () => {
  it('getOrderById consulta la ruta oficial y devuelve el modelo', async () => {
    mockedApiClient.get.mockResolvedValueOnce({ data: CONTRACT_RECEIVED } as never);

    const order = await ordersService.getOrderById('31');

    expect(mockedApiClient.get).toHaveBeenCalledWith('/ordenes/31');
    expect(order).toEqual(mapOrderResponse(CONTRACT_RECEIVED));
  });

  it('getOrders transforma una lista con el formato del contrato', async () => {
    mockedApiClient.get.mockResolvedValueOnce({
      data: [CONTRACT_RECEIVED, { ...CONTRACT_DIAGNOSIS, orden_id: 32 }],
    } as never);

    const orders = await ordersService.getOrders();

    expect(mockedApiClient.get).toHaveBeenCalledWith('/ordenes');
    expect(orders.map((order) => [order.id, order.status])).toEqual([
      ['31', 'recibido'],
      ['32', 'esperando_diagnostico'],
    ]);
  });

  // Pendiente del servicio de órdenes (C2): PATCH /ordenes/{id}/estado con estado_destino.
  it.todo('updateOrderStatus usa PATCH /ordenes/{id}/estado con estado_destino');
});

describe('contrato OrdenRespuesta → vistas de detalle', () => {
  it.each([
    ['cliente', '/mis-ordenes/31'],
    ['mecánico', '/ordenes-asignadas/31'],
    ['administración', '/ordenes/31'],
  ] as const)(
    'la vista de %s representa el ejemplo oficial del contrato',
    async (_role, path) => {
      mockedApiClient.get.mockResolvedValueOnce({ data: CONTRACT_DIAGNOSIS } as never);

      await renderRouterWithProviders(routes, { initialUrl: path });

      await waitFor(() =>
        expect(screen.getByTestId('order-detail-31')).toBeTruthy(),
      );

      expect(
        screen.getByLabelText('Estado de la orden: Esperando diagnóstico'),
      ).toBeTruthy();
      expect(screen.getByLabelText('Vehículo: 12')).toBeTruthy();
      expect(screen.getByLabelText('Ingreso: 18')).toBeTruthy();
      expect(screen.getByLabelText('Mecánico asignado: 50')).toBeTruthy();
      expect(screen.getByLabelText('Creada por: 99')).toBeTruthy();
      expect(
        screen.getByLabelText(
          `Fecha de creación: ${formatDate(CONTRACT_DIAGNOSIS.creado_en)}`,
        ),
      ).toBeTruthy();
      expect(mockedApiClient.get).toHaveBeenCalledTimes(1);
    },
  );

  it('muestra una orden recién recibida sin mecánico asignado', async () => {
    mockedApiClient.get.mockResolvedValueOnce({ data: CONTRACT_RECEIVED } as never);

    await renderRouterWithProviders(routes, { initialUrl: '/ordenes/31' });

    await waitFor(() =>
      expect(screen.getByTestId('order-detail-31')).toBeTruthy(),
    );

    expect(screen.getByLabelText('Estado de la orden: Recibido')).toBeTruthy();
    expect(
      screen.getByLabelText('Mecánico asignado: Sin asignar'),
    ).toBeTruthy();
  });
});
