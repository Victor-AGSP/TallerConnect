import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { ENV, buildGatewayEndpointPath } from '@/config/env';
import { storage, STORAGE_KEYS } from '@/utils/storage';
import { useConnectivityStore } from '@/stores/connectivityStore';
import {
  ApiErrorResponse,
  ApiRequestConfig,
  HTTP_STATUS,
  NormalizedApiError,
  ValidationErrorDetail,
} from './types';

export type UnauthorizedSessionHandler = (
  status: number,
  url?: string
) => Promise<void> | void;

let customUnauthorizedHandler: UnauthorizedSessionHandler | null = null;
let isHandlingUnauthorized = false;

/**
 * Permite registrar un manejador desacoplado para eventos HTTP 401/403
 * sin depender de importaciones circulares directas entre interceptores y stores.
 */
export function registerUnauthorizedHandler(
  handler: UnauthorizedSessionHandler | null
): void {
  customUnauthorizedHandler = handler;
}

/**
 * Extrae el mensaje legible y los errores de validación desde un cuerpo de error
 * devuelto por la API Gateway (formato `{ detail: string | ValidationErrorDetail[] }`).
 */
export function extractApiErrorDetail(data?: ApiErrorResponse | unknown): {
  message?: string;
  validationErrors?: string[];
  code?: string;
} {
  if (!data || typeof data !== 'object') {
    return {};
  }

  const record = data as ApiErrorResponse;
  const code = typeof record.code === 'string' ? record.code : undefined;

  if (typeof record.detail === 'string' && record.detail.trim() !== '') {
    return { message: record.detail.trim(), code };
  }

  if (Array.isArray(record.detail) && record.detail.length > 0) {
    const validationErrors = record.detail
      .map((item: ValidationErrorDetail) => {
        if (!item || typeof item !== 'object') return '';
        const field = Array.isArray(item.loc)
          ? item.loc.filter((part) => part !== 'body').join('.')
          : '';
        const msg = typeof item.msg === 'string' ? item.msg.trim() : '';
        if (field && msg) return `${field}: ${msg}`;
        return msg || field;
      })
      .filter(Boolean);

    if (validationErrors.length > 0) {
      return {
        message: `Error de validación: ${validationErrors.join('; ')}`,
        validationErrors,
        code,
      };
    }
  }

  if (typeof record.message === 'string' && record.message.trim() !== '') {
    return { message: record.message.trim(), code };
  }

  if (typeof record.error === 'string' && record.error.trim() !== '') {
    return { message: record.error.trim(), code };
  }

  return { code };
}

/**
 * Determina si una carga útil corresponde a una instancia `FormData`
 * (subida de evidencias multimedia hacia MS4).
 */
export function isFormDataPayload(data: unknown): boolean {
  if (!data || typeof data !== 'object') {
    return false;
  }
  if (typeof FormData !== 'undefined' && data instanceof FormData) {
    return true;
  }
  return typeof (data as FormData).append === 'function';
}

/**
 * Normaliza la configuración de una solicitud antes de enviarse a la API Gateway:
 * - Evita duplicar `/api/api/...` cuando `baseURL` ya termina en `/api`.
 * - Ajusta encabezados y timeout cuando el cuerpo es `FormData` (`multipart/form-data`).
 */
export function normalizeRequestConfig(
  config: InternalAxiosRequestConfig & ApiRequestConfig
): InternalAxiosRequestConfig & ApiRequestConfig {
  if (config.url && config.baseURL) {
    config.url = buildGatewayEndpointPath(config.url, config.baseURL);
  }

  if (config.isMultipart || isFormDataPayload(config.data)) {
    if (!config.timeout || config.timeout === ENV.TIMEOUT_MS) {
      config.timeout = ENV.UPLOAD_TIMEOUT_MS;
    }

    const currentContentType =
      config.headers?.get?.('Content-Type') ?? config.headers?.['Content-Type'];

    if (currentContentType === 'application/json') {
      if (config.headers?.delete) {
        config.headers.delete('Content-Type');
      } else if (config.headers) {
        delete config.headers['Content-Type'];
      }
    }
  }

  return config;
}

/**
 * Normaliza cualquier error devuelto por Axios, la API Gateway o la red,
 * extrayendo el mensaje legible, metadatos de estado y banderas de red/timeout.
 */
export function normalizeApiError(error: unknown): NormalizedApiError {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    const url = axiosError.config?.url;
    const method = axiosError.config?.method?.toUpperCase();

    // Caso 1: El servidor respondió con un código de estado fuera de 2xx
    if (axiosError.response) {
      const status = axiosError.response.status;
      const data = axiosError.response.data;
      const extracted = extractApiErrorDetail(data);
      let message = extracted.message;

      if (!message) {
        if (status === HTTP_STATUS.UNAUTHORIZED) {
          message = 'Sesión expirada o no autorizada. Por favor, inicia sesión nuevamente.';
        } else if (status === HTTP_STATUS.FORBIDDEN) {
          message = 'No tienes permisos para realizar esta acción.';
        } else if (status === HTTP_STATUS.NOT_FOUND) {
          message = 'El recurso solicitado no fue encontrado.';
        } else if (status === HTTP_STATUS.CONFLICT) {
          message = 'Conflicto con los datos ingresados (ej. patente duplicada).';
        } else if (status === HTTP_STATUS.PAYLOAD_TOO_LARGE) {
          message = 'El archivo excede el tamaño máximo permitido por el servidor.';
        } else if (status === HTTP_STATUS.UNSUPPORTED_MEDIA_TYPE) {
          message = 'El formato del archivo no es compatible o no está soportado.';
        } else if (status === HTTP_STATUS.UNPROCESSABLE_ENTITY) {
          message = 'Los datos enviados no son válidos o están incompletos.';
        } else if (status === HTTP_STATUS.TOO_MANY_REQUESTS) {
          message = 'Demasiadas solicitudes. Por favor, intenta nuevamente en unos segundos.';
        } else if (
          status === HTTP_STATUS.BAD_GATEWAY ||
          status === HTTP_STATUS.SERVICE_UNAVAILABLE ||
          status === HTTP_STATUS.GATEWAY_TIMEOUT
        ) {
          message =
            'El servicio o la API Gateway no se encuentra disponible temporalmente. Intenta más tarde.';
        } else if (status >= 500) {
          message = 'Error interno en el servidor. Intenta nuevamente más tarde.';
        } else {
          message = axiosError.message || 'Error en la solicitud HTTP.';
        }
      }

      return {
        status,
        code: extracted.code ?? axiosError.code,
        message,
        isNetworkError: false,
        isTimeout: false,
        isServerError: status >= 500,
        validationErrors: extracted.validationErrors,
        url,
        method,
        originalError: error,
      };
    }

    // Caso 2: Timeout de la solicitud
    if (
      axiosError.code === 'ECONNABORTED' ||
      axiosError.code === 'ETIMEDOUT' ||
      axiosError.message?.toLowerCase().includes('timeout')
    ) {
      return {
        code: axiosError.code ?? 'ECONNABORTED',
        message: 'Tiempo de espera agotado. El servidor tardó demasiado en responder.',
        isNetworkError: false,
        isTimeout: true,
        isServerError: false,
        url,
        method,
        originalError: error,
      };
    }

    // Caso 3: Falla de conexión a internet o backend no disponible
    return {
      code: axiosError.code ?? 'ERR_NETWORK',
      message: 'Backend no disponible o sin conexión a internet. Revisa tu conexión.',
      isNetworkError: true,
      isTimeout: false,
      isServerError: false,
      url,
      method,
      originalError: error,
    };
  }

  // Caso 4: Error genérico de JavaScript
  return {
    message: error instanceof Error ? error.message : 'Ocurrió un error inesperado.',
    isNetworkError: false,
    isTimeout: false,
    isServerError: false,
    originalError: error,
  };
}

/**
 * Registra el interceptor de peticiones en Axios para normalizar rutas/encabezados
 * y adjuntar de forma transparente el token Bearer en solicitudes autorizadas.
 */
export function attachAuthTokenInterceptor(client: AxiosInstance): void {
  client.interceptors.request.use(
    async (config: InternalAxiosRequestConfig & ApiRequestConfig) => {
      normalizeRequestConfig(config);

      // Si la petición especifica explícitamente skipAuth (ej. /auth/login), omitir cabecera
      if (config.skipAuth || /\/auth\/login(?:[?#]|$)/.test(config.url ?? '')) {
        return config;
      }

      try {
        const token = await storage.get(STORAGE_KEYS.AUTH_TOKEN);

        if (token && !config.headers?.get?.('Authorization') && !config.headers?.Authorization) {
          if (config.headers?.set) {
            config.headers.set('Authorization', `Bearer ${token}`);
          } else if (config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
      } catch (error) {
        console.error('Error al adjuntar token en interceptor de solicitudes:', error);
      }

      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );
}

/**
 * Registra el interceptor de respuestas en Axios para el manejo centralizado de errores,
 * captura de formato `{ detail }`, actualización de estado de conectividad y
 * tratamiento coordinado de HTTP 401/403 (cierre de sesión).
 */
export function attachErrorInterceptor(client: AxiosInstance): void {
  client.interceptors.response.use(
    (response) => {
      // Si la conexión fue exitosa y existía una alerta de red activa, la limpiamos
      try {
        if (useConnectivityStore.getState().hasNetworkIssue) {
          useConnectivityStore.getState().clearNetworkIssue();
        }
      } catch {
        // Ignorar si el store no está inicializado en entornos aislados
      }
      return response;
    },
    async (error: AxiosError<ApiErrorResponse>) => {
      const normalized = normalizeApiError(error);
      const requestConfig = error.config as (InternalAxiosRequestConfig & ApiRequestConfig) | undefined;

      // Tratamiento de Timeout, pérdida de conectividad o caída de Gateway (502/503/504)
      if (normalized.isNetworkError || normalized.isTimeout) {
        try {
          useConnectivityStore.getState().setNetworkIssue(normalized.message);
        } catch {
          // Ignorar en entornos aislados
        }
      }

      // Tratamiento de HTTP 401 / 403: Coordinación de cierre de sesión automático
      const shouldLogoutOnStatus =
        normalized.status === HTTP_STATUS.UNAUTHORIZED ||
        (normalized.status === HTTP_STATUS.FORBIDDEN && !requestConfig?.skipSessionLogoutOn403);

      if (shouldLogoutOnStatus) {
        const requestUrl = requestConfig?.url ?? '';
        // Si el 401 ocurrió en el login mismo, no hacemos logout (son solo credenciales incorrectas)
        const isLoginRequest =
          /\/auth\/login(?:[?#]|$)/.test(requestUrl) || requestConfig?.skipAuth;

        if (!isLoginRequest && !isHandlingUnauthorized) {
          isHandlingUnauthorized = true;
          console.warn(
            `[Axios Error Interceptor] HTTP ${normalized.status} en ruta protegida (${requestUrl}). Coordinando cierre de sesión...`
          );
          try {
            if (customUnauthorizedHandler && normalized.status) {
              await customUnauthorizedHandler(normalized.status, requestUrl);
            } else {
              // eslint-disable-next-line @typescript-eslint/no-var-requires
              const { useAuthStore } = require('@/stores/authStore');
              await useAuthStore.getState().logout();
            }
          } catch (logoutError) {
            console.error('Error al coordinar logout tras 401/403:', logoutError);
          } finally {
            isHandlingUnauthorized = false;
          }
        }
      }

      // Adjuntar el error normalizado al objeto de error para consumo directo en servicios y UI
      (error as AxiosError & { normalizedError?: NormalizedApiError }).normalizedError =
        normalized;

      return Promise.reject(error);
    }
  );
}
