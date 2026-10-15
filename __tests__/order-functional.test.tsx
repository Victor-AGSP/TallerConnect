import * as SecureStore from 'expo-secure-store';
import { router as appRouter, type Href } from 'expo-router';
import {
  AxiosError,
  AxiosHeaders,
  type AxiosAdapter,
  type InternalAxiosRequestConfig,
} from 'axios';

import {
  act,
  cleanup,
  fireEvent,
  renderRouterWithProviders,
  resetStores,
  screen,
  waitFor,
} from '../test-utils';
import AdminLayout from '@/app/(admin)/_layout';
import AdminScreen from '@/app/(admin)/administrador';
import OrdenScreen from '@/app/(admin)/ordenes/[id]';
import OrdenPresupuestoScreen from '@/app/(admin)/ordenes/[id]/presupuesto';
import AuthLayout from '@/app/(auth)/_layout';
import LoginScreen from '@/app/(auth)/login';
import ClienteLayout from '@/app/(cliente)/_layout';
import ClienteScreen from '@/app/(cliente)/cliente';
import MiOrdenScreen from '@/app/(cliente)/mis-ordenes/[id]';
import MiOrdenPresupuestoScreen from '@/app/(cliente)/mis-ordenes/[id]/presupuesto';
import IndexScreen from '@/app/index';
import MecanicoLayout from '@/app/(mecanico)/_layout';
import MecanicoScreen from '@/app/(mecanico)/mecanico';
import OrdenAsignadaScreen from '@/app/(mecanico)/ordenes-asignadas/[id]';
import { mockAuthResponses } from '@/mocks/auth.mock';
import { apiClient } from '@/services/api/client';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/stores/authStore';

/**
 * Pruebas funcionales automatizadas del módulo de órdenes (Jest, sin
 * emulador ni dispositivo).
 *
 * Recorren el caso de uso "consultar una orden de trabajo" con las pantallas,
 * layouts, store de sesión, OrdersService, cliente HTTP e interceptores
 * reales. Se simulan AuthService (como en `auth-full-flow.test.tsx`), el
 * almacenamiento seguro (en memoria) y el adaptador de red de Axios.
 *
 * Ninguna vista enlaza todavía al detalle de una orden, por lo que la
 * navegación hacia él se hace por ruta, como lo haría un enlace profundo.
 * Desde el detalle, el presupuesto (MS3) se abre con "Ver presupuesto".
 * Las respuestas del MS3 se construyen según su contrato: no se contacta al
 * servicio desplegado ni se envían decisiones reales.
 */

const secureStore = new Map<string, string>();

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('@/services/auth.service', () => ({
  authService: { login: jest.fn() },
}));

const login = jest.mocked(authService.login);

const routes = {
  index: IndexScreen,
  '(auth)/_layout': AuthLayout,
  '(auth)/login': LoginScreen,
  '(admin)/_layout': AdminLayout,
  '(admin)/administrador': AdminScreen,
  '(admin)/ordenes/[id]': OrdenScreen,
  '(admin)/ordenes/[id]/presupuesto': OrdenPresupuestoScreen,
  '(cliente)/_layout': ClienteLayout,
  '(cliente)/cliente': ClienteScreen,
  '(cliente)/mis-ordenes/[id]': MiOrdenScreen,
  '(cliente)/mis-ordenes/[id]/presupuesto': MiOrdenPresupuestoScreen,
  '(mecanico)/_layout': MecanicoLayout,
  '(mecanico)/mecanico': MecanicoScreen,
  '(mecanico)/ordenes-asignadas/[id]': OrdenAsignadaScreen,
};

const roleCases = [
  ['cliente', '/cliente', 'Mi taller', '/mis-ordenes/31'],
  ['mecanico', '/mecanico', 'Mis órdenes', '/ordenes-asignadas/31'],
  ['administrador', '/administrador', 'Panel del taller', '/ordenes/31'],
] as const;

type OrderPath = (typeof roleCases)[number][3];

/**
 * Abre el detalle de la orden por ruta, como un enlace profundo. Las rutas
 * tipadas (`.expo/types`) se generan localmente y pueden no incluir aún las
 * pantallas de detalle, por eso la ruta se pasa como `Href`.
 */
async function openOrder(path: OrderPath) {
  await act(async () => {
    appRouter.push(path as Href);
  });
}

/** Ejemplo oficial de `OrdenRespuesta` (MS2). */
const CONTRACT_ORDER = {
  orden_id: 31,
  vehiculo_id: 12,
  ingreso_id: 18,
  estado_codigo: 2,
  mecanico_actual_id: 50,
  creado_por_id: 99,
  creado_en: '2026-09-28T10:30:00-03:00',
  actualizado_en: '2026-09-28T11:00:00-03:00',
};

function ok(config: InternalAxiosRequestConfig, data: unknown) {
  return Promise.resolve({
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  });
}

function timeout(config: InternalAxiosRequestConfig) {
  return Promise.reject(
    new AxiosError(
      'timeout of 15000ms exceeded',
      AxiosError.ECONNABORTED,
      config,
    ),
  );
}

const adapter = jest.fn<ReturnType<AxiosAdapter>, Parameters<AxiosAdapter>>();
const originalAdapter = apiClient.defaults.adapter;

async function loginAs(role: (typeof roleCases)[number][0]) {
  const response = mockAuthResponses[role];
  login.mockResolvedValueOnce(response);

  await fireEvent.changeText(
    screen.getByTestId('login-email'),
    response.user.email,
  );
  await fireEvent.changeText(
    screen.getByTestId('login-password'),
    'clave-segura',
  );
  await fireEvent.press(screen.getByTestId('login-submit'));

  return response;
}

function authorizationOf(call: Parameters<AxiosAdapter>) {
  return AxiosHeaders.from(call[0].headers).get('Authorization');
}

beforeEach(() => {
  resetStores();
  secureStore.clear();
  jest
    .mocked(SecureStore.getItemAsync)
    .mockImplementation(async (key) => secureStore.get(key) ?? null);
  jest
    .mocked(SecureStore.setItemAsync)
    .mockImplementation(async (key, value) => {
      secureStore.set(key, value);
    });
  jest
    .mocked(SecureStore.deleteItemAsync)
    .mockImplementation(async (key) => {
      secureStore.delete(key);
    });
  login.mockReset();
  adapter.mockReset();
  apiClient.defaults.adapter = adapter;
});

afterEach(() => {
  cleanup();
  apiClient.defaults.adapter = originalAdapter;
  jest.restoreAllMocks();
});

describe('caso de uso: consultar una orden de trabajo', () => {
  it.each(roleCases)(
    'el rol %s inicia sesión, consulta y actualiza una orden, vuelve al panel y cierra la sesión',
    async (role, home, heading, orderPath) => {
      adapter
        .mockImplementationOnce((config) => ok(config, CONTRACT_ORDER))
        .mockImplementationOnce((config) =>
          ok(config, {
            ...CONTRACT_ORDER,
            estado_codigo: 4,
            actualizado_en: '2026-09-29T09:00:00-03:00',
          }),
        );

      const router = renderRouterWithProviders(routes, {
        initialUrl: '/login',
      });
      await router;

      const session = await loginAs(role);

      await waitFor(() => expect(router.getPathname()).toBe(home));
      expect(screen.getByText(heading)).toBeTruthy();
      expect(adapter).not.toHaveBeenCalled();

      await openOrder(orderPath);

      await waitFor(() =>
        expect(screen.getByTestId('order-detail-31')).toBeTruthy(),
      );
      expect(router.getPathname()).toBe(orderPath);
      expect(
        screen.getByLabelText('Estado de la orden: Esperando diagnóstico'),
      ).toBeTruthy();
      expect(screen.getByLabelText('Vehículo: 12')).toBeTruthy();
      expect(screen.getByLabelText('Mecánico asignado: 50')).toBeTruthy();

      // La petición usa el token que dejó el login en el almacenamiento.
      expect(adapter.mock.calls[0][0].url).toBe('/ordenes/31');
      expect(authorizationOf(adapter.mock.calls[0])).toBe(
        `Bearer ${session.token}`,
      );

      await fireEvent.press(screen.getByRole('button', { name: 'Actualizar' }));

      await waitFor(() =>
        expect(
          screen.getByLabelText('Estado de la orden: Esperando repuestos'),
        ).toBeTruthy(),
      );
      expect(adapter).toHaveBeenCalledTimes(2);

      await act(async () => {
        appRouter.back();
      });

      await waitFor(() => expect(router.getPathname()).toBe(home));
      expect(screen.getByText(heading)).toBeTruthy();

      await fireEvent.press(screen.getByText('Cerrar sesión'));

      await waitFor(() => expect(router.getPathname()).toBe('/login'));

      // Tras cerrar la sesión el detalle ya no es accesible ni se consulta.
      await openOrder(orderPath);

      await waitFor(() => expect(router.getPathname()).toBe('/login'));
      expect(screen.queryByTestId('order-detail-31')).toBeNull();
      expect(adapter).toHaveBeenCalledTimes(2);
    },
  );

  it('el cliente recupera la orden reintentando tras agotarse los reintentos automáticos', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    // Petición inicial y los dos reintentos automáticos de GET (retry.ts).
    adapter
      .mockImplementationOnce(timeout)
      .mockImplementationOnce(timeout)
      .mockImplementationOnce(timeout)
      .mockImplementationOnce((config) => ok(config, CONTRACT_ORDER));

    const router = renderRouterWithProviders(routes, {
      initialUrl: '/login',
    });
    await router;

    await loginAs('cliente');
    await waitFor(() => expect(router.getPathname()).toBe('/cliente'));

    await openOrder('/mis-ordenes/31');

    expect(screen.getByTestId('order-detail-loading')).toBeTruthy();

    // renderRouter usa temporizadores simulados: se avanza el backoff (1 s + 2 s).
    await act(async () => {
      await jest.advanceTimersByTimeAsync(3000);
    });

    await waitFor(() =>
      expect(
        screen.getByText(
          'Tiempo de espera agotado. El servidor tardó demasiado en responder.',
        ),
      ).toBeTruthy(),
    );
    expect(adapter).toHaveBeenCalledTimes(3);

    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));

    await waitFor(() =>
      expect(screen.getByTestId('order-detail-31')).toBeTruthy(),
    );
    expect(screen.queryByTestId('order-detail-error')).toBeNull();
    expect(adapter).toHaveBeenCalledTimes(4);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* Caso de uso: decidir el presupuesto de una orden (MS2 + MS3)        */
/* ------------------------------------------------------------------ */

const BUDGET_SUMMARY = {
  presupuesto_id: 5,
  orden_id: 31,
  creado_en: '2026-10-09T10:00:00-03:00',
  cantidad_versiones: 1,
  ultima_version: 1,
  estado_ultima_version: 'enviada',
  total_ultima_version: '125000.00',
  version_vigente: null,
};

const SENT_VERSION = {
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
      tipo: 'repuesto',
      descripcion: 'Pastillas de freno delanteras',
      cantidad: '2',
      precio_unitario: '32500.00',
      subtotal: '65000.00',
      repuesto_id: 8,
      repuesto_nombre: 'Pastillas de freno',
      proveedor_nombre: 'Frenos Chile',
    },
    {
      item_id: 12,
      tipo: 'mano_de_obra',
      descripcion: 'Cambio de pastillas',
      cantidad: '1',
      precio_unitario: '60000.00',
      subtotal: '60000.00',
      repuesto_id: null,
    },
  ],
  decision: null,
};

function decidedBudget(decision: 'aprobado' | 'rechazado', motivo: string | null) {
  return {
    ...BUDGET_SUMMARY,
    estado_ultima_version: decision === 'aprobado' ? 'aprobada' : 'rechazada',
    version_vigente: decision === 'aprobado' ? 1 : null,
    versiones: [
      {
        ...SENT_VERSION,
        estado: decision === 'aprobado' ? 'aprobada' : 'rechazada',
        decision: {
          decision_id: 77,
          decision,
          cliente_usuario_id: 4,
          fecha_hora: '2026-10-10T15:00:00-03:00',
          motivo,
        },
      },
    ],
  };
}

const DECISION_URL = '/presupuestos/5/versiones/1/decision';
const APPLICATION_URL = '/presupuestos/decisiones/77/aplicacion';

const PENDING_BODY = {
  detail: 'Decisión registrada; aplicación pendiente en MS2',
  decision_id: 77,
  orden_id: 31,
  decision_registrada: true,
  aplicacion_confirmada: false,
  reintento: APPLICATION_URL,
  estado_ms2: null,
  detalle_ms2: null,
};

function fail(config: InternalAxiosRequestConfig, status: number, data: unknown) {
  return Promise.reject(
    new AxiosError(
      `Request failed with status code ${status}`,
      status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST,
      config,
      null,
      { data, status, statusText: String(status), headers: {}, config },
    ),
  );
}

type Handler = (
  config: InternalAxiosRequestConfig,
) => ReturnType<AxiosAdapter>;

/**
 * Backend simulado con estado: MS2 (orden 31) y MS3 (presupuesto 5).
 * `decision` y `application` permiten definir cada respuesta en orden.
 */
function backend({
  decision = [],
  application = [],
}: {
  decision?: Handler[];
  application?: Handler[];
}) {
  const state: { decided: null | { decision: 'aprobado' | 'rechazado'; motivo: string | null } } = {
    decided: null,
  };
  let decisionCalls = 0;
  let applicationCalls = 0;

  adapter.mockImplementation((config) => {
    const key = `${config.method} ${config.url}`;

    if (key === 'get /ordenes/31') {
      return ok(config, {
        ...CONTRACT_ORDER,
        estado_codigo: state.decided?.decision === 'aprobado' ? 4 : 3,
      });
    }
    if (key === 'get /presupuestos') {
      return ok(config, { total: 1, desde: 0, limite: 50, presupuestos: [BUDGET_SUMMARY] });
    }
    if (key === 'get /presupuestos/5') {
      return ok(
        config,
        state.decided
          ? decidedBudget(state.decided.decision, state.decided.motivo)
          : { ...BUDGET_SUMMARY, versiones: [SENT_VERSION] },
      );
    }
    if (key === `post ${DECISION_URL}`) {
      const body = JSON.parse(config.data);
      const handler = decision[decisionCalls++];
      const result = handler(config);
      // Solo una respuesta 2xx o el 503 con decision_id registran la decisión.
      return result.then(
        (response) => {
          state.decided = { decision: body.decision, motivo: body.motivo };
          return response;
        },
        (error: AxiosError<{ decision_id?: number }>) => {
          if (error.response?.data?.decision_id) {
            state.decided = { decision: body.decision, motivo: body.motivo };
          }
          throw error;
        },
      );
    }
    if (key === `post ${APPLICATION_URL}`) {
      return application[applicationCalls++](config);
    }

    return fail(config, 404, { detail: `No simulado: ${key}` });
  });
}

function decisionResult(efecto: string, faltantes: unknown[] = []): Handler {
  return (config) =>
    ok(config, {
      presupuesto: decidedBudget(efecto === 'cancelado' ? 'rechazado' : 'aprobado', null),
      efecto_en_orden: efecto,
      repuestos_faltantes: faltantes,
      decision_id: 77,
      aplicacion_en_orden: null,
    });
}

function requestsTo(method: string, url: string) {
  return adapter.mock.calls.filter(
    ([config]) => config.method === method && config.url === url,
  );
}

/** login → panel → detalle de la orden → presupuesto. */
async function openBudgetAsClient() {
  const router = renderRouterWithProviders(routes, { initialUrl: '/login' });
  await router;

  const session = await loginAs('cliente');
  await waitFor(() => expect(router.getPathname()).toBe('/cliente'));

  await openOrder('/mis-ordenes/31');
  await waitFor(() =>
    expect(screen.getByTestId('order-detail-31')).toBeTruthy(),
  );

  await fireEvent.press(screen.getByRole('button', { name: 'Ver presupuesto' }));

  await waitFor(() =>
    expect(screen.getByTestId('order-budget-decision-form')).toBeTruthy(),
  );
  expect(router.getPathname()).toBe('/mis-ordenes/31/presupuesto');

  return { router, session };
}

describe('caso de uso: decidir el presupuesto de una orden', () => {
  it('el cliente aprueba el presupuesto tras confirmar y la orden refleja la decisión', async () => {
    backend({
      decision: [
        decisionResult('esperando_repuestos', [
          { repuesto_id: 8, nombre: 'Pastillas de freno', requerido: '2', disponible: 0 },
        ]),
      ],
    });

    const { router, session } = await openBudgetAsClient();

    expect(screen.getByLabelText('Total del presupuesto: $125.000')).toBeTruthy();
    expect(
      screen.getByLabelText('Estado del presupuesto: Esperando decisión'),
    ).toBeTruthy();

    // Sin confirmar no se envía nada.
    await fireEvent.press(screen.getByRole('button', { name: 'Aprobar presupuesto' }));
    expect(requestsTo('post', DECISION_URL)).toHaveLength(0);

    await fireEvent.press(screen.getByRole('button', { name: 'Confirmar aprobación' }));

    await waitFor(() =>
      expect(
        screen.getByText('Presupuesto aprobado. La orden queda esperando repuestos.'),
      ).toBeTruthy(),
    );
    expect(screen.getByText('Pastillas de freno: se requieren 2, hay 0')).toBeTruthy();
    await waitFor(() =>
      expect(screen.getByLabelText('Estado del presupuesto: Aprobado')).toBeTruthy(),
    );

    const [decision] = requestsTo('post', DECISION_URL);
    expect(JSON.parse(decision[0].data as string)).toEqual({
      decision: 'aprobado',
      motivo: null,
      confirmar_cancelacion: false,
    });
    expect(authorizationOf(decision)).toBe(`Bearer ${session.token}`);

    // De vuelta en la orden, al actualizar se ve el estado aplicado por MS2.
    await act(async () => {
      appRouter.back();
    });
    await waitFor(() => expect(router.getPathname()).toBe('/mis-ordenes/31'));

    await fireEvent.press(screen.getByRole('button', { name: 'Actualizar' }));

    await waitFor(() =>
      expect(
        screen.getByLabelText('Estado de la orden: Esperando repuestos'),
      ).toBeTruthy(),
    );

    expect(requestsTo('post', DECISION_URL)).toHaveLength(1);
    expect(
      adapter.mock.calls.some(([config]) => config.url?.includes('decisiones-presupuesto')),
    ).toBe(false);
  });

  it('el rechazo exige motivo, advierte la cancelación y puede deshacerse antes de confirmar', async () => {
    backend({ decision: [decisionResult('cancelado')] });

    await openBudgetAsClient();

    await fireEvent.press(screen.getByRole('button', { name: 'Rechazar presupuesto' }));
    expect(screen.getByText('Indica el motivo del rechazo.')).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('order-budget-reason'), 'Muy caro');
    await fireEvent.press(screen.getByRole('button', { name: 'Rechazar presupuesto' }));
    expect(
      screen.getByText('¿Confirmas que rechazas el presupuesto y cancelas el servicio?'),
    ).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Volver' }));
    expect(requestsTo('post', DECISION_URL)).toHaveLength(0);

    await fireEvent.press(screen.getByRole('button', { name: 'Rechazar presupuesto' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Confirmar rechazo' }));

    await waitFor(() =>
      expect(
        screen.getByText('Presupuesto rechazado. El servicio de la orden fue cancelado.'),
      ).toBeTruthy(),
    );

    const decisions = requestsTo('post', DECISION_URL);
    expect(decisions).toHaveLength(1);
    expect(JSON.parse(decisions[0][0].data as string)).toEqual({
      decision: 'rechazado',
      motivo: 'Muy caro',
      confirmar_cancelacion: true,
    });
  });

  it('un error del MS3 no se reintenta automáticamente y el cliente puede volver a intentarlo', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    backend({
      decision: [
        (config) => fail(config, 503, { detail: 'MS2 no disponible' }),
        decisionResult('en_reparacion'),
      ],
    });

    await openBudgetAsClient();

    await fireEvent.press(screen.getByRole('button', { name: 'Aprobar presupuesto' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Confirmar aprobación' }));

    await waitFor(() =>
      expect(screen.getByText('MS2 no disponible')).toBeTruthy(),
    );
    // Un POST nunca pasa por el reintento automático (retry.ts).
    expect(requestsTo('post', DECISION_URL)).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Aprobar presupuesto' })).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Aprobar presupuesto' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Confirmar aprobación' }));

    await waitFor(() =>
      expect(
        screen.getByText('Presupuesto aprobado. La orden pasa a reparación.'),
      ).toBeTruthy(),
    );
    expect(requestsTo('post', DECISION_URL)).toHaveLength(2);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('una aplicación pendiente se reintenta sin duplicar la decisión', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    backend({
      decision: [(config) => fail(config, 503, PENDING_BODY)],
      application: [
        (config) => fail(config, 503, PENDING_BODY),
        (config) =>
          ok(config, { decision_id: 77, orden_id: 31, estado_aplicado: 4, historial_id: 300 }),
      ],
    });

    await openBudgetAsClient();

    await fireEvent.press(screen.getByRole('button', { name: 'Aprobar presupuesto' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Confirmar aprobación' }));

    await waitFor(() =>
      expect(screen.getByTestId('order-budget-decision-pending')).toBeTruthy(),
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar aplicación' }));
    await waitFor(() =>
      expect(requestsTo('post', APPLICATION_URL)).toHaveLength(1),
    );
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Reintentar aplicación' }).props
          .accessibilityState,
      ).toMatchObject({ busy: false }),
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar aplicación' }));

    await waitFor(() =>
      expect(screen.getByText('Tu decisión ya se aplicó en la orden.')).toBeTruthy(),
    );
    await waitFor(() =>
      expect(screen.getByLabelText('Estado del presupuesto: Aprobado')).toBeTruthy(),
    );

    expect(requestsTo('post', APPLICATION_URL)).toHaveLength(2);
    expect(requestsTo('post', DECISION_URL)).toHaveLength(1);
  });

  it('una decisión registrada no puede volver a enviarse', async () => {
    backend({ decision: [decisionResult('en_reparacion')] });

    await openBudgetAsClient();

    await fireEvent.press(screen.getByRole('button', { name: 'Aprobar presupuesto' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Confirmar aprobación' }));

    await waitFor(() =>
      expect(screen.getByLabelText('Estado del presupuesto: Aprobado')).toBeTruthy(),
    );

    // La versión ya decidida no ofrece acciones de decisión.
    expect(screen.queryByTestId('order-budget-decision-form')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Aprobar presupuesto' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Confirmar aprobación' })).toBeNull();

    // Ni al recargar el presupuesto.
    await fireEvent.press(screen.getByTestId('order-budget-refresh'));
    await waitFor(() =>
      expect(requestsTo('get', '/presupuestos/5')).toHaveLength(3),
    );
    expect(screen.queryByTestId('order-budget-decision-form')).toBeNull();
    expect(requestsTo('post', DECISION_URL)).toHaveLength(1);
  });

  // Pendiente: la doble pulsación con la decisión aún en curso. El botón de
  // confirmar se deshabilita mientras `loading`, pero su manejador devuelve la
  // promesa del envío y el fireEvent de las pruebas la convierte en un act()
  // asíncrono que no puede solaparse con una segunda pulsación.
  it.todo('una doble pulsación de confirmar con la decisión en curso envía una sola decisión');

  it('el presupuesto se recupera con el reintento manual tras agotarse los reintentos automáticos', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    backend({});
    const ms3 = adapter.getMockImplementation()!;
    let budgetTimeouts = 3;
    adapter.mockImplementation((config) =>
      config.url === '/presupuestos' && budgetTimeouts-- > 0
        ? timeout(config)
        : ms3(config),
    );

    const router = renderRouterWithProviders(routes, { initialUrl: '/login' });
    await router;
    await loginAs('cliente');
    await waitFor(() => expect(router.getPathname()).toBe('/cliente'));

    await openOrder('/mis-ordenes/31');
    await waitFor(() =>
      expect(screen.getByTestId('order-detail-31')).toBeTruthy(),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Ver presupuesto' }));

    expect(screen.getByTestId('order-budget-loading')).toBeTruthy();

    // Backoff de los dos reintentos automáticos de GET (1 s + 2 s).
    await act(async () => {
      await jest.advanceTimersByTimeAsync(3000);
    });

    await waitFor(() =>
      expect(
        screen.getByText(
          'Tiempo de espera agotado. El servidor tardó demasiado en responder.',
        ),
      ).toBeTruthy(),
    );
    expect(requestsTo('get', '/presupuestos')).toHaveLength(3);

    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));

    await waitFor(() =>
      expect(screen.getByTestId('order-budget-decision-form')).toBeTruthy(),
    );
    expect(requestsTo('get', '/presupuestos')).toHaveLength(4);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });
});
