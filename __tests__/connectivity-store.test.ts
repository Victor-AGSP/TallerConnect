import axios from 'axios';
import { useConnectivityStore } from '@/stores/connectivityStore';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('connectivityStore (Gestión Global de Conectividad)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useConnectivityStore.getState().reset();
  });

  it('inicia con un estado de conectividad saludable', () => {
    const state = useConnectivityStore.getState();

    expect(state.isConnected).toBe(true);
    expect(state.hasNetworkIssue).toBe(false);
    expect(state.isChecking).toBe(false);
    expect(state.errorMessage).toBeNull();
    expect(state.issueType).toBeNull();
    expect(state.consecutiveFailures).toBe(0);
    expect(state.lastCheckedAt).toBeNull();
  });

  it('setConnected(false) marca que existe un problema de conectividad', () => {
    useConnectivityStore.getState().setConnected(false);

    const state = useConnectivityStore.getState();
    expect(state.isConnected).toBe(false);
    expect(state.hasNetworkIssue).toBe(true);
    expect(state.issueType).toBe('offline');
    expect(state.consecutiveFailures).toBe(1);
    expect(state.errorMessage).toBe('Sin conexión a internet');
  });

  it('setNetworkIssue registra el mensaje descriptivo y tipo del fallo', () => {
    useConnectivityStore
      .getState()
      .setNetworkIssue('Tiempo de espera agotado al consultar la API Gateway.');

    const state = useConnectivityStore.getState();
    expect(state.isConnected).toBe(false);
    expect(state.hasNetworkIssue).toBe(true);
    expect(state.issueType).toBe('timeout');
    expect(state.consecutiveFailures).toBe(1);
    expect(state.errorMessage).toBe(
      'Tiempo de espera agotado al consultar la API Gateway.'
    );
  });

  it('reportNetworkError clasifica correctamente errores de timeout, gateway_unavailable y offline', () => {
    useConnectivityStore.getState().reportNetworkError({
      message: 'Gateway 503',
      status: 503,
      isServerError: true,
    });

    expect(useConnectivityStore.getState().issueType).toBe('gateway_unavailable');
    expect(useConnectivityStore.getState().consecutiveFailures).toBe(1);

    useConnectivityStore.getState().reportNetworkError({
      message: 'Solicitud excedió 15s',
      isTimeout: true,
    });

    expect(useConnectivityStore.getState().issueType).toBe('timeout');
    expect(useConnectivityStore.getState().consecutiveFailures).toBe(2);
  });

  it('clearNetworkIssue restablece el estado de conectividad y el contador de fallos', () => {
    useConnectivityStore.getState().setNetworkIssue('Falla de red');
    expect(useConnectivityStore.getState().hasNetworkIssue).toBe(true);

    useConnectivityStore.getState().clearNetworkIssue();

    const state = useConnectivityStore.getState();
    expect(state.isConnected).toBe(true);
    expect(state.hasNetworkIssue).toBe(false);
    expect(state.issueType).toBeNull();
    expect(state.consecutiveFailures).toBe(0);
    expect(state.errorMessage).toBeNull();
  });

  describe('checkConnectivity', () => {
    it('ejecuta customPing exitosamente y limpia cualquier problema previo', async () => {
      useConnectivityStore.getState().setNetworkIssue('Error previo');

      const mockPing = jest.fn().mockResolvedValue(true);
      const result = await useConnectivityStore
        .getState()
        .checkConnectivity(mockPing);

      expect(result).toBe(true);
      expect(mockPing).toHaveBeenCalledTimes(1);

      const state = useConnectivityStore.getState();
      expect(state.isConnected).toBe(true);
      expect(state.hasNetworkIssue).toBe(false);
      expect(state.isChecking).toBe(false);
      expect(state.lastCheckedAt).toEqual(expect.any(String));
    });

    it('registra fallo si customPing retorna false', async () => {
      const mockPing = jest.fn().mockResolvedValue(false);
      const result = await useConnectivityStore
        .getState()
        .checkConnectivity(mockPing);

      expect(result).toBe(false);

      const state = useConnectivityStore.getState();
      expect(state.isConnected).toBe(false);
      expect(state.hasNetworkIssue).toBe(true);
      expect(state.errorMessage).toContain('No fue posible conectar con el servidor');
      expect(state.isChecking).toBe(false);
    });

    it('detecta conectividad activa si la API Gateway responde con 200 OK', async () => {
      mockedAxios.get.mockResolvedValueOnce({ status: 200 });

      const result = await useConnectivityStore.getState().checkConnectivity();

      expect(result).toBe(true);
      expect(useConnectivityStore.getState().isConnected).toBe(true);
      expect(useConnectivityStore.getState().hasNetworkIssue).toBe(false);
    });

    it('detecta conectividad activa si la API Gateway responde con código HTTP de aplicación (ej. 401)', async () => {
      const httpError = {
        isAxiosError: true,
        response: { status: 401 },
      };
      mockedAxios.isAxiosError.mockReturnValueOnce(true);
      mockedAxios.get.mockRejectedValueOnce(httpError);

      const result = await useConnectivityStore.getState().checkConnectivity();

      expect(result).toBe(true);
      expect(useConnectivityStore.getState().isConnected).toBe(true);
      expect(useConnectivityStore.getState().hasNetworkIssue).toBe(false);
    });

    it('marca gateway_unavailable si la API Gateway responde con 503 Service Unavailable', async () => {
      const gatewayError = {
        isAxiosError: true,
        response: { status: 503 },
      };
      mockedAxios.isAxiosError.mockReturnValueOnce(true);
      mockedAxios.get.mockRejectedValueOnce(gatewayError);

      const result = await useConnectivityStore.getState().checkConnectivity();

      expect(result).toBe(false);
      expect(useConnectivityStore.getState().hasNetworkIssue).toBe(true);
      expect(useConnectivityStore.getState().issueType).toBe('gateway_unavailable');
    });

    it('registra timeout si la verificación se agota (ECONNABORTED)', async () => {
      const timeoutError = {
        isAxiosError: true,
        code: 'ECONNABORTED',
      };
      mockedAxios.isAxiosError.mockReturnValue(true);
      mockedAxios.get.mockRejectedValueOnce(timeoutError);

      const result = await useConnectivityStore.getState().checkConnectivity();

      expect(result).toBe(false);
      expect(useConnectivityStore.getState().hasNetworkIssue).toBe(true);
      expect(useConnectivityStore.getState().issueType).toBe('timeout');
      expect(useConnectivityStore.getState().errorMessage).toContain(
        'Tiempo de espera agotado'
      );
    });
  });
});
