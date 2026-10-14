import { Text } from 'react-native';
import {
  AxiosError,
  type AxiosAdapter,
  type InternalAxiosRequestConfig,
} from 'axios';

import {
  cleanup,
  fireEvent,
  renderRouterWithProviders,
  resetStores,
  screen,
  waitFor,
} from '../test-utils';
import AuthLayout from '@/app/(auth)/_layout';
import ClienteLayout from '@/app/(cliente)/_layout';
import MiOrdenPresupuestoScreen from '@/app/(cliente)/mis-ordenes/[id]/presupuesto';
import { mockUserByRole } from '@/mocks/users.mock';
import { apiClient } from '@/services/api/client';
import { useAuthStore } from '@/stores/authStore';
import { STORAGE_KEYS, storage } from '@/utils/storage';

/**
 * Flujo presupuesto → decisión → aplicación en la orden con BudgetsService,
 * el cliente HTTP real, sus interceptores (token, reintentos, errores) y el
 * store de sesión. Solo se sustituye el adaptador de red de Axios, con
 * respuestas construidas según el contrato del MS3: no se contacta al
 * servicio desplegado ni se envían decisiones reales.
 */

const routes = {
  '(auth)/_layout': AuthLayout,
  '(auth)/login': () => <Text>Iniciar sesión</Text>,
  '(cliente)/_layout': ClienteLayout,
  '(cliente)/cliente': () => <Text>Portal cliente</Text>,
  '(cliente)/mis-ordenes/[id]/presupuesto': MiOrdenPresupuestoScreen,
};

const TOKEN = 'token-de-prueba';

const VERSION = {
  numero: 1,
  estado: 'enviada',
  es_modificacion: false,
  creado_por_id: 99,
  creado_en: '2026-10-09T10:00:00-03:00',
  enviado_en: '2026-10-09T12:00:00-03:00',
  bloqueada_en: '2026-10-09T12:00:00-03:00',
  total: '125000.00',
  items: [
    {
      item_id: 11,
      tipo: 'mano_de_obra',
      descripcion: 'Cambio de pastillas',
      cantidad: '1',
      precio_unitario: '125000.00',
      subtotal: '125000.00',
      repuesto_id: null,
    },
  ],
  decision: null,
};

const SUMMARY = {
  presupuesto_id: 5,
  orden_id: 31,
  creado_en: '2026-10-09T10:00:00-03:00',
  cantidad_versiones: 1,
  ultima_version: 1,
  estado_ultima_version: 'enviada',
  total_ultima_version: '125000.00',
  version_vigente: null,
};

const SENT_DETAIL = { ...SUMMARY, versiones: [VERSION] };

const APPROVED_DETAIL = {
  ...SUMMARY,
  estado_ultima_version: 'aprobada',
  version_vigente: 1,
  versiones: [
    {
      ...VERSION,
      estado: 'aprobada',
      decision: {
        decision_id: 77,
        decision: 'aprobado',
        cliente_usuario_id: 4,
        fecha_hora: '2026-10-10T15:00:00-03:00',
        motivo: null,
      },
    },
  ],
};

const PENDING_BODY = {
  detail: 'Decisión registrada; aplicación pendiente en MS2',
  decision_id: 77,
  orden_id: 31,
  decision_registrada: true,
  aplicacion_confirmada: false,
  reintento: '/presupuestos/decisiones/77/aplicacion',
  estado_ms2: null,
  detalle_ms2: null,
};

function respond(config: InternalAxiosRequestConfig, status: number, data: unknown) {
  const response = { data, status, statusText: String(status), headers: {}, config };

  if (status >= 400) {
    return Promise.reject(
      new AxiosError(
        `Request failed with status code ${status}`,
        status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST,
        config,
        null,
        response,
      ),
    );
  }

  return Promise.resolve(response);
}

function requestsTo(method: string, url: string) {
  return adapter.mock.calls.filter(
    ([config]) => config.method === method && config.url === url,
  );
}

const adapter = jest.fn<ReturnType<AxiosAdapter>, Parameters<AxiosAdapter>>();
const originalAdapter = apiClient.defaults.adapter;

beforeEach(() => {
  adapter.mockReset();
  apiClient.defaults.adapter = adapter;
  resetStores();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest
    .spyOn(storage, 'get')
    .mockImplementation(async (key) =>
      key === STORAGE_KEYS.AUTH_TOKEN ? TOKEN : null,
    );
});

afterEach(() => {
  cleanup();
  apiClient.defaults.adapter = originalAdapter;
  jest.restoreAllMocks();
});

async function renderClientBudget() {
  const view = renderRouterWithProviders(routes, {
    initialUrl: '/mis-ordenes/31/presupuesto',
    initialAuthState: {
      user: mockUserByRole.cliente,
      token: TOKEN,
      role: 'cliente',
      isAuthenticated: true,
      isLoading: false,
      isHydrated: true,
    },
  });
  await view;
  // Se envuelve: devolver el thenable desde una función async lo resolvería.
  return { view };
}

describe('flujo presupuesto → decisión → orden (cliente)', () => {
  it('decide una sola vez, reintenta la aplicación pendiente y recarga el presupuesto', async () => {
    let applied = false;

    adapter.mockImplementation((config) => {
      const key = `${config.method} ${config.url}`;

      if (key === 'get /presupuestos') return respond(config, 200, { total: 1, desde: 0, limite: 50, presupuestos: [SUMMARY] });
      if (key === 'get /presupuestos/5') return respond(config, 200, applied ? APPROVED_DETAIL : SENT_DETAIL);
      if (key === 'post /presupuestos/5/versiones/1/decision') return respond(config, 503, PENDING_BODY);
      if (key === 'post /presupuestos/decisiones/77/aplicacion') {
        applied = true;
        return respond(config, 200, { decision_id: 77, orden_id: 31, estado_aplicado: 5, historial_id: 301 });
      }
      return respond(config, 404, { detail: `No simulado: ${key}` });
    });

    await renderClientBudget();

    await waitFor(() =>
      expect(screen.getByTestId('order-budget-decision-form')).toBeTruthy(),
    );

    // La búsqueda filtra por la orden y viaja con el token de la sesión.
    const [[search]] = requestsTo('get', '/presupuestos');
    expect(search.params).toEqual({ orden_id: 31 });
    expect(search.headers.Authorization).toBe(`Bearer ${TOKEN}`);

    await fireEvent.press(screen.getByTestId('order-budget-approve'));
    await fireEvent.press(screen.getByTestId('order-budget-confirm'));

    await waitFor(() =>
      expect(screen.getByTestId('order-budget-decision-pending')).toBeTruthy(),
    );

    // Un POST no se reintenta automáticamente: la decisión se envía una vez.
    const decisions = requestsTo('post', '/presupuestos/5/versiones/1/decision');
    expect(decisions).toHaveLength(1);
    expect(JSON.parse(decisions[0][0].data)).toEqual({
      decision: 'aprobado',
      motivo: null,
      confirmar_cancelacion: false,
    });

    await fireEvent.press(screen.getByTestId('order-budget-retry-application'));

    await waitFor(() =>
      expect(screen.getByText('Tu decisión ya se aplicó en la orden.')).toBeTruthy(),
    );
    await waitFor(() =>
      expect(screen.getByLabelText('Estado del presupuesto: Aprobado')).toBeTruthy(),
    );

    expect(requestsTo('post', '/presupuestos/decisiones/77/aplicacion')).toHaveLength(1);
    expect(requestsTo('post', '/presupuestos/5/versiones/1/decision')).toHaveLength(1);
    expect(requestsTo('get', '/presupuestos/5')).toHaveLength(2);

    // La app no llama directamente a MS2: el MS3 aplica la decisión en la orden.
    expect(
      adapter.mock.calls.some(([config]) => config.url?.includes('decisiones-presupuesto')),
    ).toBe(false);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('muestra "sin presupuesto" cuando el MS3 no tiene uno para la orden', async () => {
    adapter.mockImplementation((config) =>
      respond(config, 200, { total: 0, desde: 0, limite: 50, presupuestos: [] }),
    );

    await renderClientBudget();

    await waitFor(() =>
      expect(screen.getByTestId('order-budget-empty')).toBeTruthy(),
    );
    expect(adapter).toHaveBeenCalledTimes(1);
  });

  it('un 403 del MS3 cierra la sesión (política del interceptor)', async () => {
    adapter.mockImplementation((config) =>
      respond(config, 403, { detail: 'Rol no permitido' }),
    );

    const { view } = await renderClientBudget();

    await waitFor(() => expect(view.getPathname()).toBe('/login'));
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
