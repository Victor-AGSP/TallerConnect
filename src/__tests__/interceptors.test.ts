import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import {
  normalizeApiError,
  attachAuthTokenInterceptor,
  attachErrorInterceptor,
} from '@/services/api/interceptors';
import { HTTP_STATUS, ApiRequestConfig } from '@/services/api/types';
import { storage, STORAGE_KEYS } from '@/utils/storage';
import { useAuthStore } from '@/stores/authStore';

// Mocks
jest.mock('@/utils/storage', () => ({
  storage: {
    get: jest.fn(),
    set: jest.fn(),
    clearSession: jest.fn(),
  },
  STORAGE_KEYS: {
    AUTH_TOKEN: 'tc_auth_token',
  },
}));

jest.mock('@/stores/authStore', () => ({
  useAuthStore: {
    getState: jest.fn(),
  },
}));

describe('Interceptors y Manejo Centralizado de Errores', () => {
  const mockedStorage = storage as jest.Mocked<typeof storage>;
  const mockLogout = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockedStorage.get.mockReset();
    mockedStorage.set.mockReset();
    mockedStorage.clearSession.mockReset();
    mockLogout.mockReset();
    (useAuthStore.getState as jest.Mock).mockReturnValue({
      logout: mockLogout,
    });
  });

  describe('normalizeApiError', () => {
    it('extrae el mensaje de error { detail } retornado por la API Gateway', () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 400,
          data: { detail: 'Las credenciales proporcionadas son inválidas' },
        },
      } as unknown as AxiosError;

      const result = normalizeApiError(axiosError);

      expect(result.status).toBe(400);
      expect(result.message).toBe('Las credenciales proporcionadas son inválidas');
      expect(result.isNetworkError).toBe(false);
      expect(result.isTimeout).toBe(false);
    });

    it('asigna mensajes por defecto según el código HTTP cuando el backend no envía detail', () => {
      const createError = (status: number) =>
        ({
          isAxiosError: true,
          response: {
            status,
            data: {},
          },
        } as unknown as AxiosError);

      expect(normalizeApiError(createError(HTTP_STATUS.UNAUTHORIZED)).message).toContain(
        'Sesión expirada'
      );
      expect(normalizeApiError(createError(HTTP_STATUS.FORBIDDEN)).message).toContain(
        'No tienes permisos'
      );
      expect(normalizeApiError(createError(HTTP_STATUS.NOT_FOUND)).message).toContain(
        'no fue encontrado'
      );
      expect(normalizeApiError(createError(HTTP_STATUS.CONFLICT)).message).toContain(
        'Conflicto'
      );
      expect(normalizeApiError(createError(HTTP_STATUS.UNPROCESSABLE_ENTITY)).message).toContain(
        'no son válidos'
      );
      expect(normalizeApiError(createError(HTTP_STATUS.INTERNAL_SERVER_ERROR)).message).toContain(
        'Error interno en el servidor'
      );
    });

    it('detecta un error de Timeout (ECONNABORTED)', () => {
      const timeoutError = {
        isAxiosError: true,
        code: 'ECONNABORTED',
        message: 'timeout of 10000ms exceeded',
      } as unknown as AxiosError;

      const result = normalizeApiError(timeoutError);

      expect(result.isTimeout).toBe(true);
      expect(result.isNetworkError).toBe(false);
      expect(result.message).toContain('Tiempo de espera agotado');
    });

    it('detecta una falla de red cuando no hay respuesta del servidor', () => {
      const networkError = {
        isAxiosError: true,
        message: 'Network Error',
      } as unknown as AxiosError;

      const result = normalizeApiError(networkError);

      expect(result.isNetworkError).toBe(true);
      expect(result.isTimeout).toBe(false);
      expect(result.message).toContain('Backend no disponible o sin conexión a internet');
    });

    it('maneja errores genéricos que no provienen de Axios', () => {
      const genericError = new Error('Error en tiempo de ejecución');
      const result = normalizeApiError(genericError);

      expect(result.message).toBe('Error en tiempo de ejecución');
      expect(result.isNetworkError).toBe(false);
      expect(result.isTimeout).toBe(false);
    });
  });

  describe('attachAuthTokenInterceptor', () => {
    it('adjunta el encabezado Authorization Bearer si existe token en el almacenamiento', async () => {
      mockedStorage.get.mockResolvedValueOnce('mi-jwt-token-seguro');

      const client = axios.create();
      attachAuthTokenInterceptor(client);

      // Obtenemos el interceptor registrado en la instancia
      const requestInterceptor = (client.interceptors.request as unknown as {
        handlers: Array<{ fulfilled: (config: unknown) => Promise<unknown> }>;
      }).handlers[0].fulfilled;

      const config: InternalAxiosRequestConfig & ApiRequestConfig = {
        headers: new axios.AxiosHeaders(),
      } as InternalAxiosRequestConfig;

      const modifiedConfig = (await requestInterceptor(config)) as InternalAxiosRequestConfig;

      expect(mockedStorage.get).toHaveBeenCalledWith(STORAGE_KEYS.AUTH_TOKEN);
      expect(modifiedConfig.headers.Authorization).toBe('Bearer mi-jwt-token-seguro');
    });

    it('omite la cabecera Authorization si config.skipAuth es true', async () => {
      mockedStorage.get.mockResolvedValueOnce('mi-jwt-token-seguro');

      const client = axios.create();
      attachAuthTokenInterceptor(client);

      const requestInterceptor = (client.interceptors.request as unknown as {
        handlers: Array<{ fulfilled: (config: unknown) => Promise<unknown> }>;
      }).handlers[0].fulfilled;

      const config: InternalAxiosRequestConfig & ApiRequestConfig = {
        headers: new axios.AxiosHeaders(),
        skipAuth: true,
      } as InternalAxiosRequestConfig & ApiRequestConfig;

      const resultConfig = (await requestInterceptor(config)) as InternalAxiosRequestConfig;

      expect(mockedStorage.get).not.toHaveBeenCalled();
      expect(resultConfig.headers.Authorization).toBeUndefined();
    });

    it('no falla ni adjunta autorización si el token no existe', async () => {
      mockedStorage.get.mockResolvedValueOnce(null);

      const client = axios.create();
      attachAuthTokenInterceptor(client);

      const requestInterceptor = (client.interceptors.request as unknown as {
        handlers: Array<{ fulfilled: (config: unknown) => Promise<unknown> }>;
      }).handlers[0].fulfilled;

      const config: InternalAxiosRequestConfig = {
        headers: new axios.AxiosHeaders(),
      } as InternalAxiosRequestConfig;

      const resultConfig = (await requestInterceptor(config)) as InternalAxiosRequestConfig;

      expect(resultConfig.headers.Authorization).toBeUndefined();
    });
  });

  describe('attachErrorInterceptor', () => {
    it('pasa transparentemente las respuestas HTTP exitosas', () => {
      const client = axios.create();
      attachErrorInterceptor(client);

      const responseInterceptor = (client.interceptors.response as unknown as {
        handlers: Array<{ fulfilled: (res: AxiosResponse) => AxiosResponse }>;
      }).handlers[0].fulfilled;

      const mockResponse = { status: 200, data: { ok: true } } as AxiosResponse;
      const result = responseInterceptor(mockResponse);

      expect(result).toBe(mockResponse);
    });

    it('coordina el cierre de sesión ante un HTTP 401 en ruta protegida', async () => {
      const client = axios.create();
      attachErrorInterceptor(client);

      const errorInterceptor = (client.interceptors.response as unknown as {
        handlers: Array<{ rejected: (error: unknown) => Promise<never> }>;
      }).handlers[0].rejected;

      const error401 = {
        isAxiosError: true,
        response: { status: HTTP_STATUS.UNAUTHORIZED, data: { detail: 'Token inválido' } },
        config: { url: '/api/v1/orders' },
      } as unknown as AxiosError;

      await expect(errorInterceptor(error401)).rejects.toBeDefined();

      expect(mockLogout).toHaveBeenCalledTimes(1);
    });

    it('coordina el cierre de sesión ante un HTTP 403 Forbidden en ruta protegida', async () => {
      const client = axios.create();
      attachErrorInterceptor(client);

      const errorInterceptor = (client.interceptors.response as unknown as {
        handlers: Array<{ rejected: (error: unknown) => Promise<never> }>;
      }).handlers[0].rejected;

      const error403 = {
        isAxiosError: true,
        response: { status: HTTP_STATUS.FORBIDDEN, data: { detail: 'Acceso no permitido' } },
        config: { url: '/api/v1/admin/users' },
      } as unknown as AxiosError;

      await expect(errorInterceptor(error403)).rejects.toBeDefined();

      expect(mockLogout).toHaveBeenCalledTimes(1);
    });

    it('NO coordina logout si el 401 proviene del endpoint de login (/auth/login)', async () => {
      const client = axios.create();
      attachErrorInterceptor(client);

      const errorInterceptor = (client.interceptors.response as unknown as {
        handlers: Array<{ rejected: (error: unknown) => Promise<never> }>;
      }).handlers[0].rejected;

      const loginError401 = {
        isAxiosError: true,
        response: { status: HTTP_STATUS.UNAUTHORIZED, data: { detail: 'Credenciales inválidas' } },
        config: { url: '/auth/login' },
      } as unknown as AxiosError;

      await expect(errorInterceptor(loginError401)).rejects.toBeDefined();

      expect(mockLogout).not.toHaveBeenCalled();
    });

    it('NO coordina logout si la petición tiene skipAuth: true', async () => {
      const client = axios.create();
      attachErrorInterceptor(client);

      const errorInterceptor = (client.interceptors.response as unknown as {
        handlers: Array<{ rejected: (error: unknown) => Promise<never> }>;
      }).handlers[0].rejected;

      const publicError401 = {
        isAxiosError: true,
        response: { status: HTTP_STATUS.UNAUTHORIZED, data: { detail: 'No autorizado' } },
        config: { url: '/api/v1/public-data', skipAuth: true } as ApiRequestConfig,
      } as unknown as AxiosError;

      await expect(errorInterceptor(publicError401)).rejects.toBeDefined();

      expect(mockLogout).not.toHaveBeenCalled();
    });

    it('adjunta el error normalizado en la propiedad normalizedError del error rechazado', async () => {
      const client = axios.create();
      attachErrorInterceptor(client);

      const errorInterceptor = (client.interceptors.response as unknown as {
        handlers: Array<{ rejected: (error: unknown) => Promise<never> }>;
      }).handlers[0].rejected;

      const serverError = {
        isAxiosError: true,
        response: {
          status: HTTP_STATUS.CONFLICT,
          data: { detail: 'El vehículo ya se encuentra registrado' },
        },
        config: { url: '/api/v1/vehicles' },
      } as unknown as AxiosError;

      try {
        await errorInterceptor(serverError);
        fail('Se esperaba que la promesa fuera rechazada');
      } catch (err: unknown) {
        const errorWithNormalized = err as AxiosError & {
          normalizedError?: { status: number; message: string };
        };
        expect(errorWithNormalized.normalizedError).toBeDefined();
        expect(errorWithNormalized.normalizedError?.status).toBe(HTTP_STATUS.CONFLICT);
        expect(errorWithNormalized.normalizedError?.message).toBe(
          'El vehículo ya se encuentra registrado'
        );
      }
    });
  });
});
