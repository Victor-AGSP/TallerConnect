import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { storage, STORAGE_KEYS } from '@/utils/storage';
import { useAuthStore } from '@/stores/authStore';
import {
  ApiErrorResponse,
  ApiRequestConfig,
  HTTP_STATUS,
  NormalizedApiError,
} from './types';

/**
 * Normaliza cualquier error devuelto por Axios, la API Gateway o la red,
 * extrayendo el mensaje legible 
 */
export function normalizeApiError(error: unknown): NormalizedApiError {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorResponse>;

    // Caso 1: El servidor respondió con un código de estado fuera de 2xx
    if (axiosError.response) {
      const status = axiosError.response.status;
      const data = axiosError.response.data;

      // Según endpoints el backend devuelve { "detail": "mensaje legible para el usuario" }
      let message = data?.detail;

      if (!message || typeof message !== 'string') {
        if (status === HTTP_STATUS.UNAUTHORIZED) {
          message = 'Sesión expirada o no autorizada. Por favor, inicia sesión nuevamente.';
        } else if (status === HTTP_STATUS.FORBIDDEN) {
          message = 'No tienes permisos para realizar esta acción.';
        } else if (status === HTTP_STATUS.NOT_FOUND) {
          message = 'El recurso solicitado no fue encontrado.';
        } else if (status === HTTP_STATUS.CONFLICT) {
          message = 'Conflicto con los datos ingresados (ej. patente duplicada).';
        } else if (status === HTTP_STATUS.UNPROCESSABLE_ENTITY) {
          message = 'Los datos enviados no son válidos o están incompletos.';
        } else if (status >= 500) {
          message = 'Error interno en el servidor. Intenta nuevamente más tarde.';
        } else {
          message = axiosError.message || 'Error en la solicitud HTTP.';
        }
      }

      return {
        status,
        message,
        isNetworkError: false,
        isTimeout: false,
        originalError: error,
      };
    }

    // Caso 2: Timeout de la solicitud
    if (
      axiosError.code === 'ECONNABORTED' ||
      axiosError.message?.toLowerCase().includes('timeout')
    ) {
      return {
        message: 'Tiempo de espera agotado. El servidor tardó demasiado en responder.',
        isNetworkError: false,
        isTimeout: true,
        originalError: error,
      };
    }

    // Caso 3: Falla de conexión a internet o backend no disponible
    return {
      message: 'Backend no disponible o sin conexión a internet. Revisa tu conexión.',
      isNetworkError: true,
      isTimeout: false,
      originalError: error,
    };
  }

  // Caso 4: Error genérico de JavaScript
  return {
    message: error instanceof Error ? error.message : 'Ocurrió un error inesperado.',
    isNetworkError: false,
    isTimeout: false,
    originalError: error,
  };
}

/**
 * Registra el interceptor de peticiones en Axios para
 * adjuntar de forma transparente el token Bearer en solicitudes autorizadas.
 */
export function attachAuthTokenInterceptor(client: AxiosInstance): void {
  client.interceptors.request.use(
    async (config: InternalAxiosRequestConfig & ApiRequestConfig) => {
      // Si la petición especifica explícitamente skipAuth (ej. /auth/login), omitir cabecera
      if (config.skipAuth) {
        return config;
      }

      try {
        const token = await storage.get(STORAGE_KEYS.AUTH_TOKEN);

        if (token) {
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
 * captura de formato { detail } y tratamiento coordinado de HTTP 401/403 (cierre de sesión).
 */
export function attachErrorInterceptor(client: AxiosInstance): void {
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError<ApiErrorResponse>) => {
      const normalized = normalizeApiError(error);

      // Tratamiento de HTTP 401 / 403: Coordinación de cierre de sesión automático
      if (
        normalized.status === HTTP_STATUS.UNAUTHORIZED ||
        normalized.status === HTTP_STATUS.FORBIDDEN
      ) {
        const requestUrl = error.config?.url ?? '';
        // Si el 401 ocurrió en el login mismo, no hacemos logout (son solo credenciales incorrectas)
        const isLoginRequest =
          requestUrl.includes('/auth/login') || (error.config as ApiRequestConfig)?.skipAuth;

        if (!isLoginRequest) {
          console.warn(
            `[Axios Error Interceptor] HTTP ${normalized.status} en ruta protegida (${requestUrl}). Coordinando cierre de sesión...`
          );
          try {
            await useAuthStore.getState().logout();
          } catch (logoutError) {
            console.error('Error al coordinar logout tras 401/403:', logoutError);
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
