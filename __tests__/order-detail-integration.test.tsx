import {
  cleanup,
  renderRouterWithProviders,
  renderWithProviders,
  resetStores,
  screen,
  waitFor,
} from '../test-utils';
import { OrderDetailView } from '@/components/orders/OrderDetailView';
import OrdenScreen from '@/app/(admin)/ordenes/[id]';
import MiOrdenScreen from '@/app/(cliente)/mis-ordenes/[id]';
import OrdenAsignadaScreen from '@/app/(mecanico)/ordenes-asignadas/[id]';
import { ordersService } from '@/services/orders.service';
import { ORDER_STATUS } from '@/constants/orderStatus';
import type { WorkOrder } from '@/models/order.model';

jest.mock('@/services/orders.service', () => ({
  ordersService: {
    getOrderById: jest.fn(),
  },
}));

const mockedService = jest.mocked(ordersService);

/**
 * Integración del detalle de órdenes con OrdersService.
 *
 * Verifica la consulta por identificador de ruta y los estados de la vista:
 * carga, detalle disponible, error del servicio, orden inexistente y
 * ruta sin identificador.
 */

const routes = {
  '(cliente)/mis-ordenes/[id]': MiOrdenScreen,
  '(mecanico)/ordenes-asignadas/[id]': OrdenAsignadaScreen,
  '(admin)/ordenes/[id]': OrdenScreen,
};

const order: WorkOrder = {
  id: 'ot-00124',
  vehicleId: 'veh-001',
  intakeId: 'ing-001',
  status: ORDER_STATUS.EN_REPARACION,
  assignedMechanicId: 'usr-002',
  clientId: 'usr-001',
  createdById: 'usr-003',
  createdAt: '2026-03-01T09:00:00.000Z',
  updatedAt: '2026-03-05T14:00:00.000Z',
};

/** Las tres rutas de detalle, una por grupo de rol. */
const SCREENS = [
  { name: 'cliente', path: '/mis-ordenes/ot-00124' },
  { name: 'mecánico', path: '/ordenes-asignadas/ot-00124' },
  { name: 'administración', path: '/ordenes/ot-00124' },
] as const;

beforeEach(() => {
  jest.clearAllMocks();
  resetStores();
});

afterEach(() => cleanup());

describe('detalle de órdenes: consulta al servicio', () => {
  it.each(SCREENS)(
    'la vista de $name consulta la orden del parámetro de ruta',
    async ({ path }) => {
      mockedService.getOrderById.mockResolvedValueOnce(order);

      const router = renderRouterWithProviders(routes, { initialUrl: path });
      await router;

      await waitFor(() =>
        expect(screen.getByTestId('order-detail-ot-00124')).toBeTruthy(),
      );

      expect(mockedService.getOrderById).toHaveBeenCalledWith('ot-00124');
      expect(mockedService.getOrderById).toHaveBeenCalledTimes(1);
    },
  );

  it('representa los datos de la orden con el estado legible', async () => {
    mockedService.getOrderById.mockResolvedValueOnce(order);

    const router = renderRouterWithProviders(routes, {
      initialUrl: '/mis-ordenes/ot-00124',
    });
    await router;

    await waitFor(() =>
      expect(screen.getByTestId('order-detail-ot-00124')).toBeTruthy(),
    );

    // El modelo guarda el código `en_reparacion`; la vista muestra la etiqueta.
    expect(
      screen.getByLabelText('Estado de la orden: En reparación'),
    ).toBeTruthy();
    expect(screen.queryByText('en_reparacion')).toBeNull();

    expect(screen.getByRole('header', { name: 'Orden ot-00124' })).toBeTruthy();
    expect(screen.getByLabelText('Vehículo: veh-001')).toBeTruthy();
    expect(screen.getByLabelText('Ingreso: ing-001')).toBeTruthy();
    expect(screen.getByLabelText('Mecánico asignado: usr-002')).toBeTruthy();
    expect(screen.getByLabelText('Cliente: usr-001')).toBeTruthy();
    expect(
      screen.getByLabelText('Fecha de creación: 01-03-2026'),
    ).toBeTruthy();
  });

  it('indica cuando la orden no tiene mecánico asignado', async () => {
    mockedService.getOrderById.mockResolvedValueOnce({
      ...order,
      id: 'ot-00125',
      status: ORDER_STATUS.ESPERANDO_DIAGNOSTICO,
      assignedMechanicId: null,
    });

    const router = renderRouterWithProviders(routes, {
      initialUrl: '/mis-ordenes/ot-00125',
    });
    await router;

    await waitFor(() =>
      expect(screen.getByTestId('order-detail-ot-00125')).toBeTruthy(),
    );

    expect(
      screen.getByLabelText('Mecánico asignado: Sin asignar'),
    ).toBeTruthy();
    expect(
      screen.getByLabelText('Estado de la orden: Esperando diagnóstico'),
    ).toBeTruthy();
  });
});

describe('detalle de órdenes: estado de carga', () => {
  it('muestra el indicador de carga mientras el servicio responde', async () => {
    let resolveQuery: (value: WorkOrder) => void = () => {};

    mockedService.getOrderById.mockReturnValueOnce(
      new Promise<WorkOrder>((resolve) => {
        resolveQuery = resolve;
      }),
    );

    const router = renderRouterWithProviders(routes, {
      initialUrl: '/mis-ordenes/ot-00124',
    });
    await router;

    expect(screen.getByTestId('order-detail-loading')).toBeTruthy();
    expect(screen.queryByTestId('order-detail-ot-00124')).toBeNull();

    resolveQuery(order);

    await waitFor(() =>
      expect(screen.getByTestId('order-detail-ot-00124')).toBeTruthy(),
    );
    expect(screen.queryByTestId('order-detail-loading')).toBeNull();
  });
});

describe('detalle de órdenes: órdenes inexistentes y errores', () => {
  it.each(SCREENS)(
    'la vista de $name informa cuando la orden no existe',
    async ({ path }) => {
      mockedService.getOrderById.mockRejectedValueOnce(
        new Error('La orden de trabajo solicitada no existe.'),
      );

      const router = renderRouterWithProviders(routes, { initialUrl: path });
      await router;

      await waitFor(() =>
        expect(screen.getByTestId('order-detail-error')).toBeTruthy(),
      );

      expect(
        screen.getByText('La orden de trabajo solicitada no existe.'),
      ).toBeTruthy();
      expect(screen.queryByTestId('order-detail-ot-00124')).toBeNull();
    },
  );

  it('propaga el mensaje de recurso no encontrado del backend', async () => {
    mockedService.getOrderById.mockRejectedValueOnce(
      new Error('El recurso solicitado no fue encontrado.'),
    );

    const router = renderRouterWithProviders(routes, {
      initialUrl: '/ordenes/ot-99999',
    });
    await router;

    await waitFor(() =>
      expect(screen.getByTestId('order-detail-error')).toBeTruthy(),
    );

    expect(
      screen.getByText('El recurso solicitado no fue encontrado.'),
    ).toBeTruthy();
  });

  it('usa un mensaje propio si el error no aporta ninguno', async () => {
    mockedService.getOrderById.mockRejectedValueOnce(new Error(''));

    const router = renderRouterWithProviders(routes, {
      initialUrl: '/mis-ordenes/ot-00124',
    });
    await router;

    await waitFor(() =>
      expect(screen.getByTestId('order-detail-error')).toBeTruthy(),
    );

    expect(
      screen.getByText('No fue posible cargar la orden de trabajo.'),
    ).toBeTruthy();
  });

  // El parámetro `[id]` siempre aporta un segmento cuando la ruta coincide,
  // por lo que esta rama defensiva se verifica sobre el componente.
  it('no consulta al servicio si no se indica ninguna orden', async () => {
    const view = await renderWithProviders(
      <OrderDetailView
        eyebrow="Portal del cliente"
        orderId={undefined}
        loadOrder={mockedService.getOrderById}
      />,
    );

    expect(view.getByTestId('order-detail-missing-id')).toBeTruthy();
    expect(view.queryByTestId('order-detail-loading')).toBeNull();
    expect(mockedService.getOrderById).not.toHaveBeenCalled();
  });
});
