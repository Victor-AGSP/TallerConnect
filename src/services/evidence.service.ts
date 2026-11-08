import { apiClient } from '@/services/api/client';
import { HTTP_STATUS } from '@/services/api/types';
import {
  ServiceError,
  normalizeEvidenceServiceError,
} from '@/services/service-error';
import type {
  Evidence,
  EvidenceContext,
  EvidenceDownloadUrl as ModelEvidenceDownloadUrl,
  SelectedMediaAsset,
  EvidenceFile,
} from '@/models/evidence.model';
import type {
  EvidenceDownloadUrlResponseDto,
  EvidenceResponseDto,
  ReactNativeFormDataFile,
  UploadEvidenceRequestDto,
} from '@/dto/evidence.dto';
import {
  buildEvidenceFormData,
  mapEvidenceDownloadUrlResponse,
  mapEvidenceListResponse,
  mapEvidenceResponse,
  toFormDataFilePart,
  InvalidEvidenceResponseError,
  mapEvidenceDownloadResponse,
} from '@/mappers/evidence.mapper';
import { mockEvidences } from '@/mocks/evidences.mock';
import { isAxiosError, isCancel } from 'axios';
import { normalizeApiError } from '@/services/api/interceptors';
import { validateEvidenceFile } from '@/utils/evidence-file';
import {
  useEvidenceUploadStore,
  type EvidenceUploadProgressCallback,
} from '@/stores/evidenceUploadStore';
import {
  captureMediaFromCamera,
  isAllowedEvidenceMimeType,
  pickMediaFromLibrary,
  type MediaPickerOptions,
} from '@/utils/media-picker';

export { ServiceError, normalizeEvidenceServiceError };

const USE_MOCKS = process.env.EXPO_PUBLIC_USE_MOCK_AUTH === 'true';

/**
 * Tamaño máximo de referencia en el adaptador simulado (50 MB para video, 15 MB para imagen).
 */
export const MAX_IMAGE_SIZE_BYTES = 15 * 1024 * 1024;
export const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024;

/**
 * Opciones adicionales durante la subida de una evidencia multimedia.
 */
export interface EvidenceUploadOptions {
  onProgress?: EvidenceUploadProgressCallback;
  requestId?: string;
}

/**
 * Parámetros para capturar o elegir desde el dispositivo y subir directamente a MS4.
 */
export interface PickAndUploadEvidenceParams {
  orden_id: number | string;
  contexto: EvidenceContext;
  presupuesto_id?: number | string | null;
  visible_cliente?: boolean | null;
}

const VALID_EVIDENCE_CONTEXTS: readonly EvidenceContext[] = [
  'diagnostico',
  'presupuesto',
  'reparacion',
  'resultado_final',
] as const;

function extractFileSize(
  archivo: UploadEvidenceRequestDto['archivo']
): number | undefined {
  if (typeof archivo === 'object' && archivo !== null) {
    if ('fileSize' in archivo && typeof archivo.fileSize === 'number') {
      return archivo.fileSize;
    }
    if ('size' in archivo && typeof (archivo as Blob).size === 'number') {
      return (archivo as Blob).size;
    }
  }
  return undefined;
}

/**
 * Contrato común para los adaptadores (Mock y Real HTTP) de Evidencia Multimedia (MS4).
 */
export interface EvidenceServiceAdapter {
  uploadEvidence(
    data: UploadEvidenceRequestDto,
    options?: EvidenceUploadOptions
  ): Promise<Evidence>;
  getEvidencesByOrder(orderId: string | number): Promise<Evidence[]>;
  getEvidenceById(id: string): Promise<Evidence>;
  getEvidenceDownloadUrl(id: string): Promise<ModelEvidenceDownloadUrl>;
  resetMocks?(): void;
}

/**
 * Adaptador simulado (Mock) en memoria para subida, listado y descarga de evidencias multimedia.
 */
export class MockEvidenceAdapter implements EvidenceServiceAdapter {
  private evidences: Evidence[];
  private nextSeq = 10;
  private readonly delayMs: number;

  constructor(initialEvidences: Evidence[] = mockEvidences, delayMs = 0) {
    this.evidences = initialEvidences.map((e) => ({ ...e }));
    this.delayMs = delayMs;
  }

  private async simulateDelay(): Promise<void> {
    if (this.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    }
  }

  resetMocks(initialEvidences: Evidence[] = mockEvidences): void {
    this.evidences = initialEvidences.map((e) => ({ ...e }));
    this.nextSeq = 10;
  }

  async uploadEvidence(
    data: UploadEvidenceRequestDto,
    options?: EvidenceUploadOptions
  ): Promise<Evidence> {
    await this.simulateDelay();

    const orderIdStr = String(data.orden_id ?? '').trim();
    if (!orderIdStr || orderIdStr === '0') {
      throw new ServiceError({
        message: 'El identificador de la orden (orden_id) debe ser un entero positivo.',
        status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
        code: 'EVIDENCE_VALIDATION_ERROR',
        domain: 'evidences',
      });
    }

    if (!VALID_EVIDENCE_CONTEXTS.includes(data.contexto)) {
      throw new ServiceError({
        message: 'El contexto de la evidencia no es válido.',
        status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
        code: 'EVIDENCE_VALIDATION_ERROR',
        domain: 'evidences',
      });
    }

    const filePart = toFormDataFilePart(data.archivo) as ReactNativeFormDataFile;
    if (!filePart || ('uri' in filePart && !filePart.uri.trim())) {
      throw new ServiceError({
        message: 'No se pudo leer el archivo enviado.',
        status: HTTP_STATUS.BAD_REQUEST,
        code: 'EVIDENCE_BAD_FILE',
        domain: 'evidences',
      });
    }

    const mimeType = ('type' in filePart ? filePart.type : 'image/jpeg').toLowerCase();
    if (!isAllowedEvidenceMimeType(mimeType)) {
      throw new ServiceError({
        message: 'Formato no permitido: solo JPG, PNG, WEBP, MP4 y MOV.',
        status: HTTP_STATUS.UNSUPPORTED_MEDIA_TYPE,
        code: 'EVIDENCE_UNSUPPORTED_MEDIA',
        domain: 'evidences',
      });
    }

    const isVideo = mimeType.startsWith('video/');
    const maxBytes = isVideo ? MAX_VIDEO_SIZE_BYTES : MAX_IMAGE_SIZE_BYTES;
    const rawSize = extractFileSize(data.archivo) ?? 256000;

    if (rawSize <= 0) {
      throw new ServiceError({
        message: 'El archivo enviado está vacío o dañado.',
        status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
        code: 'EVIDENCE_VALIDATION_ERROR',
        domain: 'evidences',
      });
    }

    if (rawSize > maxBytes) {
      throw new ServiceError({
        message: 'El archivo supera el tamaño máximo de su tipo (foto o video).',
        status: HTTP_STATUS.PAYLOAD_TOO_LARGE,
        code: 'EVIDENCE_TOO_LARGE',
        domain: 'evidences',
      });
    }

    const store = useEvidenceUploadStore.getState();
    store.startUpload(orderIdStr, rawSize);

    const halfEvent = store.updateProgress(Math.floor(rawSize / 2), rawSize);
    options?.onProgress?.(halfEvent);

    const fullEvent = store.updateProgress(rawSize, rawSize);
    options?.onProgress?.(fullEvent);

    const seq = this.nextSeq++;
    const newEvidence: Evidence = {
      id: `550e8400-e29b-41d4-a716-4466554400${seq}`,
      orderId: orderIdStr,
      budgetId:
        data.presupuesto_id !== undefined && data.presupuesto_id !== null
          ? String(data.presupuesto_id)
          : null,
      context: data.contexto,
      fileKind: isVideo ? 'video' : 'foto',
      visibleToClient: data.visible_cliente ?? true,
      status: 'confirmada',
      originalName: 'name' in filePart ? filePart.name : `evidencia_${seq}.jpg`,
      contentType: mimeType,
      sizeBytes: rawSize,
      createdAt: new Date().toISOString(),
    };

    this.evidences.unshift(newEvidence);
    store.completeUpload(newEvidence);

    return { ...newEvidence };
  }

  async getEvidencesByOrder(orderId: string | number): Promise<Evidence[]> {
    await this.simulateDelay();
    const orderIdStr = String(orderId ?? '').trim();
    if (!orderIdStr || orderIdStr === '0') {
      throw new ServiceError({
        message: 'Falta orden_id o no es un entero positivo.',
        status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
        code: 'EVIDENCE_VALIDATION_ERROR',
        domain: 'evidences',
      });
    }

    return this.evidences
      .filter((e) => e.orderId === orderIdStr)
      .map((e) => ({ ...e }));
  }

  async getEvidenceById(id: string): Promise<Evidence> {
    await this.simulateDelay();
    const targetId = String(id ?? '').trim();
    const found = this.evidences.find((e) => e.id === targetId);
    if (!found) {
      throw new ServiceError({
        message: 'Evidencia inexistente o fuera del alcance del solicitante.',
        status: HTTP_STATUS.NOT_FOUND,
        code: 'EVIDENCE_NOT_FOUND',
        domain: 'evidences',
      });
    }
    return { ...found };
  }

  async getEvidenceDownloadUrl(id: string): Promise<ModelEvidenceDownloadUrl> {
    const found = await this.getEvidenceById(id);
    return {
      url: `https://storage.tallerconect.vercel.app/evidencias/${found.id}?X-Amz-Expires=300`,
      expiresInSeconds: 300,
    };
  }
}

/**
 * Adaptador HTTP real conectado a la API Gateway (`/evidencias` en MS4).
 */
export class RealEvidenceAdapter implements EvidenceServiceAdapter {
  async uploadEvidence(
    data: UploadEvidenceRequestDto,
    options?: EvidenceUploadOptions
  ): Promise<Evidence> {
    const formData = buildEvidenceFormData(data);
    const knownSize = extractFileSize(data.archivo) ?? null;
    const store = useEvidenceUploadStore.getState();

    store.startUpload(data.orden_id, knownSize);

    const headers: Record<string, string> = {
      'Content-Type': 'multipart/form-data',
    };
    if (options?.requestId) {
      headers['X-Request-ID'] = options.requestId;
    }

    const response = await apiClient.post<EvidenceResponseDto>(
      '/evidencias',
      formData,
      {
        headers,
        onUploadProgress: (progressEvent) => {
          const loaded = progressEvent.loaded ?? 0;
          const total = progressEvent.total ?? knownSize ?? undefined;
          const event = useEvidenceUploadStore
            .getState()
            .updateProgress(loaded, total);
          options?.onProgress?.(event);
        },
      }
    );

    const mapped = mapEvidenceResponse(response.data);
    useEvidenceUploadStore.getState().completeUpload(mapped);
    return mapped;
  }

  async getEvidencesByOrder(orderId: string | number): Promise<Evidence[]> {
    const numericOrderId = Number(orderId);
    const resolvedOrderId = Number.isNaN(numericOrderId)
      ? orderId
      : numericOrderId;

    const response = await apiClient.get<EvidenceResponseDto[]>('/evidencias', {
      params: { orden_id: resolvedOrderId },
    });
    return mapEvidenceListResponse(response.data);
  }

  async getEvidenceById(id: string): Promise<Evidence> {
    const response = await apiClient.get<EvidenceResponseDto>(
      `/evidencias/${encodeURIComponent(String(id))}`
    );
    return mapEvidenceResponse(response.data);
  }

  async getEvidenceDownloadUrl(id: string): Promise<ModelEvidenceDownloadUrl> {
    const response = await apiClient.get<EvidenceDownloadUrlResponseDto>(
      `/evidencias/${encodeURIComponent(String(id))}/descarga`
    );
    return mapEvidenceDownloadUrlResponse(response.data);
  }
}

/**
 * Servicio de Evidencia Multimedia con soporte para `multipart/form-data`,
 * seguimiento de progreso de carga, integración con cámara/galería y adaptador Mock/Real.
 */
export class EvidencesService {
  private adapter: EvidenceServiceAdapter;
  private readonly mockAdapter: MockEvidenceAdapter;
  private readonly realAdapter: RealEvidenceAdapter;

  constructor(customAdapter?: EvidenceServiceAdapter) {
    this.mockAdapter = new MockEvidenceAdapter(mockEvidences, 0);
    this.realAdapter = new RealEvidenceAdapter();
    this.adapter =
      customAdapter ?? (USE_MOCKS ? this.mockAdapter : this.realAdapter);
  }

  /**
   * Permite inyectar un adaptador personalizado.
   */
  setAdapter(adapter: EvidenceServiceAdapter): void {
    this.adapter = adapter;
  }

  /**
   * Activa el adaptador simulado en memoria.
   */
  useMockAdapter(): MockEvidenceAdapter {
    this.adapter = this.mockAdapter;
    return this.mockAdapter;
  }

  /**
   * Activa el adaptador HTTP real conectado a `apiClient`.
   */
  useRealAdapter(): RealEvidenceAdapter {
    this.adapter = this.realAdapter;
    return this.realAdapter;
  }

  /**
   * Restaura el estado inicial de las evidencias simuladas y del store de progreso.
   */
  resetMocks(): void {
    this.mockAdapter.resetMocks(mockEvidences);
    useEvidenceUploadStore.getState().resetUploadState();
  }

  /**
   * Sube una evidencia multimedia (`multipart/form-data`) asociada a una orden de trabajo.
   * Ruta Gateway: POST /api/evidencias
   */
  async uploadEvidence(
    data: UploadEvidenceRequestDto,
    options?: EvidenceUploadOptions
  ): Promise<Evidence> {
    try {
      return await this.adapter.uploadEvidence(data, options);
    } catch (error: unknown) {
      const normalized = normalizeEvidenceServiceError(
        error,
        'No fue posible subir la evidencia multimedia.'
      );
      useEvidenceUploadStore.getState().failUpload(normalized.message);
      throw normalized;
    }
  }

  /**
   * Captura una foto o video con la cámara del dispositivo (gestionando permisos) y lo sube a MS4.
   * Devuelve `null` si el usuario cancela la captura.
   */
  async captureAndUploadEvidence(
    params: PickAndUploadEvidenceParams,
    options?: EvidenceUploadOptions & MediaPickerOptions
  ): Promise<Evidence | null> {
    useEvidenceUploadStore.getState().startPreparing(params.orden_id);
    try {
      const asset: SelectedMediaAsset | null = await captureMediaFromCamera(
        options
      );
      if (!asset) {
        useEvidenceUploadStore.getState().resetUploadState();
        return null;
      }

      return await this.uploadEvidence(
        {
          archivo: asset,
          orden_id: params.orden_id,
          contexto: params.contexto,
          presupuesto_id: params.presupuesto_id,
          visible_cliente: params.visible_cliente,
        },
        options
      );
    } catch (error: unknown) {
      const normalized = normalizeEvidenceServiceError(
        error,
        'No fue posible capturar o subir la evidencia desde la cámara.'
      );
      useEvidenceUploadStore.getState().failUpload(normalized.message);
      throw normalized;
    }
  }

  /**
   * Selecciona una foto o video de la galería del dispositivo (gestionando permisos) y lo sube a MS4.
   * Devuelve `null` si el usuario cancela la selección.
   */
  async pickAndUploadEvidence(
    params: PickAndUploadEvidenceParams,
    options?: EvidenceUploadOptions & MediaPickerOptions
  ): Promise<Evidence | null> {
    useEvidenceUploadStore.getState().startPreparing(params.orden_id);
    try {
      const asset: SelectedMediaAsset | null = await pickMediaFromLibrary(
        options
      );
      if (!asset) {
        useEvidenceUploadStore.getState().resetUploadState();
        return null;
      }

      return await this.uploadEvidence(
        {
          archivo: asset,
          orden_id: params.orden_id,
          contexto: params.contexto,
          presupuesto_id: params.presupuesto_id,
          visible_cliente: params.visible_cliente,
        },
        options
      );
    } catch (error: unknown) {
      const normalized = normalizeEvidenceServiceError(
        error,
        'No fue posible seleccionar o subir la evidencia desde la galería.'
      );
      useEvidenceUploadStore.getState().failUpload(normalized.message);
      throw normalized;
    }
  }

  /**
   * Lista las evidencias visibles asociadas a una orden de trabajo.
   * Ruta Gateway: GET /api/evidencias?orden_id={orden_id}
   */
  async getEvidencesByOrder(orderId: string | number): Promise<Evidence[]> {
    try {
      return await this.adapter.getEvidencesByOrder(orderId);
    } catch (error: unknown) {
      throw normalizeEvidenceServiceError(
        error,
        'No fue posible cargar las evidencias de la orden.'
      );
    }
  }

  /**
   * Obtiene los metadatos de una evidencia por su UUID.
   * Ruta Gateway: GET /api/evidencias/{evidencia_id}
   */
  async getEvidenceById(id: string): Promise<Evidence> {
    try {
      return await this.adapter.getEvidenceById(id);
    } catch (error: unknown) {
      throw normalizeEvidenceServiceError(
        error,
        'No fue posible cargar el detalle de la evidencia.'
      );
    }
  }

  /**
   * Obtiene una URL prefirmada de corta duración para visualizar o descargar la evidencia.
   * Ruta Gateway: GET /api/evidencias/{evidencia_id}/descarga
   */
  async getEvidenceDownloadUrl(id: string): Promise<ModelEvidenceDownloadUrl> {
    try {
      return await this.adapter.getEvidenceDownloadUrl(id);
    } catch (error: unknown) {
      throw normalizeEvidenceServiceError(
        error,
        'No fue posible obtener el enlace de descarga de la evidencia.'
      );
    }
  }
}

export class EvidenceService extends EvidencesService {
  private readonly legacy = new LegacyEvidenceService();

  // APIs modernas (MS4) y API previa usada por las pantallas de Victor.
  uploadEvidence(data: UploadEvidenceRequestDto, options?: EvidenceUploadOptions): Promise<Evidence>;
  uploadEvidence(data: UploadEvidenceInput, options?: LegacyUploadEvidenceOptions): Promise<Evidence>;
  uploadEvidence(
    data: UploadEvidenceRequestDto | UploadEvidenceInput,
    options?: EvidenceUploadOptions | LegacyUploadEvidenceOptions,
  ): Promise<Evidence> {
    if ('orderId' in data) {
      return this.legacy.uploadEvidence(data, options as LegacyUploadEvidenceOptions);
    }
    return super.uploadEvidence(data, options as EvidenceUploadOptions);
  }
  listEvidence(orderId: string): Promise<Evidence[]> {
    return this.legacy.listEvidence(orderId);
  }
  getDownloadUrl(evidenceId: string): Promise<LegacyEvidenceDownloadUrl> {
    return this.legacy.getDownloadUrl(evidenceId);
  }
  findUploadedEvidence(orderId: string, file: Pick<EvidenceFile, 'name' | 'size'>, sinceMs: number): Promise<Evidence | null> {
    return this.legacy.findUploadedEvidence(orderId, file, sinceMs);
  }
}

// Victor: control de duplicados en envíos inciertos, timeout y verificación por UUID.
/**
 * Qué se sabe del resultado de una operación fallida:
 * - `rejected`: el servidor la rechazó (o no se envió); repetirla igual no sirve.
 * - `retryable`: el servidor garantiza que no guardó nada; se puede repetir.
 * - `uncertain`: no hay confirmación (timeout, red, cancelación, 5xx o 2xx
 *   inválido); el archivo pudo guardarse y hay que comprobarlo antes de repetir.
 * - `session`: JWT ausente o expirado (401); el interceptor cierra la sesión.
 */
export type EvidenceErrorOutcome = 'rejected' | 'retryable' | 'uncertain' | 'session';

/** Error de la capa de evidencias con el estado HTTP cuando existe. */
export class EvidenceServiceError extends Error {
  readonly status?: number;
  readonly code: string;
  readonly outcome: EvidenceErrorOutcome;

  constructor(
    message: string,
    code: string,
    status?: number,
    outcome: EvidenceErrorOutcome = 'rejected',
  ) {
    super(message);
    this.name = 'EvidenceServiceError';
    this.code = code;
    this.status = status;
    this.outcome = outcome;
  }
}

/**
 * Tiempo máximo de una subida (política local): una fotografía tarda más que
 * una consulta, por eso no se usa el timeout general de 15 s.
 */
export const EVIDENCE_UPLOAD_TIMEOUT_MS = 60_000;

/** Mensajes según las respuestas documentadas por MS4 para `POST /evidencias`. */
const UPLOAD_MESSAGES: Record<number, string> = {
  400: 'El servidor no pudo leer la fotografía enviada.',
  403: 'Solo el mecánico asignado o un administrador pueden subir evidencias.',
  404: 'La orden no existe o no está asignada a tu usuario.',
  409: 'La orden está entregada o cancelada: ya no admite evidencias.',
  413: 'La fotografía supera el tamaño máximo que acepta el servidor.',
  415: 'El servidor no aceptó el formato de la fotografía.',
  422: 'La fotografía está vacía o dañada, o los datos de la evidencia no son válidos.',
  429: 'Demasiadas solicitudes. Espera un momento antes de reintentar.',
  503: 'El servicio de evidencias no está disponible. La fotografía no se guardó.',
};

/** Mensajes de las consultas (`GET /evidencias...`). */
const QUERY_MESSAGES: Record<number, string> = {
  403: 'No tienes permisos para ver las evidencias de esta orden.',
  404: 'La orden no existe o no tienes acceso a sus evidencias.',
  503: 'El servicio de evidencias no está disponible. Intenta nuevamente.',
};

/** Respuestas tras las que MS4 garantiza que no quedó nada guardado. */
const RETRYABLE_STATUSES = [429, 503];

/** Identificador entero positivo, como exige el contrato. */
function requirePositiveId(id: string): number {
  if (!/^[1-9]\d*$/.test(id)) {
    throw new EvidenceServiceError(
      'El identificador de la orden no es válido.',
      'EVIDENCE_INVALID_ORDER',
    );
  }
  return Number(id);
}

/**
 * Normaliza un error. En una subida (`mutation`), todo lo que no confirma un
 * rechazo del servidor se considera incierto.
 */
function toServiceError(
  error: unknown,
  fallback: string,
  phase: 'mutation' | 'query',
): EvidenceServiceError {
  if (error instanceof EvidenceServiceError) return error;

  const unconfirmed: EvidenceErrorOutcome = phase === 'mutation' ? 'uncertain' : 'retryable';

  if (error instanceof InvalidEvidenceResponseError) {
    return new EvidenceServiceError(
      error.message,
      'EVIDENCE_INVALID_RESPONSE',
      undefined,
      phase === 'mutation' ? 'uncertain' : 'rejected',
    );
  }
  if (isCancel(error)) {
    return new EvidenceServiceError('El envío se canceló.', 'EVIDENCE_CANCELED', undefined, unconfirmed);
  }

  const normalized = normalizeApiError(error);
  const status = normalized.status;
  if (normalized.isTimeout) {
    return new EvidenceServiceError(normalized.message, 'EVIDENCE_TIMEOUT', undefined, unconfirmed);
  }
  if (normalized.isNetworkError) {
    return new EvidenceServiceError(
      normalized.message,
      'EVIDENCE_NETWORK_ERROR',
      undefined,
      unconfirmed,
    );
  }

  const messages = phase === 'mutation' ? UPLOAD_MESSAGES : QUERY_MESSAGES;
  const detail = isAxiosError(error) ? error.response?.data?.detail : undefined;
  const message =
    (typeof detail === 'string' && detail.trim()) ||
    (status !== undefined && messages[status]) ||
    normalized.message ||
    fallback;

  let outcome: EvidenceErrorOutcome = 'rejected';
  if (status === 401) outcome = 'session';
  else if (status !== undefined && RETRYABLE_STATUSES.includes(status)) outcome = 'retryable';
  else if (status !== undefined && status >= 500) outcome = unconfirmed;

  return new EvidenceServiceError(message, `EVIDENCE_HTTP_${status ?? 'ERROR'}`, status, outcome);
}

export interface UploadEvidenceInput {
  orderId: string;
  file: EvidenceFile;
  context: EvidenceContext;
}

export interface LegacyUploadEvidenceOptions {
  /** Cancela la solicitud en curso. */
  signal?: AbortSignal;
  /** Progreso real (0..1); solo se informa cuando la plataforma conoce el total. */
  onProgress?: (fraction: number) => void;
}

/** Alias público conservado para los consumidores de Victor. */
export type UploadEvidenceOptions = LegacyUploadEvidenceOptions;

/** URL prefirmada de corta duración para mostrar una evidencia. */
export type EvidenceDownloadUrl = LegacyEvidenceDownloadUrl;

export interface LegacyEvidenceDownloadUrl {
  url: string;
  /** Instante (ms, reloj del dispositivo) desde el que ya no debe usarse. */
  expiresAt: number;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Margen ante relojes desfasados entre el dispositivo y el servidor. */
const CLOCK_SKEW_MS = 5 * 60_000;

/**
 * Evidencias fotográficas de las órdenes (MS4) a través de la API Gateway.
 */
class LegacyEvidenceService {
  /**
   * Sube una fotografía de la orden. El autor lo determina MS4 desde el JWT;
   * la app no envía identificadores de usuario.
   *
   * Ruta Gateway: POST /api/evidencias (multipart/form-data)
   */
  async uploadEvidence(
    { orderId, file, context }: UploadEvidenceInput,
    options: LegacyUploadEvidenceOptions = {},
  ): Promise<Evidence> {
    const ordenId = requirePositiveId(orderId);

    // Revalida aunque la vista ya lo haya hecho: un archivo inválido nunca
    // llega al cliente HTTP.
    const validation = validateEvidenceFile(
      { uri: file.uri, fileName: file.name, fileSize: file.size, mimeType: file.mimeType },
      file.source,
    );
    if (!validation.ok) {
      throw new EvidenceServiceError(
        validation.message,
        `EVIDENCE_FILE_${validation.code}`,
      );
    }

    const form = new FormData();
    form.append('orden_id', String(ordenId));
    form.append('contexto', context);
    // En web se envía el `File` entregado por el selector; en Android/iOS el
    // FormData de React Native recibe el archivo por referencia ({ uri, name, type }).
    if (file.webFile) {
      form.append('archivo', file.webFile, file.name);
    } else {
      form.append('archivo', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType,
      } as unknown as Blob);
    }

    try {
      // El Content-Type explícito evita que axios convierta el FormData a JSON
      // (el cliente usa application/json por omisión); el límite del multipart
      // lo agrega la plataforma.
      // Un POST nunca se reintenta automáticamente (ver `attachRetryInterceptor`).
      const { onProgress } = options;
      const response = await apiClient.post('/evidencias', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: EVIDENCE_UPLOAD_TIMEOUT_MS,
        signal: options.signal,
        onUploadProgress: onProgress
          ? (event) => {
              if (event.total && event.total > 0) {
                onProgress(Math.min(1, event.loaded / event.total));
              }
            }
          : undefined,
      });

      const evidence = mapEvidenceResponse(response.data);
      if (evidence.orderId !== String(ordenId)) {
        throw new InvalidEvidenceResponseError();
      }
      return evidence;
    } catch (error: unknown) {
      throw toServiceError(error, 'No fue posible subir la evidencia.', 'mutation');
    }
  }

  /**
   * Evidencias de una orden según el alcance que MS4 aplica al solicitante
   * (cliente: solo visibles; personal: no eliminadas; administrador: todas).
   *
   * Ruta Gateway: GET /api/evidencias?orden_id={id}
   */
  async listEvidence(orderId: string): Promise<Evidence[]> {
    const ordenId = requirePositiveId(orderId);
    try {
      const response = await apiClient.get('/evidencias', { params: { orden_id: ordenId } });
      const evidence = mapEvidenceListResponse(response.data);
      // Nunca se muestran evidencias de otra orden aunque el servidor las devuelva.
      if (evidence.some((item) => item.orderId !== String(ordenId))) {
        throw new InvalidEvidenceResponseError();
      }
      return evidence;
    } catch (error: unknown) {
      throw toServiceError(error, 'No fue posible cargar las evidencias.', 'query');
    }
  }

  /**
   * URL prefirmada para ver una evidencia. MS4 aplica el mismo alcance que en
   * la lista (404 fuera de alcance) y la URL caduca a los `expira_en`
   * segundos. La URL no se registra ni se guarda: se pide de nuevo al caducar.
   *
   * Ruta Gateway: GET /api/evidencias/{evidencia_id}/descarga
   */
  async getDownloadUrl(evidenceId: string): Promise<LegacyEvidenceDownloadUrl> {
    if (!UUID_PATTERN.test(evidenceId)) {
      throw new EvidenceServiceError(
        'El identificador de la evidencia no es válido.',
        'EVIDENCE_INVALID_ID',
      );
    }
    const requestedAt = Date.now();
    try {
      const response = await apiClient.get(`/evidencias/${evidenceId}/descarga`);
      const { url, expira_en } = mapEvidenceDownloadResponse(response.data);
      return { url, expiresAt: requestedAt + expira_en * 1000 };
    } catch (error: unknown) {
      throw toServiceError(error, 'No fue posible obtener la fotografía.', 'query');
    }
  }

  /**
   * Busca una subida cuyo resultado quedó incierto: misma orden, mismo nombre
   * original y tamaño, creada desde que empezó el intento. Devuelve `null` si
   * el servidor no la tiene. Se usa antes de repetir un envío para no duplicar.
   */
  async findUploadedEvidence(
    orderId: string,
    file: Pick<EvidenceFile, 'name' | 'size'>,
    sinceMs: number,
  ): Promise<Evidence | null> {
    const evidence = await this.listEvidence(orderId);
    const matches = evidence.filter(
      (item) =>
        item.originalName === file.name &&
        item.sizeBytes === file.size &&
        Date.parse(item.createdAt) >= sinceMs - CLOCK_SKEW_MS,
    );
    return matches.length > 0 ? matches[matches.length - 1] : null;
  }
}


// Instanciar después de declarar LegacyEvidenceService.
export const evidenceService = new EvidenceService();
export const evidencesService = evidenceService;
