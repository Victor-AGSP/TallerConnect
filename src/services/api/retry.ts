import { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { ApiRequestConfig, RetryConfig } from './types';

/**
 * Métodos HTTP considerados seguros e idempotentes según el estándar RFC 7231 / RFC 9110.
 * Estas operaciones no producen efectos secundarios en el servidor ni alteran el estado.
 */
export const SAFE_HTTP_METHODS = ['get', 'head', 'options'] as const;

/**
 * Parámetros predeterminados para la política de reintentos.
 */
export const DEFAULT_MAX_RETRIES = 2;
export const DEFAULT_RETRY_DELAY_MS = 1000;

/**
 * Verifica si un método HTTP es seguro e idempotente.
 * Retorna true exclusivamente para GET, HEAD y OPTIONS.
 * Retorna false para POST, PUT, DELETE, PATCH.
 */
export function isSafeAndIdempotentMethod(method?: string): boolean {
  if (!method) return false;
  const normalized = method.trim().toLowerCase();
  return SAFE_HTTP_METHODS.includes(normalized as (typeof SAFE_HTTP_METHODS)[number]);
}

/**
 * Determina si un error HTTP o de red califica como recuperable y transitorio:
 * - Timeouts de red (ECONNABORTED o mensaje de timeout).
 * - Fallas de conexión sin respuesta del servidor (errores de red, DNS o socket).
 * - Respuestas de servidor temporalmente no disponible (502 Bad Gateway, 503 Service Unavailable, 504 Gateway Timeout, 429 Rate Limit).
 *
 * Errores de cliente (400, 401, 403, 404, 409, 422) NUNCA se reintentan.
 */
export function isRetryableError(error: AxiosError): boolean {
  // 1. Timeout de la petición
  if (
    error.code === 'ECONNABORTED' ||
    error.message?.toLowerCase().includes('timeout')
  ) {
    return true;
  }

  // 2. Falla de conexión a internet o backend inalcanzable (sin objeto response)
  if (!error.response) {
    return true;
  }

  // 3. Códigos de indisponibilidad temporal del servidor o Gateway
  const status = error.response.status;
  if (
    status === 502 || // Bad Gateway
    status === 503 || // Service Unavailable (ej. servidor reiniciando)
    status === 504 || // Gateway Timeout
    status === 429    // Too Many Requests (Rate limit transitorio)
  ) {
    return true;
  }

  // Errores de cliente o errores internos de aplicación (500) no son recuperables por reintento
  return false;
}

/**
 * Calcula el tiempo de espera con retroceso exponencial (Exponential Backoff):
 * Intento 1: baseDelay * 2^0 = baseDelay (ej. 1000ms)
 * Intento 2: baseDelay * 2^1 = baseDelay * 2 (ej. 2000ms)
 * Intento 3: baseDelay * 2^2 = baseDelay * 4 (ej. 4000ms)
 */
export function calculateBackoffDelay(
  retryCount: number,
  baseDelayMs: number = DEFAULT_RETRY_DELAY_MS
): number {
  const exponent = Math.max(0, retryCount - 1);
  return baseDelayMs * Math.pow(2, exponent);
}

/**
 * Promesa de espera para el retroceso entre reintentos.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Registra el interceptor de reintentos en una instancia de Axios.
 *
 * POLÍTICA DE SEGURIDAD:
 * - Solo reintenta solicitudes con métodos seguros e idempotentes (GET, HEAD, OPTIONS).
 * - NUNCA reintenta solicitudes POST para evitar duplicidad de registros en la base de datos.
 * - Limita el número de reintentos mediante maxRetries con retroceso exponencial.
 */
export function attachRetryInterceptor(
  client: AxiosInstance,
  defaultOptions?: RetryConfig
): void {
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const config = error.config as (InternalAxiosRequestConfig & ApiRequestConfig) | undefined;

      // Si no hay configuración disponible o el reintento fue desactivado explícitamente
      if (!config || config.retryConfig?.disableRetry) {
        return Promise.reject(error);
      }

      // REGLA 1: Solo reintentar si el método es seguro e idempotente
      if (!isSafeAndIdempotentMethod(config.method)) {
        return Promise.reject(error);
      }

      // REGLA 2: Solo reintentar ante fallos de red transitorios o indisponibilidad de servidor
      if (!isRetryableError(error)) {
        return Promise.reject(error);
      }

      const maxRetries =
        config.retryConfig?.maxRetries ??
        defaultOptions?.maxRetries ??
        DEFAULT_MAX_RETRIES;

      const baseDelay =
        config.retryConfig?.retryDelayMs ??
        defaultOptions?.retryDelayMs ??
        DEFAULT_RETRY_DELAY_MS;

      config.__retryCount = config.__retryCount ?? 0;

      // REGLA 3: No exceder el número máximo de reintentos permitidos
      if (config.__retryCount >= maxRetries) {
        return Promise.reject(error);
      }

      config.__retryCount += 1;

      const delay = calculateBackoffDelay(config.__retryCount, baseDelay);

      console.warn(
        `[Axios Retry] Reintentando operación segura (${config.method?.toUpperCase()} ${config.url}) - Reintento ${config.__retryCount}/${maxRetries} tras ${delay}ms`
      );

      await sleep(delay);

      // Re-despachar la solicitud en la instancia del cliente
      return client(config);
    }
  );
}
