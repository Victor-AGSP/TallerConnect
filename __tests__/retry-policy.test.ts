import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import {
  isSafeAndIdempotentMethod,
  isRetryableError,
  calculateBackoffDelay,
  attachRetryInterceptor,
  DEFAULT_MAX_RETRIES,
  DEFAULT_RETRY_DELAY_MS,
  SAFE_HTTP_METHODS,
} from '@/services/api/retry';
import { ApiRequestConfig } from '@/services/api/types';

describe('Política de Reintento para Operaciones Seguras (RFC 7231)', () => {
  describe('isSafeAndIdempotentMethod', () => {
    it('reconoce como seguras e idempotentes exclusivamente a GET, HEAD y OPTIONS', () => {
      expect(isSafeAndIdempotentMethod('get')).toBe(true);
      expect(isSafeAndIdempotentMethod('GET')).toBe(true);
      expect(isSafeAndIdempotentMethod('head')).toBe(true);
      expect(isSafeAndIdempotentMethod('HEAD')).toBe(true);
      expect(isSafeAndIdempotentMethod('options')).toBe(true);
      expect(isSafeAndIdempotentMethod('OPTIONS')).toBe(true);
    });

    it('rechaza categóricamente métodos NO seguros o con efectos secundarios (POST, PUT, DELETE, PATCH)', () => {
      // POST crea recursos y procesa transacciones; reintentarlo podría duplicar órdenes
      expect(isSafeAndIdempotentMethod('post')).toBe(false);
      expect(isSafeAndIdempotentMethod('POST')).toBe(false);

      expect(isSafeAndIdempotentMethod('put')).toBe(false);
      expect(isSafeAndIdempotentMethod('PUT')).toBe(false);

      expect(isSafeAndIdempotentMethod('delete')).toBe(false);
      expect(isSafeAndIdempotentMethod('DELETE')).toBe(false);

      expect(isSafeAndIdempotentMethod('patch')).toBe(false);
      expect(isSafeAndIdempotentMethod('PATCH')).toBe(false);

      expect(isSafeAndIdempotentMethod(undefined)).toBe(false);
      expect(isSafeAndIdempotentMethod('')).toBe(false);
    });
  });

  describe('isRetryableError', () => {
    it('clasifica como recuperable un timeout de red (ECONNABORTED)', () => {
      const timeoutError = {
        code: 'ECONNABORTED',
        message: 'timeout of 15000ms exceeded',
      } as AxiosError;

      expect(isRetryableError(timeoutError)).toBe(true);
    });

    it('clasifica como recuperable una pérdida de conexión a internet (sin response)', () => {
      const networkError = {
        message: 'Network Error',
        response: undefined,
      } as AxiosError;

      expect(isRetryableError(networkError)).toBe(true);
    });

    it('clasifica como recuperables códigos de indisponibilidad temporal del servidor (502, 503, 504, 429)', () => {
      const createStatusError = (status: number) =>
        ({
          response: { status },
        } as AxiosError);

      expect(isRetryableError(createStatusError(502))).toBe(true); // Bad Gateway
      expect(isRetryableError(createStatusError(503))).toBe(true); // Service Unavailable
      expect(isRetryableError(createStatusError(504))).toBe(true); // Gateway Timeout
      expect(isRetryableError(createStatusError(429))).toBe(true); // Rate Limit transitorio
    });

    it('rechaza reintentar errores de cliente no recuperables (400, 401, 403, 404, 409, 422)', () => {
      const createStatusError = (status: number) =>
        ({
          response: { status },
        } as AxiosError);

      expect(isRetryableError(createStatusError(400))).toBe(false); // Bad Request
      expect(isRetryableError(createStatusError(401))).toBe(false); // Unauthorized
      expect(isRetryableError(createStatusError(403))).toBe(false); // Forbidden
      expect(isRetryableError(createStatusError(404))).toBe(false); // Not Found
      expect(isRetryableError(createStatusError(409))).toBe(false); // Conflict
      expect(isRetryableError(createStatusError(422))).toBe(false); // Unprocessable Entity
      expect(isRetryableError(createStatusError(500))).toBe(false); // Internal Server Error
    });
  });

  describe('calculateBackoffDelay (Exponential Backoff)', () => {
    it('calcula retroceso exponencial matemáticamente consistente', () => {
      const base = 1000;
      // Intento 1: 1000 * 2^0 = 1000 ms
      expect(calculateBackoffDelay(1, base)).toBe(1000);
      // Intento 2: 1000 * 2^1 = 2000 ms
      expect(calculateBackoffDelay(2, base)).toBe(2000);
      // Intento 3: 1000 * 2^2 = 4000 ms
      expect(calculateBackoffDelay(3, base)).toBe(4000);
    });

    it('utiliza DEFAULT_RETRY_DELAY_MS si no se especifica retraso base', () => {
      expect(calculateBackoffDelay(1)).toBe(DEFAULT_RETRY_DELAY_MS);
      expect(calculateBackoffDelay(2)).toBe(DEFAULT_RETRY_DELAY_MS * 2);
    });
  });

  describe('attachRetryInterceptor (Comportamiento de Red con Axios)', () => {
    it('reintenta automáticamente una solicitud segura (GET) que falla por timeout y tiene éxito después', async () => {
      let callCount = 0;

      const client = axios.create({
        adapter: async (config) => {
          callCount += 1;
          if (callCount === 1) {
            const timeoutErr = new Error('timeout of 15000ms exceeded') as AxiosError;
            timeoutErr.code = 'ECONNABORTED';
            timeoutErr.config = config;
            return Promise.reject(timeoutErr);
          }
          return {
            status: 200,
            statusText: 'OK',
            headers: {},
            data: [{ id: 1, plate: 'AB-CD-12' }],
            config,
          };
        },
      });

      attachRetryInterceptor(client, { retryDelayMs: 0 });

      const response = await client.get('/api/v1/vehicles');

      expect(callCount).toBe(2);
      expect(response.status).toBe(200);
      expect(response.data).toEqual([{ id: 1, plate: 'AB-CD-12' }]);
    });

    it('NUNCA reintenta una operación no segura (POST), fallando inmediatamente', async () => {
      let callCount = 0;

      const client = axios.create({
        adapter: async (config) => {
          callCount += 1;
          const postErr = new Error('Network Error') as AxiosError;
          postErr.config = config;
          return Promise.reject(postErr);
        },
      });

      attachRetryInterceptor(client, { retryDelayMs: 0 });

      await expect(
        client.post('/api/v1/orders', { description: 'Cambio de aceite' })
      ).rejects.toThrow('Network Error');

      // Crucial: Exactamente 1 llamada, NINGÚN reintento en POST
      expect(callCount).toBe(1);
    });

    it('no reintenta solicitudes GET con errores 4xx definitivos (ej. 404 Not Found)', async () => {
      let callCount = 0;

      const client = axios.create({
        adapter: async (config) => {
          callCount += 1;
          const notFoundErr = new Error('Not Found') as AxiosError;
          notFoundErr.response = {
            status: 404,
            statusText: 'Not Found',
            headers: {},
            data: { detail: 'Recurso no encontrado' },
            config,
          };
          notFoundErr.config = config;
          return Promise.reject(notFoundErr);
        },
      });

      attachRetryInterceptor(client, { retryDelayMs: 0 });

      await expect(client.get('/api/v1/vehicles/999')).rejects.toThrow('Not Found');

      expect(callCount).toBe(1);
    });

    it('respeta el límite de maxRetries y luego rechaza la promesa si la falla persiste', async () => {
      let callCount = 0;

      const client = axios.create({
        adapter: async (config) => {
          callCount += 1;
          const persistentErr = new Error('Gateway Timeout') as AxiosError;
          persistentErr.response = {
            status: 504,
            statusText: 'Gateway Timeout',
            headers: {},
            data: {},
            config,
          };
          persistentErr.config = config;
          return Promise.reject(persistentErr);
        },
      });

      attachRetryInterceptor(client, { maxRetries: 2, retryDelayMs: 0 });

      await expect(client.get('/api/v1/health')).rejects.toThrow('Gateway Timeout');

      // 1 intento inicial + 2 reintentos = 3 llamadas en total
      expect(callCount).toBe(3);
    });

    it('no reintenta cuando se especifica disableRetry: true en la configuración de la petición', async () => {
      let callCount = 0;

      const client = axios.create({
        adapter: async (config) => {
          callCount += 1;
          const timeoutErr = new Error('timeout of 15000ms exceeded') as AxiosError;
          timeoutErr.code = 'ECONNABORTED';
          timeoutErr.config = config;
          return Promise.reject(timeoutErr);
        },
      });

      attachRetryInterceptor(client, { retryDelayMs: 0 });

      await expect(
        client.get('/api/v1/quick-check', {
          retryConfig: { disableRetry: true },
        } as ApiRequestConfig)
      ).rejects.toThrow('timeout of 15000ms exceeded');

      expect(callCount).toBe(1);
    });
  });
});
