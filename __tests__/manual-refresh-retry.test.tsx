import {
  cleanup,
  fireEvent,
  renderWithProviders,
  waitFor,
} from '../test-utils';
import { OrderDetailView } from '@/components/orders/OrderDetailView';
import { VehicleListView } from '@/components/vehicles/VehicleListView';
import { ORDER_STATUS } from '@/constants/orderStatus';
import type { Vehicle } from '@/models/vehicle.model';
import type { WorkOrder } from '@/models/order.model';

/**
 * Actualización manual y reintento ante errores de consulta.
 *
 * El reintento automático ante fallos transitorios de red lo aplica el
 * cliente HTTP (verificado en `retry-policy.test.ts`). Aquí se comprueba el
 * comportamiento de la interfaz: volver a consultar a petición de la persona,
 * sin ocultar los datos ya cargados, sin peticiones duplicadas y sin
 * reintentos en bucle.
 *
 * Las vistas se montan directamente porque el mecanismo de consulta vive en
 * ellas y en `useDataQuery`; su conexión con las rutas está cubierta en
 * `vehicle-list-integration.test.tsx` y `order-detail-integration.test.tsx`.
 */

const vehicle: Vehicle = {
  id: 'veh-001',
  plate: 'ABCD12',
  brand: 'Toyota',
  model: 'Corolla',
  year: 2019,
  mileage: 85120,
  ownerId: 'usr-001',
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

/** Promesa controlable para observar el estado intermedio de una consulta. */
function deferred<T>() {
  let resolve: (value: T) => void = () => {};

  const promise = new Promise<T>((res) => {
    resolve = res;
  });

  return { promise, resolve };
}

// Cada prueba monta su propia vista: se desmonta al terminar para que las
// consultas pendientes no alcancen al render siguiente.
afterEach(() => cleanup());

function renderVehicleList(loadVehicles: () => Promise<Vehicle[]>) {
  return renderWithProviders(
    <VehicleListView
      eyebrow="Portal del cliente"
      title="Mis vehículos"
      subtitle="Vehículos registrados a tu nombre en el taller."
      emptyMessage="Todavía no tienes vehículos registrados en el taller."
      loadVehicles={loadVehicles}
    />,
  );
}

function renderOrderDetail(loadOrder: (id: string) => Promise<WorkOrder>) {
  return renderWithProviders(
    <OrderDetailView
      eyebrow="Portal del cliente"
      orderId="ot-00124"
      loadOrder={loadOrder}
    />,
  );
}

describe('reintento ante errores de consulta', () => {
  it('no reintenta por su cuenta: una consulta fallida se realiza una sola vez', async () => {
    const loadVehicles = jest
      .fn<Promise<Vehicle[]>, []>()
      .mockRejectedValueOnce(
        new Error('Backend no disponible o sin conexión a internet.'),
      );

    const view = await renderVehicleList(loadVehicles);

    await waitFor(() =>
      expect(view.getByTestId('vehicle-list-error')).toBeTruthy(),
    );

    expect(loadVehicles).toHaveBeenCalledTimes(1);
  });

  it('el listado de vehículos ofrece reintentar y recupera los datos', async () => {
    const loadVehicles = jest
      .fn<Promise<Vehicle[]>, []>()
      .mockRejectedValueOnce(new Error('Backend no disponible.'))
      .mockResolvedValueOnce([vehicle]);

    const view = await renderVehicleList(loadVehicles);

    await waitFor(() =>
      expect(view.getByTestId('vehicle-list-error')).toBeTruthy(),
    );

    fireEvent.press(view.getByRole('button', { name: 'Reintentar' }));

    await waitFor(() =>
      expect(view.getByTestId('vehicle-card-veh-001')).toBeTruthy(),
    );

    expect(loadVehicles).toHaveBeenCalledTimes(2);
    expect(view.queryByTestId('vehicle-list-error')).toBeNull();
  });

  it('el detalle de la orden ofrece reintentar y recupera los datos', async () => {
    const loadOrder = jest
      .fn<Promise<WorkOrder>, [string]>()
      .mockRejectedValueOnce(new Error('Tiempo de espera agotado.'))
      .mockResolvedValueOnce(order);

    const view = await renderOrderDetail(loadOrder);

    await waitFor(() =>
      expect(view.getByTestId('order-detail-error')).toBeTruthy(),
    );

    fireEvent.press(view.getByRole('button', { name: 'Reintentar' }));

    await waitFor(() =>
      expect(view.getByTestId('order-detail-ot-00124')).toBeTruthy(),
    );

    expect(loadOrder).toHaveBeenCalledTimes(2);
    expect(loadOrder).toHaveBeenLastCalledWith('ot-00124');
  });

  it('vuelve a mostrar el error si el reintento también falla', async () => {
    const loadVehicles = jest
      .fn<Promise<Vehicle[]>, []>()
      .mockRejectedValueOnce(new Error('Backend no disponible.'))
      .mockRejectedValueOnce(new Error('Backend sigue sin responder.'));

    const view = await renderVehicleList(loadVehicles);

    await waitFor(() =>
      expect(view.getByTestId('vehicle-list-error')).toBeTruthy(),
    );

    fireEvent.press(view.getByRole('button', { name: 'Reintentar' }));

    await waitFor(() =>
      expect(view.getByText('Backend sigue sin responder.')).toBeTruthy(),
    );

    expect(loadVehicles).toHaveBeenCalledTimes(2);
  });
});

describe('actualización manual', () => {
  it('actualizar vuelve a consultar sin ocultar los datos ya cargados', async () => {
    const second = deferred<Vehicle[]>();
    const loadVehicles = jest
      .fn<Promise<Vehicle[]>, []>()
      .mockResolvedValueOnce([vehicle])
      .mockReturnValueOnce(second.promise);

    const view = await renderVehicleList(loadVehicles);

    await waitFor(() =>
      expect(view.getByTestId('vehicle-card-veh-001')).toBeTruthy(),
    );

    fireEvent.press(view.getByTestId('vehicle-list-refresh'));

    // El control anuncia que está ocupado y queda deshabilitado.
    await waitFor(() =>
      expect(
        view.getByTestId('vehicle-list-refresh').props.accessibilityState,
      ).toMatchObject({ busy: true, disabled: true }),
    );

    // Durante la actualización el listado permanece visible y no se muestra
    // el indicador de carga inicial.
    expect(view.getByTestId('vehicle-card-veh-001')).toBeTruthy();
    expect(view.queryByTestId('vehicle-list-loading')).toBeNull();

    second.resolve([{ ...vehicle, id: 'veh-002', plate: 'EFGH34' }]);

    await waitFor(() =>
      expect(view.getByTestId('vehicle-card-veh-002')).toBeTruthy(),
    );

    expect(
      view.getByTestId('vehicle-list-refresh').props.accessibilityState,
    ).toMatchObject({ busy: false, disabled: false });
    expect(loadVehicles).toHaveBeenCalledTimes(2);
  });

  it('el detalle de la orden admite actualización manual', async () => {
    const loadOrder = jest
      .fn<Promise<WorkOrder>, [string]>()
      .mockResolvedValueOnce(order)
      .mockResolvedValueOnce({
        ...order,
        status: ORDER_STATUS.LISTO_PARA_ENTREGA,
      });

    const view = await renderOrderDetail(loadOrder);

    await waitFor(() =>
      expect(
        view.getByLabelText('Estado de la orden: En reparación'),
      ).toBeTruthy(),
    );

    fireEvent.press(view.getByTestId('order-detail-refresh'));

    await waitFor(() =>
      expect(
        view.getByLabelText('Estado de la orden: Listo para entrega'),
      ).toBeTruthy(),
    );

    expect(loadOrder).toHaveBeenCalledTimes(2);
  });

  it('permite actualizar desde el estado vacío del listado', async () => {
    const loadVehicles = jest
      .fn<Promise<Vehicle[]>, []>()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([vehicle]);

    const view = await renderVehicleList(loadVehicles);

    await waitFor(() =>
      expect(view.getByTestId('vehicle-list-empty')).toBeTruthy(),
    );

    fireEvent.press(view.getByRole('button', { name: 'Actualizar' }));

    await waitFor(() =>
      expect(view.getByTestId('vehicle-card-veh-001')).toBeTruthy(),
    );

    expect(loadVehicles).toHaveBeenCalledTimes(2);
  });
});

describe('prevención de peticiones duplicadas', () => {
  /**
   * La guarda que descarta consultas solapadas vive en `useDataQuery` y se
   * verifica en detalle en `use-data-query.test.ts`. Aquí se comprueba que el
   * control de la vista queda deshabilitado mientras la consulta está en
   * curso, de modo que no pueda dispararse de nuevo.
   */
  it('deshabilita el control de actualización mientras la consulta está en curso', async () => {
    const second = deferred<Vehicle[]>();
    const loadVehicles = jest
      .fn<Promise<Vehicle[]>, []>()
      .mockResolvedValueOnce([vehicle])
      .mockReturnValueOnce(second.promise);

    const view = await renderVehicleList(loadVehicles);

    await waitFor(() =>
      expect(view.getByTestId('vehicle-card-veh-001')).toBeTruthy(),
    );

    fireEvent.press(view.getByTestId('vehicle-list-refresh'));

    await waitFor(() =>
      expect(
        view.getByTestId('vehicle-list-refresh').props.accessibilityState,
      ).toMatchObject({ busy: true, disabled: true }),
    );

    expect(loadVehicles).toHaveBeenCalledTimes(2);

    second.resolve([vehicle]);

    await waitFor(() =>
      expect(
        view.getByTestId('vehicle-list-refresh').props.accessibilityState,
      ).toMatchObject({ busy: false, disabled: false }),
    );
  });
});
