import { AxiosRequestConfig, AxiosResponse } from 'axios';

/**
 * ============================================================
 * TIPOS Y CONTRATOS BASE PARA LA API GATEWAY
 * ============================================================
 * Definidos de acuerdo al contrato de Integración 2 (OpenAPI MS1–MS4).
 */

/**
 * Elemento de error de validación estándar devuelto por FastAPI / OpenAPI (HTTP 422).
 */
export interface ValidationErrorDetail {
  loc?: Array<string | number>;
  msg?: string;
  type?: string;
}

/**
 * Estructura oficial de error devuelta por la API Gateway y los microservicios.
 * Soporta tanto `{ "detail": "mensaje" }` como listas `HTTPValidationError` (422).
 */
export interface ApiErrorResponse {
  detail?: string | ValidationErrorDetail[];
  message?: string;
  error?: string;
  code?: string;
  [key: string]: unknown;
}

/**
 * Códigos de estado HTTP estándar contemplados en la interacción con la API Gateway.
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

export type HttpStatusCode = (typeof HTTP_STATUS)[keyof typeof HTTP_STATUS];

/**
 * Configuración para políticas de reintento en solicitudes hacia la API Gateway.
 */
export interface RetryConfig {
  /**
   * Número máximo de reintentos permitidos para operaciones seguras (por defecto 2).
   */
  maxRetries?: number;
  /**
   * Retraso base en milisegundos para el primer reintento (por defecto 1000 ms).
   */
  retryDelayMs?: number;
  /**
   * Si es true, desactiva el reintento automático para esta petición específica.
   */
  disableRetry?: boolean;
}

/**
 * Extensión de AxiosRequestConfig para soportar flags personalizados en AxiosInstance
 * como `skipAuth`, `skipSessionLogoutOn403`, `isMultipart` y `retryConfig`.
 */
declare module 'axios' {
  export interface AxiosRequestConfig {
    skipAuth?: boolean;
    skipSessionLogoutOn403?: boolean;
    isMultipart?: boolean;
    retryConfig?: RetryConfig;
    __retryCount?: number;
  }
}

/**
 * Configuración base tipada para solicitudes hacia la API Gateway.
 * Permite flags personalizados como `skipAuth`, `skipSessionLogoutOn403`,
 * `isMultipart` y `retryConfig`.
 */
export interface ApiRequestConfig<D = unknown> extends AxiosRequestConfig<D> {
  skipAuth?: boolean;
  /**
   * Si es true, evita cerrar la sesión global ante un HTTP 403 (útil cuando
   * el 403 representa únicamente restricción de permiso por rol en un recurso).
   */
  skipSessionLogoutOn403?: boolean;
  /**
   * Indica que la solicitud transporta `multipart/form-data` para ajustar
   * encabezados y timeout de carga automáticamente.
   */
  isMultipart?: boolean;
  retryConfig?: RetryConfig;
  /**
   * Contador interno de reintentos ya ejecutados en la petición.
   */
  __retryCount?: number;
}

/**
 * Envoltura estándar tipada para las respuestas obtenidas desde la API Gateway.
 */
export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: AxiosResponse['headers'];
}

/**
 * Estructura de error normalizada para consumo dentro de los servicios, repositorios y UI de TallerConnect.
 * Simplifica la interpretación de fallos de red, timeouts o respuestas HTTP con detalle de error.
 */
export interface NormalizedApiError {
  status?: number;
  code?: string;
  message: string;
  isNetworkError: boolean;
  isTimeout: boolean;
  isServerError?: boolean;
  validationErrors?: string[];
  url?: string;
  method?: string;
  originalError?: unknown;
}
