import { Text } from 'react-native';
import { router as appRouter } from 'expo-router';
import {
  AxiosError,
  type AxiosAdapter,
  type AxiosResponse,
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
import OrdenScreen from '@/app/(admin)/ordenes/[id]';
import AuthLayout from '@/app/(auth)/_layout';
import ClienteLayout from '@/app/(cliente)/_layout';
import MiOrdenScreen from '@/app/(cliente)/mis-ordenes/[id]';
import MecanicoLayout from '@/app/(mecanico)/_layout';
import OrdenAsignadaScreen from '@/app/(mecanico)/ordenes-asignadas/[id]';
import type { UserRole } from '@/constants/roles';
import { mockUserByRole } from '@/mocks/users.mock';
import type { WorkOrder } from '@/models/order.model';
import { apiClient } from '@/services/api/client';
import { ordersService } from '@/services/orders.service';
import { useAuthStore } from '@/stores/authStore';
import { STORAGE_KEYS, storage } from '@/utils/storage';

jest.mock('expo-image-picker', () => ({
  getCameraPermissionsAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock('@/services/orders.service', () => ({
  ordersService: { getOrderById: jest.fn() },
}));

jest.mock('@/services/order-log.service', () => ({
  orderLogService: { getOrderLog: jest.fn(async () => []), addOrderLogEntry: jest.fn() },
}));

const mockedOrders = jest.mocked(ordersService);

/**
 * SCRUM-112: visualización de evidencias según el rol.
 *
 * Layouts reales (RoleGuard), EvidenceService y el cliente HTTP real con sus
 * interceptores. Solo se sustituye el adaptador de red: las respuestas
 * representan lo que MS4 decide para cada solicitante según su contrato
 * (cliente: solo visibles; personal: no eliminadas; administrador: todas;
 * fuera de alcance: 404). La autorización efectiva la aplica el servidor: estas
 * pruebas verifican cómo la app consulta, filtra y presenta esas respuestas.
 */

const routes = {
  '(auth)/_layout': AuthLayout,
  '(auth)/login': () => <Text>Iniciar sesión</Text>,
  '(admin)/_layout': AdminLayout,
  '(admin)/administrador': () => <Text>Panel administrador</Text>,
  '(admin)/ordenes/[id]': OrdenScreen,
  '(cliente)/_layout': ClienteLayout,
  '(cliente)/cliente': () => <Text>Portal cliente</Text>,
  '(cliente)/mis-ordenes/[id]': MiOrdenScreen,
  '(mecanico)/_layout': MecanicoLayout,
  '(mecanico)/mecanico': () => <Text>Panel mecánico</Text>,
  '(mecanico)/ordenes-asignadas/[id]': OrdenAsignadaScreen,
};

const PATH_BY_ROLE: Record<UserRole, string> = {
  cliente: '/mis-ordenes/31',
  mecanico: '/ordenes-asignadas/31',
  administrador: '/ordenes/31',
};

const ID_VISIBLE = '11111111-1111-4111-8111-111111111111';
const ID_HIDDEN = '22222222-2222-4222-8222-222222222222';
const ID_DELETED = '33333333-3333-4333-8333-333333333333';
const ID_VIDEO = '44444444-4444-4444-8444-444444444444';

function dto(id: string, overrides: Record<string, unknown> = {}) {
  return {
    evidencia_id: id,
    orden_id: 31,
    presupuesto_id: null,
    contexto: 'reparacion',
    tipo_archivo: 'foto',
    visible_cliente: true,
    estado: 'confirmada',
    nombre_original: `foto-${id.slice(0, 4)}.jpg`,
    content_type: 'image/jpeg',
    tamano_bytes: 204800,
    creada_en: '2026-10-28T15:00:00Z',
    ...overrides,
  };
}

const VISIBLE = dto(ID_VISIBLE, { contexto: 'diagnostico' });
const HIDDEN = dto(ID_HIDDEN, { visible_cliente: false });
const DELETED = dto(ID_DELETED, { estado: 'eliminada', visible_cliente: false });

function order(id = '31'): WorkOrder {
  return {
    id,
    vehicleId: '12',
    intakeId: '18',
    createdById: '99',
    status: 'en_reparacion',
    assignedMechanicId: '50',
    createdAt: '2026-10-09T10:00:00-03:00',
    updatedAt: '2026-10-09T12:00:00-03:00',
  };
}

type Handler = (config: InternalAxiosRequestConfig) => Promise<AxiosResponse>;

const adapter = jest.fn<ReturnType<AxiosAdapter>, Parameters<AxiosAdapter>>();
const originalAdapter = apiClient.defaults.adapter;
let handlers: Handler[] = [];

function ok(data: unknown): Handler {
  return (config) =>
    Promise.resolve({ data, status: 200, statusText: '200', headers: {}, config } as AxiosResponse);
}

function fail(status: number, data: unknown = {}): Handler {
  return (config) =>
    Promise.reject(
      new AxiosError(
        `Request failed with status code ${status}`,
        'ERR_BAD_REQUEST',
        config,
        null,
        { data, status, statusText: String(status), headers: {}, config } as AxiosResponse,
      ),
    );
}

function requests(pattern: RegExp) {
  return adapter.mock.calls.filter(([config]) => pattern.test(config.url ?? ''));
}

let view: ReturnType<typeof renderRouterWithProviders>;

async function openAs(role: UserRole | null, path?: string) {
  view = renderRouterWithProviders(routes, {
    initialUrl: path ?? (role ? PATH_BY_ROLE[role] : '/mis-ordenes/31'),
    initialAuthState: role
      ? {
          user: mockUserByRole[role],
          token: 'token-de-prueba',
          role,
          isAuthenticated: true,
          isLoading: false,
          isHydrated: true,
        }
      : { isAuthenticated: false, isLoading: false, isHydrated: true },
  });
  await view;
}

async function showEvidence() {
  await waitFor(() => expect(screen.getByTestId('order-evidence-show')).toBeTruthy());
  await fireEvent.press(screen.getByTestId('order-evidence-show'));
}

beforeEach(() => {
  jest.resetAllMocks();
  resetStores();
  handlers = [];
  adapter.mockImplementation((config) => {
    const handler = handlers.shift();
    if (!handler) throw new Error(`Solicitud inesperada: ${config.method} ${config.url}`);
    return handler(config);
  });
  apiClient.defaults.adapter = adapter;
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest
    .spyOn(storage, 'get')
    .mockImplementation(async (key: string) =>
      key === STORAGE_KEYS.AUTH_TOKEN ? 'token-de-prueba' : null,
    );
  mockedOrders.getOrderById.mockImplementation(async (id) => order(String(id)));
});

afterEach(() => {
  jest.restoreAllMocks();
  cleanup();
});

afterAll(() => {
  apiClient.defaults.adapter = originalAdapter;
});

describe('Visualización de evidencias por rol', () => {
  it.each<UserRole>(['cliente', 'mecanico', 'administrador'])(
    'abrir la orden como %s no consulta evidencias hasta que se piden',
    async (role) => {
      await openAs(role);
      await waitFor(() => expect(screen.getByTestId('order-evidence-show')).toBeTruthy());

      expect(requests(/evidencias/)).toHaveLength(0);
    },
  );

  it('mecánico asignado: ve las evidencias con su visibilidad y estado', async () => {
    handlers.push(ok([VISIBLE, HIDDEN]));
    await openAs('mecanico');
    await showEvidence();

    await waitFor(() => expect(screen.getByTestId(`order-evidence-${ID_VISIBLE}`)).toBeTruthy());
    expect(screen.getByTestId(`order-evidence-${ID_HIDDEN}`)).toBeTruthy();
    const [config] = requests(/evidencias/)[0];
    expect(config.params).toEqual({ orden_id: 31 });
    expect(config.headers.Authorization).toBe('Bearer token-de-prueba');
    expect(screen.getByText(/^Diagnóstico · .+ · 200 KB$/)).toBeTruthy();
    expect(screen.getAllByText(/Visible para el cliente: (Sí|No) · Estado: confirmada/)).toHaveLength(2);
  });

  it('mecánico no asignado: el 404 de MS4 se informa sin mostrar evidencias', async () => {
    handlers.push(fail(404));
    await openAs('mecanico');
    await showEvidence();

    await waitFor(() =>
      expect(
        screen.getByText('La orden no existe o no tienes acceso a sus evidencias.'),
      ).toBeTruthy(),
    );
    expect(screen.queryByTestId(`order-evidence-${ID_VISIBLE}`)).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('cliente propietario: ve solo las visibles y sin datos internos', async () => {
    // Aunque el servidor incluyera una no visible, la app no la muestra.
    handlers.push(ok([VISIBLE, HIDDEN]));
    await openAs('cliente');
    await showEvidence();

    await waitFor(() => expect(screen.getByTestId(`order-evidence-${ID_VISIBLE}`)).toBeTruthy());
    expect(screen.queryByTestId(`order-evidence-${ID_HIDDEN}`)).toBeNull();
    expect(screen.queryByText(/Visible para el cliente/)).toBeNull();
    expect(screen.queryByText(/Estado:/)).toBeNull();
  });

  it('cliente ajeno: el 404 de MS4 se informa', async () => {
    handlers.push(fail(404, { detail: 'La orden no existe o no pertenece al solicitante' }));
    await openAs('cliente');
    await showEvidence();

    await waitFor(() =>
      expect(screen.getByText('La orden no existe o no pertenece al solicitante')).toBeTruthy(),
    );
  });

  it('administrador: ve también las eliminadas con su estado', async () => {
    handlers.push(ok([VISIBLE, DELETED]));
    await openAs('administrador');
    await showEvidence();

    await waitFor(() => expect(screen.getByTestId(`order-evidence-${ID_DELETED}`)).toBeTruthy());
    expect(screen.getByText(/Estado: eliminada/)).toBeTruthy();
  });

  it('sin sesión la ruta redirige al login y no consulta evidencias', async () => {
    await openAs(null, '/mis-ordenes/31');

    await waitFor(() => expect(view.getPathname()).toBe('/login'));
    expect(adapter).not.toHaveBeenCalled();
  });

  it.each<[UserRole, string]>([
    ['cliente', '/ordenes-asignadas/31'],
    ['cliente', '/ordenes/31'],
    ['mecanico', '/mis-ordenes/31'],
  ])('%s no accede a %s: la guarda redirige sin solicitudes', async (role, path) => {
    await openAs(role, path);

    await waitFor(() => expect(view.getPathname()).not.toBe(path));
    expect(screen.queryByTestId('order-evidence-list')).toBeNull();
    expect(adapter).not.toHaveBeenCalled();
  });

  it('sesión expirada: el 401 cierra la sesión', async () => {
    handlers.push(fail(401, { detail: 'Token expirado' }));
    await openAs('cliente');
    await showEvidence();

    await waitFor(() => expect(useAuthStore.getState().isAuthenticated).toBe(false));
  });

  it('un 403 se informa sin cerrar la sesión', async () => {
    handlers.push(fail(403));
    await openAs('cliente');
    await showEvidence();

    await waitFor(() =>
      expect(screen.getByText('No tienes permisos para ver las evidencias de esta orden.')).toBeTruthy(),
    );
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(view.getPathname()).toBe('/mis-ordenes/31');
  });

  it('una lista vacía se muestra como tal', async () => {
    handlers.push(ok([]));
    await openAs('cliente');
    await showEvidence();

    await waitFor(() => expect(screen.getByTestId('order-evidence-empty')).toBeTruthy());
  });

  it.each([
    ['fuera de contrato', { evidencias: [] }],
    ['con evidencias de otra orden', [VISIBLE, dto(ID_HIDDEN, { orden_id: 32 })]],
  ])('una respuesta %s no muestra nada y permite reintentar', async (_label, body) => {
    handlers.push(ok(body));
    handlers.push(ok([VISIBLE]));
    await openAs('mecanico');
    await showEvidence();

    await waitFor(() =>
      expect(screen.getByText('La respuesta del servicio de evidencias no es válida.')).toBeTruthy(),
    );
    expect(screen.queryByTestId(`order-evidence-${ID_VISIBLE}`)).toBeNull();

    await fireEvent.press(screen.getByText('Reintentar'));
    await waitFor(() => expect(screen.getByTestId(`order-evidence-${ID_VISIBLE}`)).toBeTruthy());
  });

  it('actualiza la lista a petición', async () => {
    handlers.push(ok([VISIBLE]));
    handlers.push(ok([VISIBLE, dto(ID_HIDDEN)]));
    await openAs('cliente');
    await showEvidence();
    await waitFor(() => expect(screen.getByTestId(`order-evidence-${ID_VISIBLE}`)).toBeTruthy());

    await fireEvent.press(screen.getByTestId('order-evidence-refresh'));

    await waitFor(() => expect(screen.getByTestId(`order-evidence-${ID_HIDDEN}`)).toBeTruthy());
  });

  it('al cambiar de orden no conserva evidencias ni fotografías de la anterior', async () => {
    handlers.push(ok([VISIBLE]));
    handlers.push(ok({ url: 'https://storage.example/firmada-31', expira_en: 300 }));
    await openAs('mecanico');
    await showEvidence();
    await waitFor(() => expect(screen.getByTestId(`order-evidence-view-${ID_VISIBLE}`)).toBeTruthy());
    await fireEvent.press(screen.getByTestId(`order-evidence-view-${ID_VISIBLE}`));
    await waitFor(() => expect(screen.getByTestId(`order-evidence-photo-${ID_VISIBLE}`)).toBeTruthy());

    await act(async () => {
      appRouter.setParams({ id: '32' });
    });
    await waitFor(() => expect(screen.getByText('Fotografías registradas para la orden 32.')).toBeTruthy());

    expect(screen.queryByTestId(`order-evidence-${ID_VISIBLE}`)).toBeNull();
    expect(screen.queryByTestId(`order-evidence-photo-${ID_VISIBLE}`)).toBeNull();
    expect(screen.getByTestId('order-evidence-show')).toBeTruthy();
  });
});

/** URI mostrada por la imagen (el host de expo-image recibe una lista de fuentes). */
function shownUri(testID: string): string | undefined {
  const source = screen.getByTestId(testID).props.source;
  return (Array.isArray(source) ? source[0] : source)?.uri;
}

describe('Fotografías con URL prefirmada', () => {
  const PRESIGNED = 'https://storage.example/evidencias/firmada?X-Amz-Signature=abc';

  async function openList() {
    // La lista se responde antes que las descargas que la prueba ya encoló.
    handlers.unshift(ok([VISIBLE, dto(ID_VIDEO, { content_type: 'video/mp4', tipo_archivo: 'video', nombre_original: 'clip.mp4' })]));
    await openAs('cliente');
    await showEvidence();
    await waitFor(() => expect(screen.getByTestId(`order-evidence-view-${ID_VISIBLE}`)).toBeTruthy());
  }

  it('pide la URL al ver la fotografía y la muestra sin caché', async () => {
    handlers.push(ok({ url: PRESIGNED, expira_en: 300 }));
    await openList();

    await fireEvent.press(screen.getByTestId(`order-evidence-view-${ID_VISIBLE}`));

    await waitFor(() => expect(screen.getByTestId(`order-evidence-photo-${ID_VISIBLE}`)).toBeTruthy());
    expect(shownUri(`order-evidence-photo-${ID_VISIBLE}`)).toBe(PRESIGNED);
    expect(requests(/descarga/)[0][0].url).toBe(`/evidencias/${ID_VISIBLE}/descarga`);
    // La URL no se expone en textos ni etiquetas accesibles.
    expect(screen.queryByText(new RegExp('X-Amz'))).toBeNull();
    expect(screen.queryByLabelText(new RegExp('X-Amz'))).toBeNull();
  });

  it('no muestra en línea archivos que no son fotografías', async () => {
    await openList();

    expect(screen.queryByTestId(`order-evidence-view-${ID_VIDEO}`)).toBeNull();
    expect(screen.getByText('Este archivo no es una fotografía y no se muestra en la aplicación.')).toBeTruthy();
  });

  it('reutiliza la URL vigente y pide otra cuando caducó', async () => {
    handlers.push(ok({ url: PRESIGNED, expira_en: 60 }));
    handlers.push(ok({ url: `${PRESIGNED}&nueva=1`, expira_en: 60 }));
    await openList();
    // Después del render: Expo Router restaura los temporizadores y reemplaza `Date`.
    const now = jest.spyOn(Date, 'now').mockReturnValue(1_000_000);

    await fireEvent.press(screen.getByTestId(`order-evidence-view-${ID_VISIBLE}`));
    await waitFor(() => expect(screen.getByTestId(`order-evidence-photo-${ID_VISIBLE}`)).toBeTruthy());
    await fireEvent.press(screen.getByTestId(`order-evidence-hide-${ID_VISIBLE}`));

    now.mockReturnValue(1_030_000);
    await fireEvent.press(screen.getByTestId(`order-evidence-view-${ID_VISIBLE}`));
    expect(requests(/descarga/)).toHaveLength(1);
    await fireEvent.press(screen.getByTestId(`order-evidence-hide-${ID_VISIBLE}`));

    now.mockReturnValue(1_061_000);
    await fireEvent.press(screen.getByTestId(`order-evidence-view-${ID_VISIBLE}`));
    await waitFor(() => expect(requests(/descarga/)).toHaveLength(2));
    await waitFor(() =>
      expect(shownUri(`order-evidence-photo-${ID_VISIBLE}`)).toBe(`${PRESIGNED}&nueva=1`),
    );
  });

  it('una imagen inaccesible se informa y puede reintentarse con una URL nueva', async () => {
    handlers.push(ok({ url: PRESIGNED, expira_en: 300 }));
    handlers.push(ok({ url: `${PRESIGNED}&nueva=1`, expira_en: 300 }));
    await openList();
    await fireEvent.press(screen.getByTestId(`order-evidence-view-${ID_VISIBLE}`));
    await waitFor(() => expect(screen.getByTestId(`order-evidence-photo-${ID_VISIBLE}`)).toBeTruthy());

    await act(async () => {
      screen.getByTestId(`order-evidence-photo-${ID_VISIBLE}`).props.onError?.({ nativeEvent: { error: '403' } });
    });

    await waitFor(() => expect(screen.getByText('No se pudo mostrar la fotografía.')).toBeTruthy());
    await fireEvent.press(screen.getByText('Reintentar'));
    await waitFor(() => expect(screen.getByTestId(`order-evidence-photo-${ID_VISIBLE}`)).toBeTruthy());
    expect(requests(/descarga/)).toHaveLength(2);
  });

  it('una URL caducada que falla al mostrarse se renueva automáticamente una vez', async () => {
    handlers.push(ok({ url: PRESIGNED, expira_en: 10 }));
    handlers.push(ok({ url: `${PRESIGNED}&nueva=1`, expira_en: 10 }));
    await openList();
    const now = jest.spyOn(Date, 'now').mockReturnValue(2_000_000);
    await fireEvent.press(screen.getByTestId(`order-evidence-view-${ID_VISIBLE}`));
    await waitFor(() => expect(screen.getByTestId(`order-evidence-photo-${ID_VISIBLE}`)).toBeTruthy());

    now.mockReturnValue(2_020_000);
    await act(async () => {
      screen.getByTestId(`order-evidence-photo-${ID_VISIBLE}`).props.onError?.({ nativeEvent: { error: 'expired' } });
    });

    await waitFor(() => expect(requests(/descarga/)).toHaveLength(2));
    await waitFor(() =>
      expect(shownUri(`order-evidence-photo-${ID_VISIBLE}`)).toBe(`${PRESIGNED}&nueva=1`),
    );

    // Un segundo fallo ya no se reintenta solo.
    await act(async () => {
      screen.getByTestId(`order-evidence-photo-${ID_VISIBLE}`).props.onError?.({ nativeEvent: { error: 'expired' } });
    });
    await waitFor(() => expect(screen.getByText('No se pudo mostrar la fotografía.')).toBeTruthy());
    expect(requests(/descarga/)).toHaveLength(2);
  });

  it('una evidencia fuera de alcance (404) en la descarga se informa', async () => {
    handlers.push(fail(404));
    await openList();

    await fireEvent.press(screen.getByTestId(`order-evidence-view-${ID_VISIBLE}`));

    await waitFor(() =>
      expect(screen.getByText('La orden no existe o no tienes acceso a sus evidencias.')).toBeTruthy(),
    );
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });
});
