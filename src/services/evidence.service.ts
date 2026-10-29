import { isAxiosError, isCancel } from 'axios';

import { apiClient } from '@/services/api/client';
import { normalizeApiError } from '@/services/api/interceptors';
import {
  InvalidEvidenceResponseError,
  mapEvidenceListResponse,
  mapEvidenceResponse,
} from '@/mappers/evidence.mapper';
import type {
  Evidence,
  EvidenceContext,
  EvidenceFile,
} from '@/models/evidence.model';
import { validateEvidenceFile } from '@/utils/evidence-file';

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

export interface UploadEvidenceOptions {
  /** Cancela la solicitud en curso. */
  signal?: AbortSignal;
  /** Progreso real (0..1); solo se informa cuando la plataforma conoce el total. */
  onProgress?: (fraction: number) => void;
}

/** Margen ante relojes desfasados entre el dispositivo y el servidor. */
const CLOCK_SKEW_MS = 5 * 60_000;

/**
 * Evidencias fotográficas de las órdenes (MS4) a través de la API Gateway.
 */
export class EvidenceService {
  /**
   * Sube una fotografía de la orden. El autor lo determina MS4 desde el JWT;
   * la app no envía identificadores de usuario.
   *
   * Ruta Gateway: POST /api/evidencias (multipart/form-data)
   */
  async uploadEvidence(
    { orderId, file, context }: UploadEvidenceInput,
    options: UploadEvidenceOptions = {},
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

export const evidenceService = new EvidenceService();
