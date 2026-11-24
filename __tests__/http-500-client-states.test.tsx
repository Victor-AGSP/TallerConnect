import { fireEvent, renderWithProviders, screen, waitFor } from '../test-utils';
import MisVehiculosScreen from '@/app/(cliente)/mis-vehiculos';
import ClienteVehicleDetailScreen from '@/app/(cliente)/vehiculos/[id]';
import MiOrdenPresupuestoScreen from '@/app/(cliente)/mis-ordenes/[id]/presupuesto';
import { OrderEvidenceList } from '@/components/evidence/OrderEvidenceList';
import { apiClient } from '@/services/api/client';
import { vehicleResponsePayloads } from '@/mocks/payloads/vehicle.payload';

/**
 * SCRUM-224 — Comportamiento observable del portal Cliente ante HTTP 500.
 *
 * Para cada consulta de listado del Cliente se comprueba que un 500:
 *  - se informa como error con su mensaje normalizado,
 *  - no muestra el estado vacío ni su texto de «sin registros»,
 *  - ofrece «Reintentar», y
 *  - tras reintentar con un 200 vacío real, sí aparece el estado vacío.
 * Solo se sustituye `apiClient`; rutas, servicios y mappers son reales.
 */

jest.mock('@/services/api/client', () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn() },
}));

const mockParams = jest.fn((): { id?: string } => ({}));
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => mockParams(),
}));

const get = jest.mocked(apiClient.get);

const SERVER_ERROR_MESSAGE = 'Error interno en el servidor. Intenta nuevamente más tarde.';
const http500 = () => ({
  isAxiosError: true,
  message: 'Request failed with status code 500',
  response: { status: 500, data: {} },
});

/** Responde por URL; cada valor puede ser una cola de respuestas sucesivas. */
function routeGets(routes: Record<string, (() => unknown)[]>) {
  get.mockImplementation(async (url: string) => {
    const queue = routes[url];
    if (!queue || queue.length === 0) throw new Error(`GET no esperado: ${url}`);
    const next = queue.length > 1 ? queue.shift()! : queue[0];
    return next() as never;
  });
}
const ok = (data: unknown) => () => ({ data });
const fail500 = () => () => Promise.reject(http500());

function callsTo(url: string) {
  return get.mock.calls.filter(([called]) => called === url).length;
}

async function pressRetry() {
  await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
}

beforeEach(() => {
  jest.resetAllMocks();
  mockParams.mockReturnValue({});
});

describe('HTTP 500 en Mis vehículos', () => {
  it('muestra error con reintento y no el vacío; al reintentar con 200 vacío aparece el vacío real', async () => {
    routeGets({ '/vehiculos': [fail500(), ok([])] });
    await renderWithProviders(<MisVehiculosScreen />);

    await waitFor(() => expect(screen.getByTestId('vehicle-list-error')).toBeTruthy());
    expect(screen.getByTestId('vehicle-list-error')).toHaveTextContent(SERVER_ERROR_MESSAGE, { exact: false });
    expect(screen.queryByTestId('vehicle-list-empty')).toBeNull();
    expect(screen.queryByText('Sin vehículos')).toBeNull();

    await pressRetry();

    await waitFor(() => expect(screen.getByTestId('vehicle-list-empty')).toBeTruthy());
    expect(screen.queryByTestId('vehicle-list-error')).toBeNull();
    expect(callsTo('/vehiculos')).toBe(2);
  });

  it('se recupera con datos al reintentar', async () => {
    routeGets({ '/vehiculos': [fail500(), ok([vehicleResponsePayloads.completo])] });
    await renderWithProviders(<MisVehiculosScreen />);
    await waitFor(() => expect(screen.getByTestId('vehicle-list-error')).toBeTruthy());

    await pressRetry();

    await waitFor(() => expect(screen.getByTestId('vehicle-card-1')).toBeTruthy());
    expect(screen.queryByTestId('vehicle-list-error')).toBeNull();
  });
});

describe('HTTP 500 en las órdenes del detalle de vehículo', () => {
  beforeEach(() => mockParams.mockReturnValue({ id: '1' }));

  it('informa el fallo de órdenes sin decir «No hay órdenes asociadas»', async () => {
    routeGets({ '/vehiculos/1': [ok(vehicleResponsePayloads.completo)], '/ordenes': [fail500(), ok([])] });
    await renderWithProviders(<ClienteVehicleDetailScreen />);

    await waitFor(() => expect(screen.getByTestId('vehicle-detail-orders-error')).toBeTruthy());
    expect(screen.getByText('No se pudieron consultar las órdenes.')).toBeTruthy();
    expect(screen.queryByText('No hay órdenes asociadas.')).toBeNull();
    expect(screen.queryByTestId('vehicle-detail-orders-empty')).toBeNull();
    // El vehículo sigue visible: el fallo es parcial.
    expect(screen.getAllByText(/ABCD/).length).toBeGreaterThan(0);

    await pressRetry();

    await waitFor(() => expect(screen.getByTestId('vehicle-detail-orders-empty')).toBeTruthy());
    expect(screen.getByText('No hay órdenes asociadas.')).toBeTruthy();
    expect(callsTo('/ordenes')).toBe(2);
  });
});

describe('HTTP 500 en evidencias MS4 de una orden', () => {
  it('muestra error y no «Sin evidencias»; al reintentar con 200 vacío sí lo muestra', async () => {
    routeGets({ '/evidencias': [fail500(), ok([])] });
    await renderWithProviders(<OrderEvidenceList orderId="102" role="cliente" />);
    await fireEvent.press(screen.getByTestId('order-evidence-show'));

    await waitFor(() => expect(screen.getByTestId('order-evidence-error')).toBeTruthy());
    expect(screen.queryByTestId('order-evidence-empty')).toBeNull();
    expect(screen.queryByText('Sin evidencias')).toBeNull();

    await pressRetry();

    await waitFor(() => expect(screen.getByTestId('order-evidence-empty')).toBeTruthy());
    expect(screen.queryByTestId('order-evidence-error')).toBeNull();
  });
});

describe('HTTP 500 en el presupuesto de una orden (MS3)', () => {
  beforeEach(() => mockParams.mockReturnValue({ id: '987' }));

  it('muestra error y no el vacío; al reintentar con lista vacía real aparece el vacío', async () => {
    routeGets({ '/presupuestos': [fail500(), ok({ presupuestos: [], total: 0 })] });
    await renderWithProviders(<MiOrdenPresupuestoScreen />);

    await waitFor(() => expect(screen.getByTestId('order-budget-error')).toBeTruthy());
    expect(screen.queryByTestId('order-budget-empty')).toBeNull();

    await pressRetry();

    await waitFor(() => expect(screen.getByTestId('order-budget-empty')).toBeTruthy());
    expect(screen.queryByTestId('order-budget-error')).toBeNull();
  });
});
