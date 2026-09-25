import { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { storage, STORAGE_KEYS } from '@/utils/storage';
import { ApiRequestConfig } from './types';

/**
 * Registra el interceptor de peticiones en la instancia de Axios para
 * adjuntar de forma transparente el token Bearer en solicitudes autorizadas.
 * 
 * "Header obligatorio en todos los endpoints: Authorization: Bearer <token>"
 */
export function attachAuthTokenInterceptor(client: AxiosInstance): void {
  client.interceptors.request.use(
    async (config: InternalAxiosRequestConfig & ApiRequestConfig) => {
      // Si la petición especifica explícitamente skipAuth (ej. /auth/login), omitir cabecera
      if (config.skipAuth) {
        return config;
      }

      try {
        // Recupera el token JWT guardado en SecureStore (o localStorage en Web)
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
