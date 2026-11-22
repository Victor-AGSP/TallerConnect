import { cleanup, fireEvent, renderRouterWithProviders, resetStores, screen, waitFor } from '../test-utils';
import VehicleScreen from '@/app/(cliente)/vehiculos/[id]';
import OrderScreen from '@/app/(cliente)/ordenes/[id]';
import { ordersService } from '@/services/orders.service';
import { vehiclesService } from '@/services/vehicles.service';
import type { WorkOrder } from '@/models/order.model';
import type { Vehicle } from '@/models/vehicle.model';

jest.mock('@/services/orders.service', () => ({ ordersService: { getOrders: jest.fn(), getOrderById: jest.fn() } }));
jest.mock('@/services/vehicles.service', () => ({ vehiclesService: { getVehicleById: jest.fn() } }));
const orders = jest.mocked(ordersService);
const vehicles = jest.mocked(vehiclesService);
// Dataset local controlado; backend/autorización de propiedad no se simulan como validados.
const vehicle: Vehicle = { id: '12', ownerId: '4', plate: 'QA0012', brand: 'QA', model: 'Local', year: 2026, mileage: 0 };
const own: WorkOrder = {
  id: '31', vehicleId: '12', intakeId: '18', createdById: '99',
  assignedMechanicId: '50', status: 'en_reparacion',
  createdAt: '2026-11-14T10:00:00Z', updatedAt: '2026-11-14T10:00:00Z',
};
const other = { ...own, id: '32', vehicleId: '13' };
const routes = { '(cliente)/vehiculos/[id]': VehicleScreen, '(cliente)/ordenes/[id]': OrderScreen };
const open = async () => {
  await renderRouterWithProviders(routes, { initialUrl: '/vehiculos/12' });
  await waitFor(() => expect(screen.getByTestId('vehicle-detail')).toBeTruthy());
};

beforeEach(() => {
  resetStores(); jest.resetAllMocks();
  vehicles.getVehicleById.mockResolvedValue(vehicle);
  orders.getOrders.mockResolvedValue([own, other]);
  orders.getOrderById.mockResolvedValue(own);
});
afterEach(cleanup);

it('lista solo órdenes del vehículo consultado y abre el detalle propio aunque otro usuario lo creó', async () => {
  await open();
  expect(screen.getByTestId('vehicle-order-31')).toBeTruthy();
  expect(screen.queryByTestId('vehicle-order-32')).toBeNull();
  await fireEvent.press(screen.getByTestId('vehicle-order-31'));
  await waitFor(() => expect(screen).toHavePathname('/ordenes/31'));
  await waitFor(() => expect(screen.getByTestId('order-detail')).toBeTruthy());
  expect(orders.getOrderById).toHaveBeenCalledWith('31');
});

it('el detalle directo ajeno rechazado no muestra datos ni consulta el vehículo', async () => {
  orders.getOrderById.mockRejectedValueOnce(new Error('HTTP 403: sin permiso sobre esta orden'));
  await renderRouterWithProviders(routes, { initialUrl: '/ordenes/32' });
  await waitFor(() => expect(screen.getByTestId('order-detail-error')).toBeTruthy());
  expect(screen.queryByTestId('order-detail')).toBeNull();
  expect(vehicles.getVehicleById).not.toHaveBeenCalled();
});

it('distingue una lista vacía válida sin registros demo', async () => {
  orders.getOrders.mockResolvedValueOnce([]);
  await open();
  expect(screen.getByTestId('vehicle-detail-orders-empty')).toBeTruthy();
  expect(screen.queryByTestId('vehicle-order-31')).toBeNull();
  expect(screen.queryByTestId('vehicle-detail-orders-error')).toBeNull();
});

it.each([401, 403, 503])('HTTP %s de órdenes muestra error recuperable, sin declararlo vacío', async (status) => {
  orders.getOrders.mockRejectedValueOnce(new Error(`HTTP ${status}`));
  await open();
  expect(screen.getByTestId('vehicle-detail-orders-error')).toBeTruthy();
  expect(screen.queryByTestId('vehicle-detail-orders-empty')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
  await waitFor(() => expect(screen.getByTestId('vehicle-order-31')).toBeTruthy());
  expect(orders.getOrders).toHaveBeenCalledTimes(2);
});

it('refresh sustituye el listado y reabrir consulta nuevamente el servicio', async () => {
  await open();
  orders.getOrders.mockResolvedValue([]);
  await fireEvent.press(screen.getByTestId('vehicle-detail-refresh'));
  await waitFor(() => expect(screen.getByTestId('vehicle-detail-orders-empty')).toBeTruthy());
  expect(screen.queryByTestId('vehicle-order-31')).toBeNull();
  await cleanup();
  orders.getOrders.mockResolvedValue([own]);
  await open();
  expect(screen.getByTestId('vehicle-order-31')).toBeTruthy();
  expect(orders.getOrders).toHaveBeenCalledTimes(3);
});

it('un refresh denegado retira las órdenes anteriores', async () => {
  await open();
  orders.getOrders.mockRejectedValueOnce(new Error('HTTP 403'));
  await fireEvent.press(screen.getByTestId('vehicle-detail-refresh'));
  await waitFor(() => expect(screen.getByTestId('vehicle-detail-orders-error')).toBeTruthy());
  expect(screen.queryByTestId('vehicle-order-31')).toBeNull();
});
