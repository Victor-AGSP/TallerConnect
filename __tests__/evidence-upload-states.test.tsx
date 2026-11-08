import * as ImagePicker from 'expo-image-picker';
import { router as appRouter } from 'expo-router';
import {
  AxiosError,
  CanceledError,
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
import OrdenAsignadaScreen from '@/app/(mecanico)/ordenes-asignadas/[id]';
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

const picker = jest.mocked(ImagePicker);
const mockedOrders = jest.mocked(ordersService);

/**
 * SCRUM-111: estados de carga, error y reintento al enviar evidencia.
 *
 * EvidenceService, useEvidenceUpload, el cliente HTTP real y sus interceptores
 * (token, reintentos, sesión). Solo se sustituye el adaptador de red de Axios
 * con promesas controladas y respuestas del contrato MS4: no se envía ninguna
 * fotografía a un servidor real.
 */

// Jest expone el FormData de Node; la app corre con el de React Native.
const NodeFormData = globalThis.FormData;
const ReactNativeFormData = jest.requireActual('react-native/Libraries/Network/FormData').default;

const routes = { '(mecanico)/ordenes-asignadas/[id]': OrdenAsignadaScreen };

function order(id: string): WorkOrder {
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

const PHOTO: ImagePicker.ImagePickerResult = {
  canceled: false,
  assets: [
    {
      uri: 'file:///cache/ImagePicker/evidencia.jpg',
      fileName: 'evidencia.jpg',
      fileSize: 2048,
      mimeType: 'image/jpeg',
      type: 'image',
      width: 800,
      height: 600,
    },
  ],
};

function evidenceDto(overrides: Record<string, unknown> = {}) {
  return {
    evidencia_id: '7b0f3e0c-1d2a-4c3b-9e8f-0a1b2c3d4e5f',
    orden_id: 31,
    presupuesto_id: null,
    contexto: 'reparacion',
    tipo_archivo: 'foto',
    visible_cliente: true,
    estado: 'confirmada',
    nombre_original: 'evidencia.jpg',
    content_type: 'image/jpeg',
    tamano_bytes: 2048,
    creada_en: new Date().toISOString(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Adaptador de red controlado
// ---------------------------------------------------------------------------

type Handler = (config: InternalAxiosRequestConfig) => Promise<AxiosResponse>;

const adapter = jest.fn<ReturnType<AxiosAdapter>, Parameters<AxiosAdapter>>();
const originalAdapter = apiClient.defaults.adapter;
let postHandlers: Handler[] = [];
let getHandlers: Handler[] = [];

function ok(config: InternalAxiosRequestConfig, status: number, data: unknown) {
  return Promise.resolve({ data, status, statusText: String(status), headers: {}, config } as AxiosResponse);
}

function httpError(config: InternalAxiosRequestConfig, status: number, data: unknown = {}) {
  const response = { data, status, statusText: String(status), headers: {}, config } as AxiosResponse;
  return Promise.reject(
    new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_RESPONSE', config, null, response),
  );
}

function timeout(config: InternalAxiosRequestConfig) {
  return Promise.reject(new AxiosError('timeout of 60000ms exceeded', 'ECONNABORTED', config));
}

function networkDown(config: InternalAxiosRequestConfig) {
  return Promise.reject(new AxiosError('Network Error', AxiosError.ERR_NETWORK, config));
}

/** Respuesta que queda pendiente hasta que la prueba la libere o se cancele. */
function controlled() {
  let release!: (respond: (config: InternalAxiosRequestConfig) => Promise<AxiosResponse>) => void;
  let captured!: InternalAxiosRequestConfig;
  const handler: Handler = (config) => {
    captured = config;
    return new Promise((resolve, reject) => {
      config.signal?.addEventListener?.('abort', () =>
        reject(new CanceledError(undefined, undefined, config)),
      );
      release = (respond) => respond(config).then(resolve, reject);
    });
  };
  return {
    handler,
    release: (respond: (config: InternalAxiosRequestConfig) => Promise<AxiosResponse>) =>
      act(async () => {
        release(respond);
      }),
    config: () => captured,
  };
}

function posts() {
  return adapter.mock.calls.filter(([c]) => c.method === 'post' && c.url === '/evidencias');
}

function gets() {
  return adapter.mock.calls.filter(([c]) => c.method === 'get' && c.url === '/evidencias');
}

let postSpy: jest.SpyInstance;

/** `orden_id` del multipart que el servicio entregó a `apiClient.post`. */
function postedOrderIds(): string[] {
  return postSpy.mock.calls.map(([, form]) => {
    const parts = (form as { getParts: () => { fieldName: string; string?: string }[] }).getParts();
    return parts.find((part) => part.fieldName === 'orden_id')?.string ?? '';
  });
}

// ---------------------------------------------------------------------------
// Pantalla
// ---------------------------------------------------------------------------

async function openOrder(id = '31') {
  const view = renderRouterWithProviders(routes, {
    initialUrl: `/ordenes-asignadas/${id}`,
    initialAuthState: {
      user: mockUserByRole.mecanico,
      token: 'token-de-prueba',
      role: 'mecanico',
      isAuthenticated: true,
      isLoading: false,
      isHydrated: true,
    },
  });
  await view;
  await waitFor(() => expect(screen.getByTestId('evidence-capture-panel')).toBeTruthy());
  return view;
}

async function selectPhoto() {
  await fireEvent.press(screen.getByTestId('evidence-pick-library'));
  await waitFor(() => expect(screen.getByTestId('evidence-send')).toBeTruthy());
}

/** Pulsa sin esperar a que termine el envío (la respuesta está controlada). */
function pressHandlerOf(testID: string): () => void {
  const host = screen.getByTestId(testID);
  const event = { nativeEvent: {}, target: host, currentTarget: host, stopPropagation: () => {} };
  return () => host.props.onClick(event);
}

async function send() {
  const press = pressHandlerOf('evidence-send');
  await act(async () => {
    press();
  });
}

async function retry() {
  await fireEvent.press(screen.getByRole('button', { name: 'Reintentar envío' }));
}

function errorText() {
  return screen.getByTestId('evidence-upload-error');
}

beforeAll(() => {
  globalThis.FormData = ReactNativeFormData;
});

afterAll(() => {
  globalThis.FormData = NodeFormData;
  apiClient.defaults.adapter = originalAdapter;
});

beforeEach(() => {
  jest.resetAllMocks();
  resetStores();
  postHandlers = [];
  getHandlers = [];
  adapter.mockImplementation((config) => {
    const queue = config.method === 'post' ? postHandlers : getHandlers;
    const handler = queue.shift();
    if (!handler) throw new Error(`Solicitud inesperada: ${config.method} ${config.url}`);
    return handler(config);
  });
  apiClient.defaults.adapter = adapter;
  postSpy = jest.spyOn(apiClient, 'post');
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest
    .spyOn(storage, 'get')
    .mockImplementation(async (key: string) =>
      key === STORAGE_KEYS.AUTH_TOKEN ? 'token-de-prueba' : null,
    );
  mockedOrders.getOrderById.mockImplementation(async (id) => order(String(id)));
  picker.launchImageLibraryAsync.mockResolvedValue(PHOTO);
});

afterEach(() => {
  jest.restoreAllMocks();
  cleanup();
});

describe('Estados del envío de evidencia', () => {
  it('sin fotografía no ofrece enviar; con fotografía ofrece enviar sin subir nada', async () => {
    await openOrder();
    expect(screen.queryByTestId('evidence-send')).toBeNull();

    await selectPhoto();

    expect(adapter).not.toHaveBeenCalled();
  });

  it('muestra el envío pendiente y solo informa éxito tras la confirmación válida', async () => {
    const pending = controlled();
    postHandlers.push(pending.handler);
    await openOrder();
    await selectPhoto();

    await send();

    await waitFor(() => expect(screen.getByTestId('evidence-upload-sending')).toBeTruthy());
    expect(screen.getByText('Enviando fotografía...')).toBeTruthy();
    expect(screen.getByTestId('evidence-upload-cancel')).toBeTruthy();
    expect(screen.queryByTestId('evidence-send')).toBeNull();
    expect(screen.queryByTestId('evidence-upload-success')).toBeNull();
    expect(pending.config().timeout).toBe(60_000);

    await pending.release((config) => ok(config, 201, evidenceDto()));

    await waitFor(() => expect(screen.getByTestId('evidence-upload-success')).toBeTruthy());
    expect(screen.queryByTestId('evidence-upload-recovered')).toBeNull();
    expect(screen.queryByTestId('evidence-preview')).toBeNull();
    expect(posts()).toHaveLength(1);
  });

  it('muestra el progreso real solo cuando la plataforma informa el total', async () => {
    const pending = controlled();
    postHandlers.push(pending.handler);
    await openOrder();
    await selectPhoto();
    await send();
    await waitFor(() => expect(screen.getByTestId('evidence-upload-sending')).toBeTruthy());

    await act(async () => {
      pending.config().onUploadProgress?.({ loaded: 512, total: undefined, bytes: 512 } as never);
    });
    expect(screen.getByText('Enviando fotografía...')).toBeTruthy();

    await act(async () => {
      pending.config().onUploadProgress?.({ loaded: 1024, total: 2048, bytes: 512 } as never);
    });
    expect(screen.getByText('Enviando fotografía... 50 %')).toBeTruthy();

    await pending.release((config) => ok(config, 201, evidenceDto()));
    await waitFor(() => expect(screen.getByTestId('evidence-upload-success')).toBeTruthy());
  });

  it('una doble pulsación produce un solo POST', async () => {
    const pending = controlled();
    postHandlers.push(pending.handler);
    await openOrder();
    await selectPhoto();

    const press = pressHandlerOf('evidence-send');
    await act(async () => {
      press();
      press();
    });

    await pending.release((config) => ok(config, 201, evidenceDto()));
    await waitFor(() => expect(screen.getByTestId('evidence-upload-success')).toBeTruthy());
    expect(posts()).toHaveLength(1);
  });

  it.each([
    [400, 'El servidor no pudo leer la fotografía enviada.'],
    [404, 'La orden no existe o no está asignada a tu usuario.'],
    [409, 'La orden está entregada o cancelada: ya no admite evidencias.'],
    [413, 'La fotografía supera el tamaño máximo que acepta el servidor.'],
    [415, 'El servidor no aceptó el formato de la fotografía.'],
    [422, 'La fotografía está vacía o dañada, o los datos de la evidencia no son válidos.'],
  ])('un rechazo %s se informa sin ofrecer reintentar la misma fotografía', async (status, message) => {
    postHandlers.push((config) => httpError(config, status));
    await openOrder();
    await selectPhoto();

    await send();

    await waitFor(() => expect(errorText()).toHaveTextContent(message, { exact: false }));
    expect(screen.queryByRole('button', { name: 'Reintentar envío' })).toBeNull();
    expect(posts()).toHaveLength(1);
    // La fotografía sigue seleccionada para reemplazarla o quitarla.
    expect(screen.getByTestId('evidence-preview')).toBeTruthy();
  });

  it.each([
    [503, 'El servicio de evidencias no está disponible. La fotografía no se guardó.'],
    [429, 'Demasiadas solicitudes. Espera un momento antes de reintentar.'],
  ])('tras un %s (sin nada guardado) reintenta reenviando la fotografía', async (status, message) => {
    postHandlers.push((config) => httpError(config, status));
    postHandlers.push((config) => ok(config, 201, evidenceDto()));
    await openOrder();
    await selectPhoto();

    await send();
    await waitFor(() => expect(errorText()).toHaveTextContent(message, { exact: false }));
    expect(posts()).toHaveLength(1);

    await retry();

    await waitFor(() => expect(screen.getByTestId('evidence-upload-success')).toBeTruthy());
    expect(posts()).toHaveLength(2);
    expect(gets()).toHaveLength(0);
  });

  it('un timeout deja el resultado incierto y no permite reenviar sin comprobar', async () => {
    postHandlers.push(timeout);
    await openOrder();
    await selectPhoto();

    await send();

    await waitFor(() =>
      expect(errorText()).toHaveTextContent('No se pudo confirmar si la fotografía se guardó', { exact: false }),
    );
    // "Enviar" podría duplicarla: solo se ofrece el reintento con verificación.
    expect(screen.queryByTestId('evidence-send')).toBeNull();
    expect(screen.getByRole('button', { name: 'Reintentar envío' })).toBeTruthy();
    // El POST no se reintentó automáticamente.
    expect(posts()).toHaveLength(1);
  });

  it('al reintentar tras un timeout encuentra la fotografía ya guardada y no la duplica', async () => {
    postHandlers.push(timeout);
    getHandlers.push((config) => ok(config, 200, [evidenceDto()]));
    await openOrder();
    await selectPhoto();
    await send();
    await waitFor(() => expect(errorText()).toBeTruthy());

    await retry();

    await waitFor(() => expect(screen.getByTestId('evidence-upload-recovered')).toBeTruthy());
    expect(posts()).toHaveLength(1);
    expect(gets()).toHaveLength(1);
    expect(gets()[0][0].params).toEqual({ orden_id: 31 });
  });

  it('al reintentar tras un timeout reenvía solo si el servidor no la tiene', async () => {
    postHandlers.push(timeout);
    postHandlers.push((config) => ok(config, 201, evidenceDto()));
    // Una evidencia distinta de la misma orden no cuenta como la enviada.
    getHandlers.push((config) =>
      ok(config, 200, [evidenceDto({ nombre_original: 'otra.jpg', evidencia_id: '0b0f3e0c-1d2a-4c3b-9e8f-0a1b2c3d4e5f' })]),
    );
    await openOrder();
    await selectPhoto();
    await send();
    await waitFor(() => expect(errorText()).toBeTruthy());

    await retry();

    await waitFor(() => expect(screen.getByTestId('evidence-upload-success')).toBeTruthy());
    expect(screen.queryByTestId('evidence-upload-recovered')).toBeNull();
    expect(posts()).toHaveLength(2);
  });

  it('si no puede comprobar el servidor tras un resultado incierto no reenvía', async () => {
    postHandlers.push(networkDown);
    getHandlers.push((config) => httpError(config, 500));
    await openOrder();
    await selectPhoto();
    await send();
    await waitFor(() =>
      expect(errorText()).toHaveTextContent('Backend no disponible o sin conexión a internet.', { exact: false }),
    );

    await retry();

    await waitFor(() =>
      expect(errorText()).toHaveTextContent('No se pudo comprobar si la fotografía se guardó', { exact: false }),
    );
    expect(posts()).toHaveLength(1);
  });

  it.each([
    ['500', (config: InternalAxiosRequestConfig) => httpError(config, 500)],
    ['502', (config: InternalAxiosRequestConfig) => httpError(config, 502)],
    ['una respuesta 201 inválida', (config: InternalAxiosRequestConfig) => ok(config, 201, { ok: true })],
  ])('trata %s como resultado incierto', async (_label, handler) => {
    postHandlers.push(handler);
    await openOrder();
    await selectPhoto();

    await send();

    await waitFor(() =>
      expect(errorText()).toHaveTextContent('No se pudo confirmar si la fotografía se guardó', { exact: false }),
    );
    expect(screen.queryByTestId('evidence-upload-success')).toBeNull();
  });

  it('permite cancelar el envío y comprueba antes de reintentar', async () => {
    const pending = controlled();
    postHandlers.push(pending.handler);
    getHandlers.push((config) => ok(config, 200, []));
    postHandlers.push((config) => ok(config, 201, evidenceDto()));
    await openOrder();
    await selectPhoto();
    await send();
    await waitFor(() => expect(screen.getByTestId('evidence-upload-cancel')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('evidence-upload-cancel'));

    await waitFor(() => expect(screen.getByText('Envío cancelado')).toBeTruthy());
    expect(pending.config().signal?.aborted).toBe(true);

    await retry();

    await waitFor(() => expect(screen.getByTestId('evidence-upload-success')).toBeTruthy());
    expect(gets()).toHaveLength(1);
    expect(posts()).toHaveLength(2);
  });

  it('un 401 cierra la sesión y no ofrece reintento', async () => {
    postHandlers.push((config) => httpError(config, 401, { detail: 'Token expirado' }));
    await openOrder();
    await selectPhoto();

    await send();

    await waitFor(() => expect(useAuthStore.getState().isAuthenticated).toBe(false));
    expect(posts()).toHaveLength(1);
  });

  it('un 403 informa el permiso sin cerrar la sesión', async () => {
    postHandlers.push((config) => httpError(config, 403));
    await openOrder();
    await selectPhoto();

    await send();

    await waitFor(() =>
      expect(errorText()).toHaveTextContent('Solo el mecánico asignado o un administrador pueden subir evidencias.', { exact: false }),
    );
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(screen.queryByRole('button', { name: 'Reintentar envío' })).toBeNull();
  });

  it('reemplazar la fotografía tras un rechazo permite enviar la nueva', async () => {
    postHandlers.push((config) => httpError(config, 415));
    postHandlers.push((config) => ok(config, 201, evidenceDto({ nombre_original: 'nueva.png', content_type: 'image/png' })));
    await openOrder();
    await selectPhoto();
    await send();
    await waitFor(() => expect(errorText()).toBeTruthy());

    picker.launchImageLibraryAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [{ ...PHOTO.assets![0], uri: 'file:///cache/ImagePicker/nueva.png', fileName: 'nueva.png', mimeType: 'image/png' }],
    });
    await fireEvent.press(screen.getByTestId('evidence-pick-library'));
    await waitFor(() => expect(screen.getByText('nueva.png')).toBeTruthy());

    await send();

    await waitFor(() => expect(screen.getByTestId('evidence-upload-success')).toBeTruthy());
    expect(posts()).toHaveLength(2);
  });

  it('una respuesta tardía de otra orden no aparece en la orden actual', async () => {
    const pending = controlled();
    postHandlers.push(pending.handler);
    await openOrder('31');
    await selectPhoto();
    await send();
    await waitFor(() => expect(screen.getByTestId('evidence-upload-sending')).toBeTruthy());

    await act(async () => {
      appRouter.setParams({ id: '32' });
    });
    await waitFor(() => expect(screen.getByText('Se adjuntará a la orden 32.')).toBeTruthy());

    await pending.release((config) => ok(config, 201, evidenceDto()));

    expect(screen.queryByTestId('evidence-upload-success')).toBeNull();
    expect(screen.queryByTestId('evidence-upload-sending')).toBeNull();
    // La subida pertenecía a la orden 31 y nunca se envió nada a la 32.
    expect(postedOrderIds()).toEqual(['31']);
  });
});
