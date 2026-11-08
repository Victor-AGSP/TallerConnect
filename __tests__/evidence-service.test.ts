import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';

import { apiClient } from '@/services/api/client';
import {
  EvidenceServiceError,
  evidenceService,
} from '@/services/evidence.service';
import type { EvidenceFile } from '@/models/evidence.model';
import { STORAGE_KEYS, storage } from '@/utils/storage';

/**
 * EvidenceService con el cliente HTTP real (token, reintentos, errores). Solo
 * se sustituye el adaptador de red de Axios con respuestas del contrato MS4.
 */

const EVIDENCE = {
  evidencia_id: '7b0f3e0c-1d2a-4c3b-9e8f-0a1b2c3d4e5f',
  orden_id: 31,
  presupuesto_id: null,
  contexto: 'reparacion',
  tipo_archivo: 'foto',
  visible_cliente: true,
  estado: 'confirmada',
  nombre_original: 'captura.jpg',
  content_type: 'image/jpeg',
  tamano_bytes: 2048,
  creada_en: '2026-10-28T15:00:00Z',
};

const FILE: EvidenceFile = {
  uri: 'file:///cache/ImagePicker/captura.jpg',
  name: 'captura.jpg',
  mimeType: 'image/jpeg',
  size: 2048,
  source: 'camera',
};

const adapter = jest.fn<ReturnType<AxiosAdapter>, Parameters<AxiosAdapter>>();
const originalAdapter = apiClient.defaults.adapter;

function respond(config: InternalAxiosRequestConfig, status: number, data: unknown) {
  const response = { data, status, statusText: String(status), headers: {}, config };
  if (status >= 400) {
    return Promise.reject(
      new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_REQUEST', config, null, response),
    );
  }
  return Promise.resolve(response);
}

type FormPart = { fieldName: string; string?: string; uri?: string; name?: string; type?: string };

/**
 * Cuerpo multipart que el servicio entrega a `apiClient.post`. Se inspecciona
 * ahí porque en Jest axios usa su build de Node (paquete `form-data`) y
 * re-serializa el FormData; en la app Metro usa el build de navegador, que lo
 * envía intacto a la capa de red de React Native.
 */
function sentFormEntries(post: jest.SpyInstance): Record<string, unknown> {
  const form = post.mock.calls[0][1] as { getParts: () => FormPart[] };
  const entries: Record<string, unknown> = {};
  for (const part of form.getParts()) {
    entries[part.fieldName] =
      part.string ?? { uri: part.uri, name: part.name, type: part.type };
  }
  return entries;
}

// Jest expone el FormData de Node; la app corre con el de React Native, que
// admite archivos por referencia ({ uri, name, type }).
const NodeFormData = globalThis.FormData;
const ReactNativeFormData = jest.requireActual('react-native/Libraries/Network/FormData').default;

beforeAll(() => {
  globalThis.FormData = ReactNativeFormData;
});

beforeEach(() => {
  adapter.mockReset();
  apiClient.defaults.adapter = adapter;
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest
    .spyOn(storage, 'get')
    .mockImplementation(async (key: string) =>
      key === STORAGE_KEYS.AUTH_TOKEN ? 'token-de-prueba' : null,
    );
});

afterEach(() => {
  jest.restoreAllMocks();
});

afterAll(() => {
  globalThis.FormData = NodeFormData;
  apiClient.defaults.adapter = originalAdapter;
});

describe('EvidenceService.uploadEvidence', () => {
  it('envía multipart/form-data con los campos del contrato y el token', async () => {
    adapter.mockImplementation((config) => respond(config, 201, EVIDENCE));
    const post = jest.spyOn(apiClient, 'post');

    const result = await evidenceService.uploadEvidence({
      orderId: '31',
      file: FILE,
      context: 'reparacion',
    });

    expect(adapter).toHaveBeenCalledTimes(1);
    const [config] = adapter.mock.calls[0];
    expect(config.method).toBe('post');
    expect(config.url).toBe('/evidencias');
    expect(String(config.headers['Content-Type'])).toBe('multipart/form-data');
    expect(config.headers.Authorization).toBe('Bearer token-de-prueba');
    expect(post.mock.calls[0][1]).toBeInstanceOf(ReactNativeFormData);
    expect(sentFormEntries(post)).toEqual({
      orden_id: '31',
      contexto: 'reparacion',
      archivo: { uri: FILE.uri, name: 'captura.jpg', type: 'image/jpeg' },
    });

    expect(result).toEqual({
      id: EVIDENCE.evidencia_id,
      orderId: '31',
      budgetId: null,
      context: 'reparacion',
      fileKind: 'foto',
      visibleToClient: true,
      status: 'confirmada',
      originalName: 'captura.jpg',
      contentType: 'image/jpeg',
      sizeBytes: 2048,
      createdAt: '2026-10-28T15:00:00Z',
    });
  });

  it('no envía identificadores de usuario: el autor lo determina MS4', async () => {
    adapter.mockImplementation((config) => respond(config, 201, EVIDENCE));
    const post = jest.spyOn(apiClient, 'post');
    await evidenceService.uploadEvidence({ orderId: '31', file: FILE, context: 'diagnostico' });

    const fields = Object.keys(sentFormEntries(post));
    expect(fields.sort()).toEqual(['archivo', 'contexto', 'orden_id']);
  });

  it.each([
    ['', 'vacío'],
    ['abc', 'no numérico'],
    ['0', 'cero'],
    ['-3', 'negativo'],
    ['31/../32', 'manipulado'],
  ])('rechaza el identificador de orden %s (%s) sin contactar al servidor', async (orderId) => {
    await expect(
      evidenceService.uploadEvidence({ orderId, file: FILE, context: 'reparacion' }),
    ).rejects.toMatchObject({ code: 'EVIDENCE_INVALID_ORDER' });
    expect(adapter).not.toHaveBeenCalled();
  });

  it.each([
    ['vacío', { size: 0 }, 'EVIDENCE_FILE_EMPTY_FILE'],
    ['demasiado grande', { size: 50 * 1024 * 1024 }, 'EVIDENCE_FILE_TOO_LARGE'],
    ['de tipo no permitido', { mimeType: 'video/mp4' as never, name: 'a.mp4' }, 'EVIDENCE_FILE_UNSUPPORTED_TYPE'],
    ['con URI remota', { uri: 'https://example.com/a.jpg' }, 'EVIDENCE_FILE_INVALID_URI'],
  ])('no invoca al cliente HTTP con un archivo %s', async (_label, overrides, code) => {
    const post = jest.spyOn(apiClient, 'post');

    await expect(
      evidenceService.uploadEvidence({
        orderId: '31',
        file: { ...FILE, ...overrides },
        context: 'reparacion',
      }),
    ).rejects.toMatchObject({ code });

    expect(post).not.toHaveBeenCalled();
    expect(adapter).not.toHaveBeenCalled();
  });

  it('rechaza una respuesta que asocia la evidencia a otra orden', async () => {
    adapter.mockImplementation((config) => respond(config, 201, { ...EVIDENCE, orden_id: 32 }));

    await expect(
      evidenceService.uploadEvidence({ orderId: '31', file: FILE, context: 'reparacion' }),
    ).rejects.toMatchObject({ code: 'EVIDENCE_INVALID_RESPONSE' });
  });

  it('rechaza una respuesta 201 que no cumple el contrato', async () => {
    adapter.mockImplementation((config) => respond(config, 201, { ok: true }));

    await expect(
      evidenceService.uploadEvidence({ orderId: '31', file: FILE, context: 'reparacion' }),
    ).rejects.toBeInstanceOf(EvidenceServiceError);
  });

  it.each([
    [404, 'La orden no existe o no está asignada a tu usuario.'],
    [409, 'La orden está entregada o cancelada: ya no admite evidencias.'],
    [413, 'La fotografía supera el tamaño máximo que acepta el servidor.'],
    [415, 'El servidor no aceptó el formato de la fotografía.'],
  ])('traduce el %s de MS4 a un mensaje comprensible', async (status, message) => {
    adapter.mockImplementation((config) => respond(config, status, {}));

    await expect(
      evidenceService.uploadEvidence({ orderId: '31', file: FILE, context: 'reparacion' }),
    ).rejects.toMatchObject({ status, message });
  });

  it('prefiere el detalle legible que entrega el servidor', async () => {
    adapter.mockImplementation((config) =>
      respond(config, 422, { detail: 'El presupuesto no pertenece a la orden' }),
    );

    await expect(
      evidenceService.uploadEvidence({ orderId: '31', file: FILE, context: 'reparacion' }),
    ).rejects.toMatchObject({ status: 422, message: 'El presupuesto no pertenece a la orden' });
  });

  it('nunca reintenta automáticamente el POST de la evidencia', async () => {
    adapter.mockImplementation((config) => respond(config, 503, {}));

    await expect(
      evidenceService.uploadEvidence({ orderId: '31', file: FILE, context: 'reparacion' }),
    ).rejects.toMatchObject({ status: 503 });
    expect(adapter).toHaveBeenCalledTimes(1);
  });
});
