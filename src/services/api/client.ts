import axios, { AxiosInstance, CreateAxiosDefaults } from 'axios';
import { ENV } from '@/config/env';
import {
  attachAuthTokenInterceptor,
  attachErrorInterceptor,
} from './interceptors';
import { attachRetryInterceptor } from './retry';
import { ApiRequestConfig, RetryConfig } from './types';

/**
 * URL base oficial de la API Gateway resuelta según el entorno (Dev / Integración).
 */
export const API_BASE_URL = ENV.API_URL;

/**
 * Timeout estándar de 15 segundos para solicitudes HTTP hacia la API Gateway.
 */
export const DEFAULT_TIMEOUT_MS = ENV.TIMEOUT_MS;

/**
 * Timeout extendido para subida de archivos multimedia hacia la API Gateway.
 */
export const UPLOAD_TIMEOUT_MS = ENV.UPLOAD_TIMEOUT_MS;

export interface CreateApiClientOptions extends CreateAxiosDefaults {
  retryConfig?: RetryConfig;
}

/**
 * Fábrica centralizada para crear instancias de cliente HTTP con interceptores de:
 * 1. Autenticación Bearer y normalización de rutas/multipart
 * 2. Reintentos con retroceso exponencial en métodos idempotentes (GET, HEAD, OPTIONS)
 * 3. Normalización de errores (`{ detail }`), estado de conectividad y sesión (401/403)
 */
export function createApiClient(options?: CreateApiClientOptions): AxiosInstance {
  const { retryConfig, headers, ...axiosOptions } = options ?? {};

  const instance = axios.create({
    baseURL: API_BASE_URL,
    timeout: DEFAULT_TIMEOUT_MS,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(headers ?? {}),
    },
    ...axiosOptions,
  });

  attachAuthTokenInterceptor(instance);
  attachRetryInterceptor(instance, retryConfig);
  attachErrorInterceptor(instance);

  return instance;
}

/**
 * Cliente HTTP centralizado basado en Axios para todas las solicitudes
 * hacia la API Gateway del sistema TallerConnect.
 */
export const apiClient: AxiosInstance = createApiClient();

/**
 * Fachada tipada de alto nivel sobre `apiClient` que desenvuelve `response.data`
 * y facilita llamadas REST JSON y cargas `multipart/form-data`.
 */
export const httpClient = {
  async get<T>(url: string, config?: ApiRequestConfig): Promise<T> {
    const response = config
      ? await apiClient.get<T>(url, config)
      : await apiClient.get<T>(url);
    return response.data;
  },

  async post<T, D = unknown>(
    url: string,
    data?: D,
    config?: ApiRequestConfig<D>
  ): Promise<T> {
    const response = config
      ? await apiClient.post<T>(url, data, config)
      : await apiClient.post<T>(url, data);
    return response.data;
  },

  async put<T, D = unknown>(
    url: string,
    data?: D,
    config?: ApiRequestConfig<D>
  ): Promise<T> {
    const response = config
      ? await apiClient.put<T>(url, data, config)
      : await apiClient.put<T>(url, data);
    return response.data;
  },

  async patch<T, D = unknown>(
    url: string,
    data?: D,
    config?: ApiRequestConfig<D>
  ): Promise<T> {
    const response = config
      ? await apiClient.patch<T>(url, data, config)
      : await apiClient.patch<T>(url, data);
    return response.data;
  },

  async delete<T>(url: string, config?: ApiRequestConfig): Promise<T> {
    const response = config
      ? await apiClient.delete<T>(url, config)
      : await apiClient.delete<T>(url);
    return response.data;
  },

  async postMultipart<T>(
    url: string,
    formData: FormData,
    config?: ApiRequestConfig<FormData>
  ): Promise<T> {
    const response = await apiClient.post<T>(url, formData, {
      ...config,
      isMultipart: true,
      timeout: config?.timeout ?? UPLOAD_TIMEOUT_MS,
      headers: {
        Accept: 'application/json',
        ...(config?.headers ?? {}),
      },
    });
    return response.data;
  },
};
