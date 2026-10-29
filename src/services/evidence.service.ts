import { isAxiosError } from 'axios';

import { apiClient } from '@/services/api/client';
import { normalizeApiError } from '@/services/api/interceptors';
import {
  InvalidEvidenceResponseError,
  mapEvidenceResponse,
} from '@/mappers/evidence.mapper';
import type {
  Evidence,
  EvidenceContext,
  EvidenceFile,
} from '@/models/evidence.model';
import { validateEvidenceFile } from '@/utils/evidence-file';

/** Error de la capa de evidencias con el estado HTTP cuando existe. */
export class EvidenceServiceError extends Error {
  readonly status?: number;
  readonly code: string;

  constructor(message: string, code: string, status?: number) {
    super(message);
    this.name = 'EvidenceServiceError';
    this.code = code;
    this.status = status;
  }
}

/** Mensajes según las respuestas documentadas por MS4 para `POST /evidencias`. */
const UPLOAD_MESSAGES: Record<number, string> = {
  400: 'El servidor no pudo leer la fotografía enviada.',
  403: 'Solo el mecánico asignado o un administrador pueden subir evidencias.',
  404: 'La orden no existe o no está asignada a tu usuario.',
  409: 'La orden está entregada o cancelada: ya no admite evidencias.',
  413: 'La fotografía supera el tamaño máximo que acepta el servidor.',
  415: 'El servidor no aceptó el formato de la fotografía.',
  422: 'La fotografía está vacía o dañada, o los datos de la evidencia no son válidos.',
  503: 'El servicio de evidencias no está disponible. La fotografía no se guardó.',
};

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

function toServiceError(error: unknown, fallback: string): EvidenceServiceError {
  if (error instanceof EvidenceServiceError) return error;
  if (error instanceof InvalidEvidenceResponseError) {
    return new EvidenceServiceError(error.message, 'EVIDENCE_INVALID_RESPONSE');
  }

  const normalized = normalizeApiError(error);
  const status = normalized.status;
  if (normalized.isTimeout) {
    return new EvidenceServiceError(normalized.message, 'EVIDENCE_TIMEOUT');
  }
  if (normalized.isNetworkError) {
    return new EvidenceServiceError(normalized.message, 'EVIDENCE_NETWORK_ERROR');
  }

  const detail = isAxiosError(error) ? error.response?.data?.detail : undefined;
  const message =
    (typeof detail === 'string' && detail.trim()) ||
    (status !== undefined && UPLOAD_MESSAGES[status]) ||
    normalized.message ||
    fallback;

  return new EvidenceServiceError(message, `EVIDENCE_HTTP_${status ?? 'ERROR'}`, status);
}

export interface UploadEvidenceInput {
  orderId: string;
  file: EvidenceFile;
  context: EvidenceContext;
}

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
  async uploadEvidence({ orderId, file, context }: UploadEvidenceInput): Promise<Evidence> {
    const ordenId = requirePositiveId(orderId);

    // Revalida aunque la vista ya lo haya hecho: un archivo inválido nunca
    // llega al cliente HTTP.
    const validation = validateEvidenceFile(
      { uri: file.uri, fileName: file.name, fileSize: file.size, mimeType: file.mimeType },
      file.source,
    );
    if (!validation.ok) {
      throw new EvidenceServiceError(validation.message, `EVIDENCE_FILE_${validation.code}`);
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
      const response = await apiClient.post('/evidencias', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const evidence = mapEvidenceResponse(response.data);
      if (evidence.orderId !== String(ordenId)) {
        throw new InvalidEvidenceResponseError();
      }
      return evidence;
    } catch (error: unknown) {
      throw toServiceError(error, 'No fue posible subir la evidencia.');
    }
  }
}

export const evidenceService = new EvidenceService();
