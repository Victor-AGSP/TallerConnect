import { renderWithProviders, screen, waitFor } from '../test-utils';
import MisVehiculosScreen from '@/app/(cliente)/mis-vehiculos';
import { apiClient } from '@/services/api/client';
import { ServiceError } from '@/services/service-error';
import { EvidenceServiceError, evidenceService } from '@/services/evidence.service';
import { ordersService } from '@/services/orders.service';
import { vehiclesService } from '@/services/vehicles.service';
import { evidenceResponsePayloads } from '@/mocks/payloads/evidence.payload';
import { orderResponsePayloads } from '@/mocks/payloads/order.payload';
import { vehicleResponsePayloads } from '@/mocks/payloads/vehicle.payload';

/**
 * SCRUM-162 — Regresión: un fallo nunca debe llegar a la UI como lista vacía.
 *
 * Se recorre cada consulta de listado usada por las pantallas (vehículos,
 * órdenes, historial de órdenes y evidencias MS4) con siete respuestas:
 * 200 vacío, 200 con datos, 500, 503, timeout, sin conectividad y cuerpo
 * fuera de contrato. Solo un 200 con arreglo vacío puede resolver `[]`.
 * Se reemplaza únicamente `apiClient`: servicios, adaptadores reales y
 * mappers son los de producción.
 */

jest.mock('@/services/api/client', () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn() },
}));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useRouter: () => ({ push: mockPush }),
}));

const get = jest.mocked(apiClient.get);

const httpError = (status: number) => ({
  isAxiosError: true,
  message: `Request failed with status code ${status}`,
  response: { status, data: {} },
});
const timeoutError = () => ({
  isAxiosError: true,
  code: 'ECONNABORTED',
  message: 'timeout of 15000ms exceeded',
});
const networkError = () => ({ isAxiosError: true, message: 'Network Error' });

/** Cuerpos 200 que no cumplen el contrato de una lista (p. ej. página HTML de un proxy). */
const INVALID_BODIES: [string, unknown][] = [
  ['página HTML', '<!doctype html><html><body>Error</body></html>'],
  ['objeto con detail', { detail: 'upstream error' }],
  ['null', null],
];

/**
 * Las evidencias MS4 usan su propio `EvidenceServiceError` (con `outcome` para
 * reintentos) en lugar de `ServiceError`; ambos se reconocen aquí por sus campos
 * públicos para no acoplar la regresión a una única clase de error.
 */
type ListError = ServiceError | EvidenceServiceError;

function isDomainError(error: unknown): error is ListError {
  return error instanceof ServiceError || error instanceof EvidenceServiceError;
}

function failureKind(error: ListError): 'timeout' | 'network' | number | undefined {
  if (error instanceof ServiceError) {
    if (error.isTimeout) return 'timeout';
    if (error.isNetworkError) return 'network';
    return error.status;
  }
  if (error.code === 'EVIDENCE_TIMEOUT') return 'timeout';
  if (error.code === 'EVIDENCE_NETWORK_ERROR') return 'network';
  return error.status;
}

async function rejection(run: () => Promise<unknown>): Promise<ListError> {
  const outcome = await run().then(
    (value) => ({ resolved: value }),
    (error: unknown) => ({ error }),
  );
  if (!('error' in outcome)) {
    throw new Error(`Se esperaba un rechazo y se resolvió: ${JSON.stringify(outcome.resolved)}`);
  }
  expect(isDomainError(outcome.error)).toBe(true);
  return outcome.error as ListError;
}

const evidenceOrderId = evidenceResponsePayloads.fotoDiagnostico.orden_id;

const LIST_QUERIES = [
  {
    name: 'vehículos del cliente (GET /vehiculos)',
    run: () => vehiclesService.getMyVehicles(),
    sample: [vehicleResponsePayloads.completo],
  },
  {
    name: 'vehículos asignados (GET /vehiculos/asignados)',
    run: () => vehiclesService.getAssignedVehicles(),
    sample: [vehicleResponsePayloads.completo],
  },
  {
    name: 'órdenes (GET /ordenes)',
    run: () => ordersService.getOrders(),
    sample: [orderResponsePayloads.recibido],
  },
  {
    name: 'historial de orden (GET /ordenes/{id}/historial)',
    run: () => ordersService.getOrderHistory(31),
    sample: [
      {
        historial_id: 1,
        orden_id: 31,
        estado_anterior: 1,
        estado_nuevo: 2,
        actor_usuario_id: 50,
        origen: 'usuario',
        fecha_hora: '2026-09-28T11:00:00-03:00',
        observacion: null,
      },
    ],
  },
  {
    name: 'evidencias MS4 (GET /evidencias?orden_id)',
    run: () => evidenceService.listEvidence(String(evidenceOrderId)),
    sample: [evidenceResponsePayloads.fotoDiagnostico],
  },
] as const;

beforeEach(() => {
  jest.resetAllMocks();
});

describe.each(LIST_QUERIES)('Servicio: $name', ({ run, sample }) => {
  it('HTTP 200 con arreglo vacío resuelve una lista vacía', async () => {
    get.mockResolvedValueOnce({ data: [] } as never);
    await expect(run()).resolves.toEqual([]);
  });

  it('HTTP 200 con datos resuelve los elementos mapeados', async () => {
    get.mockResolvedValueOnce({ data: sample } as never);
    await expect(run()).resolves.toHaveLength(1);
  });

  it.each([500, 503])('HTTP %i se rechaza con su estado, no como lista vacía', async (status) => {
    get.mockRejectedValueOnce(httpError(status));
    expect(failureKind(await rejection(run))).toBe(status);
  });

  it('timeout se rechaza marcado como timeout', async () => {
    get.mockRejectedValueOnce(timeoutError());
    expect(failureKind(await rejection(run))).toBe('timeout');
  });

  it('error de conectividad se rechaza marcado como error de red', async () => {
    get.mockRejectedValueOnce(networkError());
    expect(failureKind(await rejection(run))).toBe('network');
  });

  it.each(INVALID_BODIES)('HTTP 200 con %s se rechaza como respuesta inválida', async (_label, body) => {
    get.mockResolvedValueOnce({ data: body } as never);
    await rejection(run);
  });
});

describe('UI: Mis vehículos distingue vacío de fallo', () => {
  async function renderList() {
    await renderWithProviders(<MisVehiculosScreen />);
    await waitFor(() => expect(screen.queryByTestId('vehicle-list-loading')).toBeNull());
  }

  it('200 vacío muestra el estado sin vehículos y ningún error', async () => {
    get.mockResolvedValueOnce({ data: [] } as never);
    await renderList();
    expect(screen.getByTestId('vehicle-list-empty')).toBeTruthy();
    expect(screen.queryByTestId('vehicle-list-error')).toBeNull();
  });

  it('200 con datos muestra los vehículos', async () => {
    get.mockResolvedValueOnce({ data: [vehicleResponsePayloads.completo] } as never);
    await renderList();
    expect(screen.getByTestId('vehicle-card-1')).toBeTruthy();
    expect(screen.queryByTestId('vehicle-list-empty')).toBeNull();
  });

  it.each([
    ['HTTP 503', () => get.mockRejectedValueOnce(httpError(503))],
    ['timeout', () => get.mockRejectedValueOnce(timeoutError())],
    ['sin conectividad', () => get.mockRejectedValueOnce(networkError())],
    ['respuesta inválida', () => get.mockResolvedValueOnce({ data: { detail: 'x' } } as never)],
  ])('%s muestra error con reintento y no el estado vacío', async (_label, arrange) => {
    arrange();
    await renderList();
    expect(screen.getByTestId('vehicle-list-error')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy();
    expect(screen.queryByTestId('vehicle-list-empty')).toBeNull();
    expect(screen.queryByText('Sin vehículos')).toBeNull();
  });
});
