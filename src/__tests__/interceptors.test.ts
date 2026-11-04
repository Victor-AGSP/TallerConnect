import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import {
  normalizeApiError,
  extractApiErrorDetail,
  normalizeRequestConfig,
  registerUnauthorizedHandler,
  attachAuthTokenInterceptor,
  attachErrorInterceptor,
} from '@/services/api/interceptors';
import { HTTP_STATUS, ApiRequestConfig } from '@/services/api/types';
import { storage, STORAGE_KEYS } from '@/utils/storage';
import { useAuthStore } from '@/stores/authStore';
import { useConnectivityStore } from '@/stores/connectivityStore';

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
    registerUnauthorizedHandler(null);
    useConnectivityStore.getState().reset();
    mockedStorage.get.mockReset();
    mockedStorage.set.mockReset();
    mockedStorage.clearSession.mockReset();
    mockLogout.mockReset();
    (useAuthStore.getState as jest.Mock).mockReturnValue({
      logout: mockLogout,
    });
  });

  describe('normalizeApiError y extractApiErrorDetail', () => {
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

    it('extrae listas de validación FastAPI / OpenAPI (HTTP 422 detail array)', () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 422,
          data: {
            detail: [
              { loc: ['body', 'patente'], msg: 'Campo obligatorio' },
              { loc: ['body', 'anio'], msg: 'Debe ser mayor a 1950' },
            ],
          },
        },
      } as unknown as AxiosError;

      const extracted = extractApiErrorDetail(axiosError.response?.data);
      const result = normalizeApiError(axiosError);

      expect(extracted.validationErrors).toEqual([
        'patente: Campo obligatorio',
        'anio: Debe ser mayor a 1950',
      ]);
      expect(result.status).toBe(422);
      expect(result.message).toContain('patente: Campo obligatorio');
      expect(result.validationErrors).toHaveLength(2);
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
      expect(normalizeApiError(createError(HTTP_STATUS.PAYLOAD_TOO_LARGE)).message).toContain(
        'tamaño máximo'
      );
      expect(normalizeApiError(createError(HTTP_STATUS.UNSUPPORTED_MEDIA_TYPE)).message).toContain(
        'formato del archivo'
      );
      expect(normalizeApiError(createError(HTTP_STATUS.UNPROCESSABLE_ENTITY)).message).toContain(
        'no son válidos'
      );
      expect(normalizeApiError(createError(HTTP_STATUS.TOO_MANY_REQUESTS)).message).toContain(
        'Demasiadas solicitudes'
      );
      expect(normalizeApiError(createError(HTTP_STATUS.SERVICE_UNAVAILABLE)).message).toContain(
        'disponible temporalmente'
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

  describe('normalizeRequestConfig y attachAuthTokenInterceptor', () => {
    it('normaliza rutas relativas evitando duplicar /api y ajusta FormData multipart', () => {
      const fakeFormData = { append: jest.fn() };
      const config = {
        baseURL: 'https://tallerconect.vercel.app/api',
        url: '/api/evidencias',
        data: fakeFormData,
        headers: new axios.AxiosHeaders({ 'Content-Type': 'application/json' }),
      } as unknown as InternalAxiosRequestConfig & ApiRequestConfig;

      const normalized = normalizeRequestConfig(config);

      expect(normalized.url).toBe('/evidencias');
      expect(normalized.timeout).toBe(60000);
      expect(normalized.headers.get('Content-Type')).toBeUndefined();
    });

    it('no envía un token viejo en el login público', async () => {
      mockedStorage.get.mockResolvedValueOnce('token-anterior');
      const client = axios.create();
      attachAuthTokenInterceptor(client);
      const requestInterceptor = (client.interceptors.request as unknown as {
        handlers: Array<{ fulfilled: (config: unknown) => Promise<unknown> }>;
      }).handlers[0].fulfilled;
      const config = {
        url: '/auth/login',
        headers: new axios.AxiosHeaders(),
      } as InternalAxiosRequestConfig;
      const result = (await requestInterceptor(config)) as InternalAxiosRequestConfig;
      expect(mockedStorage.get).not.toHaveBeenCalled();
      expect(result.headers.Authorization).toBeUndefined();
    });

    it('respeta un token explícito durante la consulta de usuario', async () => {
      mockedStorage.get.mockResolvedValueOnce('token-anterior');
      const client = axios.create();
      attachAuthTokenInterceptor(client);
      const requestInterceptor = (client.interceptors.request as unknown as {
        handlers: Array<{ fulfilled: (config: unknown) => Promise<unknown> }>;
      }).handlers[0].fulfilled;
      const config = {
        url: '/auth/me',
        headers: new axios.AxiosHeaders({ Authorization: 'Bearer token-nuevo' }),
      } as InternalAxiosRequestConfig;
      const result = (await requestInterceptor(config)) as InternalAxiosRequestConfig;
      expect(result.headers.Authorization).toBe('Bearer token-nuevo');
    });

    it('adjunta el encabezado Authorization Bearer si existe token en el almacenamiento', async () => {
      mockedStorage.get.mockResolvedValueOnce('mi-jwt-token-seguro');

      const client = axios.create();
      attachAuthTokenInterceptor(client);

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
    it('pasa transparentemente las respuestas HTTP exitosas y limpia alertas de red previas', () => {
      useConnectivityStore.getState().setNetworkIssue('Error previo');
      const client = axios.create();
      attachErrorInterceptor(client);

      const responseInterceptor = (client.interceptors.response as unknown as {
        handlers: Array<{ fulfilled: (res: AxiosResponse) => AxiosResponse }>;
      }).handlers[0].fulfilled;

      const mockResponse = { status: 200, data: { ok: true } } as AxiosResponse;
      const result = responseInterceptor(mockResponse);

      expect(result).toBe(mockResponse);
      expect(useConnectivityStore.getState().hasNetworkIssue).toBe(false);
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

    it('permite omitir el cierre de sesión en 403 cuando skipSessionLogoutOn403 es true', async () => {
      const client = axios.create();
      attachErrorInterceptor(client);

      const errorInterceptor = (client.interceptors.response as unknown as {
        handlers: Array<{ rejected: (error: unknown) => Promise<never> }>;
      }).handlers[0].rejected;

      const error403 = {
        isAxiosError: true,
        response: { status: HTTP_STATUS.FORBIDDEN, data: { detail: 'Rol insuficiente' } },
        config: { url: '/proveedores', skipSessionLogoutOn403: true },
      } as unknown as AxiosError;

      await expect(errorInterceptor(error403)).rejects.toBeDefined();
      expect(mockLogout).not.toHaveBeenCalled();
    });

    it('permite usar un manejador desacoplado registrado mediante registerUnauthorizedHandler', async () => {
      const customHandler = jest.fn();
      registerUnauthorizedHandler(customHandler);

      const client = axios.create();
      attachErrorInterceptor(client);

      const errorInterceptor = (client.interceptors.response as unknown as {
        handlers: Array<{ rejected: (error: unknown) => Promise<never> }>;
      }).handlers[0].rejected;

      const error401 = {
        isAxiosError: true,
        response: { status: HTTP_STATUS.UNAUTHORIZED, data: { detail: 'Expirado' } },
        config: { url: '/ordenes' },
      } as unknown as AxiosError;

      await expect(errorInterceptor(error401)).rejects.toBeDefined();
      expect(customHandler).toHaveBeenCalledWith(401, '/ordenes');
      expect(mockLogout).not.toHaveBeenCalled();
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
        config: { url: '/public-endpoint', skipAuth: true },
      } as unknown as AxiosError;

      await expect(errorInterceptor(publicError401)).rejects.toBeDefined();

      expect(mockLogout).not.toHaveBeenCalled();
    });

    it('adjunta la propiedad normalizedError al error rechazado y notifica a connectivityStore en fallos de red', async () => {
      const client = axios.create();
      attachErrorInterceptor(client);

      const errorInterceptor = (client.interceptors.response as unknown as {
        handlers: Array<{ rejected: (error: unknown) => Promise<never> }>;
      }).handlers[0].rejected;

      const networkError = {
        isAxiosError: true,
        message: 'Network Error',
      } as unknown as AxiosError & { normalizedError?: unknown };

      try {
        await errorInterceptor(networkError);
      } catch (rejected: unknown) {
        const err = rejected as { normalizedError?: { isNetworkError: boolean; message: string } };
        expect(err.normalizedError).toBeDefined();
        expect(err.normalizedError?.isNetworkError).toBe(true);
        expect(err.normalizedError?.message).toContain('Backend no disponible');
      }

      expect(useConnectivityStore.getState().hasNetworkIssue).toBe(true);
    });
  });
});
