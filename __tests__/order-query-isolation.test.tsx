import { act, cleanup, renderWithProviders, waitFor } from '../test-utils';
import { OrderDetailView } from '@/components/orders/OrderDetailView';
import type { WorkOrder } from '@/models/order.model';

// Dataset exclusivamente local. No acredita permisos del backend.
const order: WorkOrder = {
  id: '31', vehicleId: '12', intakeId: '18', createdById: '99',
  assignedMechanicId: '50', status: 'en_reparacion',
  createdAt: '2026-11-14T10:00:00Z', updatedAt: '2026-11-14T10:00:00Z',
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

afterEach(cleanup);

it('retira incluso el título de la orden anterior mientras cambia el ID', async () => {
  const pending = deferred<WorkOrder>();
  const load = jest.fn().mockResolvedValueOnce(order).mockReturnValueOnce(pending.promise);
  const view = await renderWithProviders(<OrderDetailView eyebrow="Cliente" orderId="31" loadOrder={load} />);
  await waitFor(() => expect(view.getByTestId('order-detail-31')).toBeTruthy());
  await view.rerender(<OrderDetailView eyebrow="Cliente" orderId="32" loadOrder={load} />);
  expect(view.queryByText('Orden 31')).toBeNull();
  expect(view.queryByTestId('order-detail-31')).toBeNull();
  await act(async () => { pending.resolve({ ...order, id: '32' }); });
  await waitFor(() => expect(view.getByTestId('order-detail-32')).toBeTruthy());
});

it('consulta el nuevo ID aunque siga pendiente el anterior y descarta su respuesta tardía', async () => {
  const old = deferred<WorkOrder>();
  const load = jest.fn().mockReturnValueOnce(old.promise).mockResolvedValueOnce({ ...order, id: '32' });
  const view = await renderWithProviders(<OrderDetailView eyebrow="Cliente" orderId="31" loadOrder={load} />);
  await view.rerender(<OrderDetailView eyebrow="Cliente" orderId="32" loadOrder={load} />);
  expect(load).toHaveBeenCalledWith('32');
  await act(async () => { old.resolve(order); });
  await waitFor(() => expect(view.getByTestId('order-detail-32')).toBeTruthy());
  expect(view.queryByTestId('order-detail-31')).toBeNull();
});

it('retira la información privada al quitar el identificador', async () => {
  const load = jest.fn().mockResolvedValue(order);
  const view = await renderWithProviders(<OrderDetailView eyebrow="Cliente" orderId="31" loadOrder={load} />);
  await waitFor(() => expect(view.getByTestId('order-detail-31')).toBeTruthy());
  await view.rerender(<OrderDetailView eyebrow="Cliente" loadOrder={load} />);
  expect(view.queryByText('Orden 31')).toBeNull();
  expect(view.getByTestId('order-detail-missing-id')).toBeTruthy();
  expect(load).toHaveBeenCalledTimes(1);
});
