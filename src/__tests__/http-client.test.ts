import {
  apiClient,
  createApiClient,
  httpClient,
  API_BASE_URL,
  DEFAULT_TIMEOUT_MS,
  UPLOAD_TIMEOUT_MS,
} from '@/services/api/client';
import {
  ServiceError,
  getGlobalErrorMessage,
  isConnectivityOrTimeoutError,
  normalizeNotificationServiceError,
} from '@/services/service-error';

describe('Cliente HTTP (createApiClient, httpClient y normalización de errores)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createApiClient y configuración base', () => {
    it('crea instancias con baseURL hacia la API Gateway y encabezados JSON por defecto', () => {
      const customClient = createApiClient({ timeout: 8000 });

      expect(customClient.defaults.baseURL).toBe(API_BASE_URL);
      expect(customClient.defaults.timeout).toBe(8000);
      expect(DEFAULT_TIMEOUT_MS).toBe(15000);
      expect(UPLOAD_TIMEOUT_MS).toBe(60000);
    });
  });

  describe('httpClient (fachada tipada)', () => {
    it('desenvuelve response.data en operaciones GET, POST, PUT, PATCH y DELETE', async () => {
      const getSpy = jest
        .spyOn(apiClient, 'get')
        .mockResolvedValueOnce({ data: [{ id: 1 }] } as never);
      const postSpy = jest
        .spyOn(apiClient, 'post')
        .mockResolvedValueOnce({ data: { created: true } } as never);
      const putSpy = jest
        .spyOn(apiClient, 'put')
        .mockResolvedValueOnce({ data: { updated: true } } as never);
      const patchSpy = jest
        .spyOn(apiClient, 'patch')
        .mockResolvedValueOnce({ data: { patched: true } } as never);
      const deleteSpy = jest
        .spyOn(apiClient, 'delete')
        .mockResolvedValueOnce({ data: { deleted: true } } as never);

      await expect(httpClient.get('/vehiculos')).resolves.toEqual([{ id: 1 }]);
      await expect(httpClient.post('/vehiculos', { patente: 'AA-BB-11' })).resolves.toEqual({
        created: true,
      });
      await expect(httpClient.put('/ordenes/1/mecanico', { mecanico_id: 2 })).resolves.toEqual({
        updated: true,
      });
      await expect(httpClient.patch('/ordenes/1/estado', { estado_destino: 3 })).resolves.toEqual({
        patched: true,
      });
      await expect(httpClient.delete('/repuestos/5')).resolves.toEqual({
        deleted: true,
      });

      expect(getSpy).toHaveBeenCalledWith('/vehiculos');
      expect(postSpy).toHaveBeenCalledWith('/vehiculos', { patente: 'AA-BB-11' });
      expect(putSpy).toHaveBeenCalledWith('/ordenes/1/mecanico', { mecanico_id: 2 });
      expect(patchSpy).toHaveBeenCalledWith('/ordenes/1/estado', { estado_destino: 3 });
      expect(deleteSpy).toHaveBeenCalledWith('/repuestos/5');
    });

    it('envía cargas multipart/form-data mediante postMultipart con timeout extendido', async () => {
      const postSpy = jest
        .spyOn(apiClient, 'post')
        .mockResolvedValueOnce({ data: { evidencia_id: 'ev-001' } } as never);

      const formData = { append: jest.fn() } as unknown as FormData;
      const result = await httpClient.postMultipart<{ evidencia_id: string }>(
        '/evidencias',
        formData
      );

      expect(result).toEqual({ evidencia_id: 'ev-001' });
      expect(postSpy).toHaveBeenCalledWith(
        '/evidencias',
        formData,
        expect.objectContaining({
          isMultipart: true,
          timeout: UPLOAD_TIMEOUT_MS,
        })
      );
    });
  });

  describe('Helpers globales de ServiceError', () => {
    it('identifica errores de conectividad o timeout con isConnectivityOrTimeoutError', () => {
      const netErr = new ServiceError({
        message: 'Sin red',
        code: 'ORDER_NETWORK_ERROR',
        isNetworkError: true,
        domain: 'orders',
      });
      const validationErr = new ServiceError({
        message: 'Datos inválidos',
        status: 422,
        code: 'ORDER_VALIDATION_ERROR',
        domain: 'orders',
      });

      expect(isConnectivityOrTimeoutError(netErr)).toBe(true);
      expect(isConnectivityOrTimeoutError(validationErr)).toBe(false);
    });

    it('extrae mensajes globales amigables con getGlobalErrorMessage y normalizeNotificationServiceError', () => {
      const raw503 = {
        isAxiosError: true,
        response: {
          status: 503,
          data: { detail: 'Servicio de avisos en mantenimiento' },
        },
      };

      const normalized = normalizeNotificationServiceError(
        raw503,
        'No fue posible consultar avisos.'
      );

      expect(normalized.code).toBe('NOTIFICATION_CONTRACT_UNAVAILABLE');
      expect(normalized.domain).toBe('notifications');
      expect(getGlobalErrorMessage(normalized)).toBe('Servicio de avisos en mantenimiento');
    });
  });
});

