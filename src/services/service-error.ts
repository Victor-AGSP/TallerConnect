import { normalizeApiError } from '@/services/api/interceptors';
import { HTTP_STATUS, NormalizedApiError } from '@/services/api/types';
import { InvalidOrderResponseError } from '@/mappers/order.mapper';

/**
 * Error normalizado de la capa de servicios (Vehículos y Órdenes).
 * Conserva compatibilidad con `instanceof Error` y expone metadatos estructurados para la UI.
 */
export class ServiceError extends Error {
  readonly status?: number;
  readonly code: string;
  readonly isNetworkError: boolean;
  readonly isTimeout: boolean;
  readonly domain: 'vehicles' | 'orders';
  readonly originalError?: unknown;

  constructor(params: {
    message: string;
    status?: number;
    code?: string;
    isNetworkError?: boolean;
    isTimeout?: boolean;
    domain: 'vehicles' | 'orders';
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
 * Extrae el mensaje de validación cuando FastAPI/MS2 devuelve HTTP 422 con un arreglo `detail`.
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

  if (error instanceof InvalidOrderResponseError) {
    return new ServiceError({
      message: error.message,
      code: 'ORDER_INVALID_RESPONSE',
      domain: 'orders',
      originalError: error,
    });
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
