import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import { router as appRouter, type Href } from 'expo-router';
import {
  AxiosError,
  AxiosHeaders,
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
import AuthLayout from '@/app/(auth)/_layout';
import LoginScreen from '@/app/(auth)/login';
import IndexScreen from '@/app/index';
import MecanicoLayout from '@/app/(mecanico)/_layout';
import MecanicoScreen from '@/app/(mecanico)/mecanico';
import OrdenAsignadaScreen from '@/app/(mecanico)/ordenes-asignadas/[id]';
import { mockAuthResponses } from '@/mocks/auth.mock';
import { apiClient } from '@/services/api/client';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/stores/authStore';

/**
 * SCRUM-108: pruebas funcionales del módulo de evidencias fotográficas.
 *
 * Nivel: integración funcional en Jest (sin emulador, dispositivo ni backend
 * real). Recorren el caso de uso del mecánico con las pantallas, layouts,
 * store de sesión, OrdersService, OrderLogService, EvidenceService, los hooks
 * de selección y envío, el cliente HTTP y sus interceptores reales. Se
 * simulan: AuthService (como en `order-functional.test.tsx`), el almacenamiento
 * seguro (en memoria), el selector nativo de expo-image-picker y el adaptador
 * de red de Axios, que responde según los contratos de MS2 y MS4. No se envía
 * ninguna fotografía ni dato a un servidor.
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

jest.mock('expo-image-picker', () => ({
  getCameraPermissionsAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

const login = jest.mocked(authService.login);
const picker = jest.mocked(ImagePicker);

// Jest expone el FormData de Node; la app corre con el de React Native.
const NodeFormData = globalThis.FormData;
const ReactNativeFormData = jest.requireActual('react-native/Libraries/Network/FormData').default;

const routes = {
  index: IndexScreen,
  '(auth)/_layout': AuthLayout,
  '(auth)/login': LoginScreen,
  '(mecanico)/_layout': MecanicoLayout,
  '(mecanico)/mecanico': MecanicoScreen,
  '(mecanico)/ordenes-asignadas/[id]': OrdenAsignadaScreen,
};

const TOKEN = mockAuthResponses.mecanico.token;

// ---------------------------------------------------------------------------
// Datos sintéticos según los contratos
// ---------------------------------------------------------------------------

/** `OrdenRespuesta` (MS2): 5 = en reparación, 7 = entregado. */
function orderDto(id: number, estadoCodigo = 5) {
  return {
    orden_id: id,
    vehiculo_id: 12,
    ingreso_id: 18,
    estado_codigo: estadoCodigo,
    mecanico_actual_id: 50,
    creado_por_id: 99,
    creado_en: '2026-09-28T10:30:00-03:00',
    actualizado_en: '2026-09-28T11:00:00-03:00',
  };
}

/** `BitacoraRespuesta` (MS2). */
function logDto(id: number, ordenId: number, body: { tipo: string; descripcion: string }) {
  return {
    bitacora_id: id,
    orden_id: ordenId,
    autor_usuario_id: 50,
    tipo: body.tipo,
    descripcion: body.descripcion,
    creado_en: new Date().toISOString(),
    repuestos: [],
  };
}

let evidenceSeq = 0;

/** `EvidenciaLeida` (MS4). */
function evidenceDto(ordenId: number, name: string, size: number, contexto: string) {
  evidenceSeq += 1;
  return {
    evidencia_id: `00000000-0000-4000-8000-${String(evidenceSeq).padStart(12, '0')}`,
    orden_id: ordenId,
    presupuesto_id: null,
    contexto,
    tipo_archivo: 'foto',
    visible_cliente: true,
    estado: 'confirmada',
    nombre_original: name,
    content_type: 'image/jpeg',
    tamano_bytes: size,
    creada_en: new Date().toISOString(),
  };
}

function asset(name: string, overrides: Partial<ImagePicker.ImagePickerAsset> = {}) {
  return {
    uri: `file:///cache/ImagePicker/${name}`,
    fileName: name,
    fileSize: 4096,
    mimeType: 'image/jpeg',
    type: 'image' as const,
    width: 1200,
    height: 900,
    ...overrides,
  };
}

function picked(...assets: ImagePicker.ImagePickerAsset[]): ImagePicker.ImagePickerResult {
  return { canceled: false, assets };
}

function permission(status: 'granted' | 'denied', canAskAgain = true) {
  return { status, granted: status === 'granted', canAskAgain, expires: 'never' } as ImagePicker.PermissionResponse;
}

// ---------------------------------------------------------------------------
// Servidor simulado (MS2 + MS4) sobre el adaptador de Axios
// ---------------------------------------------------------------------------

type Reply = (config: InternalAxiosRequestConfig) => Promise<AxiosResponse>;

function respond(config: InternalAxiosRequestConfig, status: number, data: unknown) {
  const response = { data, status, statusText: String(status), headers: {}, config } as AxiosResponse;
  if (status >= 400) {
    return Promise.reject(
      new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_RESPONSE', config, null, response),
    );
  }
  return Promise.resolve(response);
}

/** Estado del "servidor": órdenes visibles, bitácora y evidencias guardadas. */
const server = {
  orders: new Map<number, number>(),
  log: new Map<number, ReturnType<typeof logDto>[]>(),
  evidence: new Map<number, ReturnType<typeof evidenceDto>[]>(),
  /** Respuestas forzadas por prueba: `${método} ${ruta}` → cola. */
  overrides: new Map<string, Reply[]>(),
};

function override(key: string, ...replies: Reply[]) {
  server.overrides.set(key, [...(server.overrides.get(key) ?? []), ...replies]);
}

/** Campos del multipart que el servicio entregó a `apiClient.post`. */
let postSpy: jest.SpyInstance;

function lastEvidenceFields(): Record<string, unknown> {
  const call = [...postSpy.mock.calls].reverse().find(([url]) => url === '/evidencias');
  const parts = (call?.[1] as { getParts: () => { fieldName: string; string?: string; name?: string; size?: number }[] }).getParts();
  return Object.fromEntries(parts.map((p) => [p.fieldName, p.string ?? p]));
}

const adapter = jest.fn<ReturnType<AxiosAdapter>, Parameters<AxiosAdapter>>(async (config) => {
  const method = (config.method ?? 'get').toLowerCase();
  const url = config.url ?? '';
  const key = `${method} ${url}`;

  const forced = server.overrides.get(key);
  if (forced && forced.length > 0) return forced.shift()!(config);

  // Toda ruta protegida exige el JWT de la sesión.
  if (AxiosHeaders.from(config.headers).get('Authorization') !== `Bearer ${TOKEN}`) {
    return respond(config, 401, { detail: 'No autenticado' });
  }

  let match = /^\/ordenes\/(\d+)$/.exec(url);
  if (method === 'get' && match) {
    const id = Number(match[1]);
    return server.orders.has(id)
      ? respond(config, 200, orderDto(id, server.orders.get(id)))
      : respond(config, 404, { detail: 'Orden no encontrada' });
  }

  match = /^\/ordenes\/(\d+)\/bitacora$/.exec(url);
  if (match) {
    const id = Number(match[1]);
    const entries = server.log.get(id) ?? [];
    if (method === 'get') return respond(config, 200, entries);
    const body = JSON.parse(config.data);
    const created = logDto(500 + entries.length + 1, id, body);
    server.log.set(id, [...entries, created]);
    return respond(config, 201, created);
  }

  if (url === '/evidencias' && method === 'get') {
    const id = Number(config.params?.orden_id);
    return server.orders.has(id)
      ? respond(config, 200, server.evidence.get(id) ?? [])
      : respond(config, 404, { detail: 'La orden no existe o no pertenece al solicitante' });
  }

  if (url === '/evidencias' && method === 'post') {
    const fields = lastEvidenceFields();
    const id = Number(fields.orden_id);
    const file = fields.archivo as { name: string };
    const created = evidenceDto(id, file.name, 4096, String(fields.contexto));
    server.evidence.set(id, [...(server.evidence.get(id) ?? []), created]);
    return respond(config, 201, created);
  }

  match = /^\/evidencias\/([0-9a-f-]+)\/descarga$/.exec(url);
  if (method === 'get' && match) {
    return respond(config, 200, { url: `https://storage.example/firmada/${match[1]}`, expira_en: 300 });
  }

  throw new Error(`Solicitud no prevista: ${key}`);
});

function calls(method: string, pattern: RegExp) {
  return adapter.mock.calls.filter(
    ([config]) => config.method === method && pattern.test(config.url ?? ''),
  );
}

const evidencePosts = () => calls('post', /^\/evidencias$/);

// ---------------------------------------------------------------------------
// Pasos del recorrido
// ---------------------------------------------------------------------------

let router: ReturnType<typeof renderRouterWithProviders>;

async function loginAsMechanic() {
  router = renderRouterWithProviders(routes, { initialUrl: '/login' });
  await router;
  login.mockResolvedValueOnce(mockAuthResponses.mecanico);
  await fireEvent.changeText(screen.getByTestId('login-email'), mockAuthResponses.mecanico.user.email);
  await fireEvent.changeText(screen.getByTestId('login-password'), 'clave-segura');
  await fireEvent.press(screen.getByTestId('login-submit'));
  await waitFor(() => expect(router.getPathname()).toBe('/mecanico'));
}

async function openOrder(id: number) {
  await act(async () => {
    appRouter.push(`/ordenes-asignadas/${id}` as Href);
  });
}

async function waitForOrder(id: number) {
  await waitFor(() => expect(screen.getByTestId(`order-detail-${id}`)).toBeTruthy());
}

function pressHandlerOf(testID: string): () => void {
  const host = screen.getByTestId(testID);
  const event = { nativeEvent: {}, target: host, currentTarget: host, stopPropagation: () => {} };
  return () => host.props.onClick(event);
}

async function selectEvidencePhoto(name = 'evidencia.jpg') {
  picker.launchImageLibraryAsync.mockResolvedValueOnce(picked(asset(name)));
  await fireEvent.press(screen.getByTestId('evidence-pick-library'));
  await waitFor(() => expect(screen.getByText(name)).toBeTruthy());
}

async function sendEvidence() {
  await fireEvent.press(screen.getByTestId('evidence-send'));
}

beforeAll(() => {
  globalThis.FormData = ReactNativeFormData;
});

afterAll(() => {
  globalThis.FormData = NodeFormData;
});

const originalAdapter = apiClient.defaults.adapter;

beforeEach(() => {
  jest.clearAllMocks();
  resetStores();
  secureStore.clear();
  jest.mocked(SecureStore.getItemAsync).mockImplementation(async (key) => secureStore.get(key) ?? null);
  jest.mocked(SecureStore.setItemAsync).mockImplementation(async (key, value) => {
    secureStore.set(key, value);
  });
  jest.mocked(SecureStore.deleteItemAsync).mockImplementation(async (key) => {
    secureStore.delete(key);
  });

  server.orders = new Map([
    [31, 5],
    [32, 5],
    [40, 7],
  ]);
  server.log = new Map();
  server.evidence = new Map();
  server.overrides = new Map();
  evidenceSeq = 0;

  picker.launchImageLibraryAsync.mockReset();
  picker.launchCameraAsync.mockReset();
  picker.getCameraPermissionsAsync.mockReset().mockResolvedValue(permission('granted'));
  picker.requestCameraPermissionsAsync.mockReset().mockResolvedValue(permission('granted'));

  apiClient.defaults.adapter = adapter;
  postSpy = jest.spyOn(apiClient, 'post');
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  postSpy.mockRestore();
  jest.mocked(console.warn).mockRestore?.();
  jest.mocked(console.error).mockRestore?.();
  apiClient.defaults.adapter = originalAdapter;
  cleanup();
});

// ---------------------------------------------------------------------------
// Flujo principal
// ---------------------------------------------------------------------------

describe('Flujo principal del mecánico', () => {
  it('login → orden → avance con foto → evidencia → consulta → otra orden → logout', async () => {
    // 1-2. Inicia sesión y accede a una orden asignada.
    await loginAsMechanic();
    await openOrder(31);
    await waitForOrder(31);
    expect(screen.getByText('Se adjuntará a la orden 31.')).toBeTruthy();

    // 3-7. Registra un avance con fotografía de la galería (vista previa y validación).
    await fireEvent.press(screen.getByTestId('order-update-type-accion'));
    await fireEvent.changeText(
      screen.getByTestId('order-update-description'),
      'Cambio de pastillas delanteras',
    );
    picker.launchImageLibraryAsync.mockResolvedValueOnce(picked(asset('avance.jpg')));
    await fireEvent.press(screen.getByTestId('order-update-photo-pick-library'));
    await waitFor(() => expect(screen.getByTestId('order-update-photo-preview')).toBeTruthy());
    expect(screen.getByLabelText('Vista previa de la fotografía avance.jpg')).toBeTruthy();
    expect(evidencePosts()).toHaveLength(0);

    await fireEvent.press(screen.getByTestId('order-update-submit'));

    // 9. Resultado confirmado por ambos servicios.
    await waitFor(() => expect(screen.getByText('Avance y fotografía registrados')).toBeTruthy());
    const [logPost] = calls('post', /bitacora$/);
    expect(logPost[0].url).toBe('/ordenes/31/bitacora');
    expect(JSON.parse(logPost[0].data)).toEqual({
      tipo: 'accion',
      descripcion: 'Cambio de pastillas delanteras',
    });
    expect(lastEvidenceFields()).toMatchObject({ orden_id: '31', contexto: 'reparacion' });
    await waitFor(() => expect(screen.getByTestId('order-log-entry-501')).toBeTruthy());

    // 4-8. Captura con la cámara y envía una evidencia independiente.
    picker.launchCameraAsync.mockResolvedValueOnce(picked(asset('resultado.jpg')));
    await fireEvent.press(screen.getByTestId('evidence-take-photo'));
    await waitFor(() => expect(screen.getByTestId('evidence-preview')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('evidence-context-resultado_final'));
    await sendEvidence();
    await waitFor(() => expect(screen.getByTestId('evidence-upload-success')).toBeTruthy());
    expect(lastEvidenceFields()).toMatchObject({ orden_id: '31', contexto: 'resultado_final' });
    expect(evidencePosts()).toHaveLength(2);

    // 10. Consulta las evidencias asociadas y abre una fotografía.
    await fireEvent.press(screen.getByTestId('order-evidence-show'));
    await waitFor(() => expect(screen.getByText('resultado.jpg')).toBeTruthy());
    expect(screen.getByText('avance.jpg')).toBeTruthy();
    const firstId = server.evidence.get(31)![0].evidencia_id;
    await fireEvent.press(screen.getByTestId(`order-evidence-view-${firstId}`));
    await waitFor(() => expect(screen.getByTestId(`order-evidence-photo-${firstId}`)).toBeTruthy());

    // 11. Cambia de orden sin mezclar información.
    await openOrder(32);
    await waitForOrder(32);
    expect(screen.getByText('Se adjuntará a la orden 32.')).toBeTruthy();
    expect(screen.queryByTestId('evidence-preview')).toBeNull();
    expect(screen.queryByText('resultado.jpg')).toBeNull();
    await fireEvent.press(screen.getByTestId('order-evidence-show'));
    await waitFor(() => expect(screen.getByTestId('order-evidence-empty')).toBeTruthy());
    expect(calls('get', /^\/evidencias$/).map(([c]) => c.params)).toEqual([
      { orden_id: 31 },
      { orden_id: 32 },
    ]);

    // Todas las solicitudes llevaron el token de la sesión.
    for (const [config] of adapter.mock.calls) {
      expect(AxiosHeaders.from(config.headers).get('Authorization')).toBe(`Bearer ${TOKEN}`);
    }

    // 12. Cierra la sesión: el detalle deja de ser accesible y no se consulta.
    await act(async () => {
      appRouter.push('/mecanico' as Href);
    });
    await fireEvent.press(screen.getByRole('button', { name: 'Cerrar sesión' }));
    await waitFor(() => expect(router.getPathname()).toBe('/login'));
    expect(useAuthStore.getState().isAuthenticated).toBe(false);

    const requestsBefore = adapter.mock.calls.length;
    await openOrder(31);
    await waitFor(() => expect(router.getPathname()).toBe('/login'));
    expect(adapter.mock.calls.length).toBe(requestsBefore);
  });
});

// ---------------------------------------------------------------------------
// Flujos alternativos
// ---------------------------------------------------------------------------

describe('Flujos alternativos', () => {
  beforeEach(async () => {
    await loginAsMechanic();
    await openOrder(31);
    await waitForOrder(31);
  });

  it('cámara rechazada: no la abre, ofrece la galería y el envío sigue funcionando', async () => {
    picker.getCameraPermissionsAsync.mockResolvedValue(permission('denied'));
    picker.requestCameraPermissionsAsync.mockResolvedValue(permission('denied'));

    await fireEvent.press(screen.getByTestId('evidence-take-photo'));
    await waitFor(() => expect(screen.getByTestId('evidence-picker-message')).toBeTruthy());
    expect(picker.launchCameraAsync).not.toHaveBeenCalled();

    await selectEvidencePhoto();
    await sendEvidence();
    await waitFor(() => expect(screen.getByTestId('evidence-upload-success')).toBeTruthy());
  });

  it('galería cancelada: sin selección, sin errores y sin solicitudes', async () => {
    picker.launchImageLibraryAsync.mockResolvedValueOnce({ canceled: true, assets: null });

    await fireEvent.press(screen.getByTestId('evidence-pick-library'));

    await waitFor(() => expect(picker.launchImageLibraryAsync).toHaveBeenCalled());
    expect(screen.queryByTestId('evidence-preview')).toBeNull();
    expect(screen.queryByTestId('evidence-picker-message')).toBeNull();
    expect(evidencePosts()).toHaveLength(0);
  });

  it.each([
    ['imagen inválida', asset('anim.gif', { mimeType: 'image/gif' }), 'Formato no permitido'],
    ['archivo demasiado grande', asset('enorme.jpg', { fileSize: 50 * 1024 * 1024 }), 'supera el máximo'],
  ])('%s: se rechaza antes de enviar', async (_label, invalid, message) => {
    picker.launchImageLibraryAsync.mockResolvedValueOnce(picked(invalid));

    await fireEvent.press(screen.getByTestId('evidence-pick-library'));

    await waitFor(() =>
      expect(screen.getByTestId('evidence-picker-message')).toHaveTextContent(message, { exact: false }),
    );
    expect(screen.queryByTestId('evidence-send')).toBeNull();
    expect(evidencePosts()).toHaveLength(0);
  });

  it('falta de conectividad: resultado incierto; el reintento encuentra la foto y no duplica', async () => {
    // El servidor guarda la foto pero la respuesta no llega.
    override('post /evidencias', (config) => {
      const created = evidenceDto(31, 'evidencia.jpg', 4096, 'reparacion');
      server.evidence.set(31, [created]);
      return Promise.reject(new AxiosError('Network Error', AxiosError.ERR_NETWORK, config));
    });
    await selectEvidencePhoto();

    await sendEvidence();
    await waitFor(() =>
      expect(screen.getByTestId('evidence-upload-error')).toHaveTextContent(
        'No se pudo confirmar si la fotografía se guardó',
        { exact: false },
      ),
    );
    expect(screen.queryByTestId('evidence-send')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar envío' }));

    await waitFor(() => expect(screen.getByTestId('evidence-upload-recovered')).toBeTruthy());
    expect(evidencePosts()).toHaveLength(1);
    expect(server.evidence.get(31)).toHaveLength(1);
  });

  it('timeout sin guardar: el reintento comprueba y reenvía una sola vez', async () => {
    override('post /evidencias', (config) =>
      Promise.reject(new AxiosError('timeout of 60000ms exceeded', 'ECONNABORTED', config)),
    );
    await selectEvidencePhoto();

    await sendEvidence();
    await waitFor(() => expect(screen.getByTestId('evidence-upload-error')).toBeTruthy());
    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar envío' }));

    await waitFor(() => expect(screen.getByTestId('evidence-upload-success')).toBeTruthy());
    expect(calls('get', /^\/evidencias$/)).toHaveLength(1);
    expect(evidencePosts()).toHaveLength(2);
    expect(server.evidence.get(31)).toHaveLength(1);
  });

  it('error de subida (503): reintento seguro sin consulta previa', async () => {
    override('post /evidencias', (config) => respond(config, 503, {}));
    await selectEvidencePhoto();

    await sendEvidence();
    await waitFor(() =>
      expect(screen.getByTestId('evidence-upload-error')).toHaveTextContent(
        'El servicio de evidencias no está disponible',
        { exact: false },
      ),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar envío' }));

    await waitFor(() => expect(screen.getByTestId('evidence-upload-success')).toBeTruthy());
    expect(calls('get', /^\/evidencias$/)).toHaveLength(0);
    expect(server.evidence.get(31)).toHaveLength(1);
  });

  it('doble pulsación: una sola evidencia', async () => {
    await selectEvidencePhoto();

    const press = pressHandlerOf('evidence-send');
    await act(async () => {
      press();
      press();
    });

    await waitFor(() => expect(screen.getByTestId('evidence-upload-success')).toBeTruthy());
    expect(evidencePosts()).toHaveLength(1);
    expect(server.evidence.get(31)).toHaveLength(1);
  });

  it('permiso de rol rechazado (403): informa sin cerrar la sesión ni subir la foto', async () => {
    override('post /ordenes/31/bitacora', (config) => respond(config, 403, {}));
    await fireEvent.changeText(screen.getByTestId('order-update-description'), 'Revisión');
    picker.launchImageLibraryAsync.mockResolvedValueOnce(picked(asset('avance.jpg')));
    await fireEvent.press(screen.getByTestId('order-update-photo-pick-library'));
    await waitFor(() => expect(screen.getByTestId('order-update-photo-preview')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('order-update-submit'));

    await waitFor(() =>
      expect(
        screen.getByText(
          'Solo el mecánico asignado o un administrador pueden registrar avances en esta orden.',
        ),
      ).toBeTruthy(),
    );
    expect(evidencePosts()).toHaveLength(0);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(router.getPathname()).toBe('/ordenes-asignadas/31');
  });

  it('orden no asignada (404 de MS4): informa sin reintento', async () => {
    override('post /evidencias', (config) => respond(config, 404, {}));
    await selectEvidencePhoto();

    await sendEvidence();

    await waitFor(() =>
      expect(screen.getByTestId('evidence-upload-error')).toHaveTextContent(
        'La orden no existe o no está asignada a tu usuario.',
        { exact: false },
      ),
    );
    expect(screen.queryByRole('button', { name: 'Reintentar envío' })).toBeNull();
  });

  it('orden inexistente: no muestra secciones ni consulta evidencias', async () => {
    await openOrder(999);

    await waitFor(() => expect(screen.getByTestId('order-detail-error')).toBeTruthy());
    expect(screen.queryByTestId('evidence-capture-panel')).toBeNull();
    expect(screen.queryByTestId('order-evidence-list')).toBeNull();
    expect(calls('get', /^\/evidencias/)).toHaveLength(0);
  });

  it('orden entregada: no ofrece fotografías', async () => {
    await openOrder(40);
    await waitForOrder(40);

    expect(screen.getByTestId('order-update-photo-closed')).toBeTruthy();
    expect(screen.queryByTestId('evidence-capture-panel')).toBeNull();
  });

  it('cambio de orden durante el envío: la respuesta tardía no aparece en la nueva', async () => {
    let release!: () => void;
    override('post /evidencias', (config) =>
      new Promise((resolve) => {
        release = () => {
          const created = evidenceDto(31, 'evidencia.jpg', 4096, 'reparacion');
          server.evidence.set(31, [created]);
          resolve({ data: created, status: 201, statusText: '201', headers: {}, config } as AxiosResponse);
        };
      }),
    );
    await selectEvidencePhoto();
    const press = pressHandlerOf('evidence-send');
    await act(async () => {
      press();
    });
    await waitFor(() => expect(screen.getByTestId('evidence-upload-sending')).toBeTruthy());

    await openOrder(32);
    await waitForOrder(32);
    await act(async () => {
      release();
    });

    expect(screen.queryByTestId('evidence-upload-success')).toBeNull();
    expect(lastEvidenceFields()).toMatchObject({ orden_id: '31' });
    expect(server.evidence.get(32)).toBeUndefined();
  });

  it('sesión expirada (401 al subir): cierra la sesión y vuelve al login', async () => {
    override('post /evidencias', (config) => respond(config, 401, { detail: 'Token expirado' }));
    await selectEvidencePhoto();

    await sendEvidence();

    await waitFor(() => expect(router.getPathname()).toBe('/login'));
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('error inesperado del backend al consultar evidencias: se informa y se recupera', async () => {
    override('get /evidencias', (config) => respond(config, 500, {}));

    await fireEvent.press(screen.getByTestId('order-evidence-show'));
    await waitFor(() => expect(screen.getByTestId('order-evidence-error')).toBeTruthy());

    await fireEvent.press(screen.getByText('Reintentar'));
    await waitFor(() => expect(screen.getByTestId('order-evidence-empty')).toBeTruthy());
  });
});
