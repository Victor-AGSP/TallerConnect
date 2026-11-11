import { act, fireEvent, renderWithProviders, screen, waitFor } from '../test-utils';
import AdministradorScreen from '@/app/(admin)/administrador';
import AdminOrdersScreen from '@/app/(admin)/ordenes/index';
import { ordersService } from '@/services/orders.service';
import { vehiclesService } from '@/services/vehicles.service';
import { notificationsService } from '@/services/notifications.service';
import type { WorkOrder } from '@/models/order.model';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));
jest.mock('@/services/orders.service', () => ({ ordersService: { getOrders: jest.fn() } }));
jest.mock('@/services/vehicles.service', () => ({ vehiclesService: { getVehicles: jest.fn() } }));
jest.mock('@/services/notifications.service', () => ({ notificationsService: { getNotifications: jest.fn() } }));

const getOrders = jest.mocked(ordersService.getOrders);

beforeEach(() => {
  getOrders.mockReset().mockResolvedValue([]);
  jest.mocked(vehiclesService.getVehicles).mockReset().mockResolvedValue([]);
  jest.mocked(notificationsService.getNotifications).mockReset().mockResolvedValue([]);
});

it.each([AdministradorScreen, AdminOrdersScreen])(
  '%p espera la respuesta antes de mostrar un resultado vacío',
  async (Screen) => {
    let resolveOrders!: (orders: WorkOrder[]) => void;
    getOrders.mockReturnValueOnce(new Promise((resolve) => { resolveOrders = resolve; }));
    await renderWithProviders(<Screen />);
    expect(screen.getByText(/Cargando/)).toBeTruthy();
    await act(async () => resolveOrders([]));
    await waitFor(() => expect(screen.queryByText(/Cargando/)).toBeNull());
    expect(screen.queryByText('No se pudieron cargar las órdenes')).toBeNull();
    expect(getOrders).toHaveBeenCalledTimes(1);
  },
);

it.each([AdministradorScreen, AdminOrdersScreen])(
  '%p permite reintentar una consulta fallida sin error de estado',
  async (Screen) => {
    getOrders.mockRejectedValueOnce(new Error('Fallo de consulta QA'));
    await renderWithProviders(<Screen />);
    expect(await screen.findByText('Fallo de consulta QA')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(screen.queryByText('Fallo de consulta QA')).toBeNull());
    expect(getOrders).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(screen.queryByText(/Cargando/)).toBeNull());
  },
);
