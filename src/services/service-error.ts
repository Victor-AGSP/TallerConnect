import { normalizeApiError } from '@/services/api/interceptors';
import { HTTP_STATUS, NormalizedApiError } from '@/services/api/types';
import { MediaPermissionError } from '@/utils/media-permissions';

/**
 * Dominios soportados por la normalización de errores de la capa de servicios.
 */
export type ServiceErrorDomain =
  | 'vehicles'
  | 'orders'
  | 'budgets'
  | 'parts'
  | 'providers'
  | 'evidences';

/**
 * Error normalizado de la capa de servicios (Vehículos, Órdenes, Presupuestos, Repuestos, Proveedores y Evidencias).
 * Conserva compatibilidad con `instanceof Error` y expone metadatos estructurados para la UI.
 */
export class ServiceError extends Error {
  readonly status?: number;
  readonly code: string;
  readonly isNetworkError: boolean;
  readonly isTimeout: boolean;
  readonly domain: ServiceErrorDomain;
  readonly originalError?: unknown;

  constructor(params: {
    message: string;
    status?: number;
    code?: string;
    isNetworkError?: boolean;
    isTimeout?: boolean;
    domain: ServiceErrorDomain;
    originalError?: unknown;
  }) {
    super(params.message);
    this.name = 'ServiceError';
    this.status = params.status;
    this.code = params.code ?? 'SERVICE_ERROR';
    this.isNetworkError = Boolean(params.isNetworkError);
    this.isTimeout = Boolean(params.isTimeout);
    this.domain = params.domain;
    this.originalError = params.originalError;
    Object.setPrototypeOf(this, ServiceError.prototype);
  }
}

/**
 * Extrae el mensaje de validación cuando FastAPI (MS2 / MS3 / MS4) devuelve HTTP 422 o un objeto `detail`.
 */
export function extractValidationDetail(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) return null;
  const response = (error as { response?: { data?: { detail?: unknown } } }).response;
  const detail = response?.data?.detail;
  if (typeof detail === 'string' && detail.trim().length > 0) {
    return detail.trim();
  }
  if (Array.isArray(detail) && detail.length > 0) {
    const messages = detail
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object' && 'msg' in item) {
          return String((item as { msg: unknown }).msg);
        }
        return null;
      })
      .filter((msg): msg is string => Boolean(msg));
    if (messages.length > 0) {
      return messages.join('; ');
    }
  }
  return null;
}

/**
 * Normaliza cualquier error originado en VehicleService (adaptador HTTP real o adaptador simulado).
 */
export function normalizeVehicleServiceError(
  error: unknown,
  fallbackMessage: string
): ServiceError {
  if (error instanceof ServiceError) {
    return error;
  }

  const validationMsg = extractValidationDetail(error);
  const normalized: NormalizedApiError = normalizeApiError(error);
  const status = normalized.status;

  let code = 'VEHICLE_SERVICE_ERROR';
  if (normalized.isTimeout) code = 'VEHICLE_TIMEOUT';
  else if (normalized.isNetworkError) code = 'VEHICLE_NETWORK_ERROR';
  else if (status === HTTP_STATUS.UNAUTHORIZED) code = 'VEHICLE_UNAUTHORIZED';
  else if (status === HTTP_STATUS.FORBIDDEN) code = 'VEHICLE_FORBIDDEN';
  else if (status === HTTP_STATUS.NOT_FOUND) code = 'VEHICLE_NOT_FOUND';
  else if (status === HTTP_STATUS.CONFLICT) code = 'VEHICLE_CONFLICT';
  else if (status === HTTP_STATUS.UNPROCESSABLE_ENTITY) code = 'VEHICLE_VALIDATION_ERROR';
  else if (status && status >= 500) code = 'VEHICLE_SERVER_ERROR';

  const message = validationMsg || normalized.message || fallbackMessage;

  return new ServiceError({
    message,
    status,
    code,
    isNetworkError: normalized.isNetworkError,
    isTimeout: normalized.isTimeout,
    domain: 'vehicles',
    originalError: error,
  });
}

/**
 * Normaliza cualquier error originado en OrderService (adaptador HTTP real o adaptador simulado).
 */
export function normalizeOrderServiceError(
  error: unknown,
  fallbackMessage: string
): ServiceError {
  if (error instanceof ServiceError) {
    return error;
  }

  const validationMsg = extractValidationDetail(error);
  const normalized: NormalizedApiError = normalizeApiError(error);
  const status = normalized.status;

  let code = 'ORDER_SERVICE_ERROR';
  if (normalized.isTimeout) code = 'ORDER_TIMEOUT';
  else if (normalized.isNetworkError) code = 'ORDER_NETWORK_ERROR';
  else if (status === HTTP_STATUS.UNAUTHORIZED) code = 'ORDER_UNAUTHORIZED';
  else if (status === HTTP_STATUS.FORBIDDEN) code = 'ORDER_FORBIDDEN';
  else if (status === HTTP_STATUS.NOT_FOUND) code = 'ORDER_NOT_FOUND';
  else if (status === HTTP_STATUS.CONFLICT) code = 'ORDER_CONFLICT';
  else if (status === HTTP_STATUS.UNPROCESSABLE_ENTITY) code = 'ORDER_VALIDATION_ERROR';
  else if (status && status >= 500) code = 'ORDER_SERVER_ERROR';

  const message = validationMsg || normalized.message || fallbackMessage;

  return new ServiceError({
    message,
    status,
    code,
    isNetworkError: normalized.isNetworkError,
    isTimeout: normalized.isTimeout,
    domain: 'orders',
    originalError: error,
  });
}

/**
 * Normaliza cualquier error originado en BudgetService (adaptador HTTP real o adaptador simulado).
 * Contempla HTTP 503 cuando MS3 guarda la operación pero falla la coordinación con MS2.
 */
export function normalizeBudgetServiceError(
  error: unknown,
  fallbackMessage: string
): ServiceError {
  if (error instanceof ServiceError) {
    return error;
  }

  const validationMsg = extractValidationDetail(error);
  const normalized: NormalizedApiError = normalizeApiError(error);
  const status = normalized.status;

  let code = 'BUDGET_SERVICE_ERROR';
  if (normalized.isTimeout) code = 'BUDGET_TIMEOUT';
  else if (normalized.isNetworkError) code = 'BUDGET_NETWORK_ERROR';
  else if (status === HTTP_STATUS.UNAUTHORIZED) code = 'BUDGET_UNAUTHORIZED';
  else if (status === HTTP_STATUS.FORBIDDEN) code = 'BUDGET_FORBIDDEN';
  else if (status === HTTP_STATUS.NOT_FOUND) code = 'BUDGET_NOT_FOUND';
  else if (status === HTTP_STATUS.CONFLICT) code = 'BUDGET_CONFLICT';
  else if (status === HTTP_STATUS.UNPROCESSABLE_ENTITY) code = 'BUDGET_VALIDATION_ERROR';
  else if (status === HTTP_STATUS.SERVICE_UNAVAILABLE) code = 'BUDGET_COORDINATION_ERROR';
  else if (status && status >= 500) code = 'BUDGET_SERVER_ERROR';

  const message = validationMsg || normalized.message || fallbackMessage;

  return new ServiceError({
    message,
    status,
    code,
    isNetworkError: normalized.isNetworkError,
    isTimeout: normalized.isTimeout,
    domain: 'budgets',
    originalError: error,
  });
}

/**
 * Normaliza cualquier error originado en PartService (adaptador HTTP real o adaptador simulado).
 */
export function normalizePartServiceError(
  error: unknown,
  fallbackMessage: string
): ServiceError {
  if (error instanceof ServiceError) {
    return error;
  }

  const validationMsg = extractValidationDetail(error);
  const normalized: NormalizedApiError = normalizeApiError(error);
  const status = normalized.status;

  let code = 'PART_SERVICE_ERROR';
  if (normalized.isTimeout) code = 'PART_TIMEOUT';
  else if (normalized.isNetworkError) code = 'PART_NETWORK_ERROR';
  else if (status === HTTP_STATUS.UNAUTHORIZED) code = 'PART_UNAUTHORIZED';
  else if (status === HTTP_STATUS.FORBIDDEN) code = 'PART_FORBIDDEN';
  else if (status === HTTP_STATUS.NOT_FOUND) code = 'PART_NOT_FOUND';
  else if (status === HTTP_STATUS.CONFLICT) code = 'PART_CONFLICT';
  else if (status === HTTP_STATUS.UNPROCESSABLE_ENTITY) code = 'PART_VALIDATION_ERROR';
  else if (status && status >= 500) code = 'PART_SERVER_ERROR';

  const message = validationMsg || normalized.message || fallbackMessage;

  return new ServiceError({
    message,
    status,
    code,
    isNetworkError: normalized.isNetworkError,
    isTimeout: normalized.isTimeout,
    domain: 'parts',
    originalError: error,
  });
}

/**
 * Normaliza cualquier error originado en ProviderService (adaptador HTTP real o adaptador simulado).
 */
export function normalizeProviderServiceError(
  error: unknown,
  fallbackMessage: string
): ServiceError {
  if (error instanceof ServiceError) {
    return error;
  }

  const validationMsg = extractValidationDetail(error);
  const normalized: NormalizedApiError = normalizeApiError(error);
  const status = normalized.status;

  let code = 'PROVIDER_SERVICE_ERROR';
  if (normalized.isTimeout) code = 'PROVIDER_TIMEOUT';
  else if (normalized.isNetworkError) code = 'PROVIDER_NETWORK_ERROR';
  else if (status === HTTP_STATUS.UNAUTHORIZED) code = 'PROVIDER_UNAUTHORIZED';
  else if (status === HTTP_STATUS.FORBIDDEN) code = 'PROVIDER_FORBIDDEN';
  else if (status === HTTP_STATUS.NOT_FOUND) code = 'PROVIDER_NOT_FOUND';
  else if (status === HTTP_STATUS.CONFLICT) code = 'PROVIDER_CONFLICT';
  else if (status === HTTP_STATUS.UNPROCESSABLE_ENTITY) code = 'PROVIDER_VALIDATION_ERROR';
  else if (status && status >= 500) code = 'PROVIDER_SERVER_ERROR';

  const message = validationMsg || normalized.message || fallbackMessage;

  return new ServiceError({
    message,
    status,
    code,
    isNetworkError: normalized.isNetworkError,
    isTimeout: normalized.isTimeout,
    domain: 'providers',
    originalError: error,
  });
}

/**
 * Normaliza cualquier error originado en EvidenceService (permisos de cámara/galería, carga multipart o MS4).
 */
export function normalizeEvidenceServiceError(
  error: unknown,
  fallbackMessage: string
): ServiceError {
  if (error instanceof ServiceError) {
    return error;
  }

  if (error instanceof MediaPermissionError) {
    return new ServiceError({
      message: error.message,
      code: 'EVIDENCE_PERMISSION_DENIED',
      domain: 'evidences',
      originalError: error,
    });
  }

  const validationMsg = extractValidationDetail(error);
  const normalized: NormalizedApiError = normalizeApiError(error);
  const status = normalized.status;

  let code = 'EVIDENCE_SERVICE_ERROR';
  let defaultStatusMessage: string | undefined;

  if (normalized.isTimeout) {
    code = 'EVIDENCE_TIMEOUT';
  } else if (normalized.isNetworkError) {
    code = 'EVIDENCE_NETWORK_ERROR';
  } else if (status === HTTP_STATUS.BAD_REQUEST) {
    code = 'EVIDENCE_BAD_FILE';
    defaultStatusMessage = 'No se pudo leer el archivo enviado.';
  } else if (status === HTTP_STATUS.UNAUTHORIZED) {
    code = 'EVIDENCE_UNAUTHORIZED';
  } else if (status === HTTP_STATUS.FORBIDDEN) {
    code = 'EVIDENCE_FORBIDDEN';
  } else if (status === HTTP_STATUS.NOT_FOUND) {
    code = 'EVIDENCE_NOT_FOUND';
  } else if (status === HTTP_STATUS.CONFLICT) {
    code = 'EVIDENCE_CONFLICT';
    defaultStatusMessage = 'La orden está entregada o cancelada y no admite nuevas evidencias.';
  } else if (status === HTTP_STATUS.PAYLOAD_TOO_LARGE) {
    code = 'EVIDENCE_TOO_LARGE';
    defaultStatusMessage = 'El archivo supera el tamaño máximo permitido para este tipo de evidencia.';
  } else if (status === HTTP_STATUS.UNSUPPORTED_MEDIA_TYPE) {
    code = 'EVIDENCE_UNSUPPORTED_MEDIA';
    defaultStatusMessage = 'Formato de archivo no permitido: solo se aceptan JPG, PNG, WEBP, MP4 y MOV.';
  } else if (status === HTTP_STATUS.UNPROCESSABLE_ENTITY) {
    code = 'EVIDENCE_VALIDATION_ERROR';
  } else if (status === HTTP_STATUS.SERVICE_UNAVAILABLE) {
    code = 'EVIDENCE_STORAGE_UNAVAILABLE';
    defaultStatusMessage = 'El almacenamiento de evidencias o el servicio de órdenes no está disponible temporalmente.';
  } else if (status && status >= 500) {
    code = 'EVIDENCE_SERVER_ERROR';
  }

  const message =
    validationMsg ||
    defaultStatusMessage ||
    normalized.message ||
    fallbackMessage;

  return new ServiceError({
    message,
    status,
    code,
    isNetworkError: normalized.isNetworkError,
    isTimeout: normalized.isTimeout,
    domain: 'evidences',
    originalError: error,
  });
}
