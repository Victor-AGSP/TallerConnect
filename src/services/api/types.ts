import { AxiosRequestConfig, AxiosResponse } from 'axios';

/**
 * ============================================================
 * TIPOS Y CONTRATOS BASE PARA LA API GATEWAY
 * ============================================================
 * Definidos de acuerdo al contrato de Integración 2 (endpoints.pdf).
 */

/**
 * Estructura oficial de error devuelta por la API Gateway y los microservicios.
 * En endpoints.pdf se define que todos los errores responden en formato JSON con la clave `detail`:
 * { "detail": "mensaje legible para el usuario" }
 */
export interface ApiErrorResponse {
  detail: string;
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
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
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
 * Configuración base tipada para solicitudes hacia la API Gateway.
 * Permite flags personalizados, como `skipAuth` para omitir el token Bearer en endpoints públicos (ej. login)
 * y `retryConfig` para controlar la política de reintentos en operaciones seguras.
 */
export interface ApiRequestConfig extends AxiosRequestConfig {
  skipAuth?: boolean;
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
  message: string;
  isNetworkError: boolean;
  isTimeout: boolean;
  originalError?: unknown;
}
