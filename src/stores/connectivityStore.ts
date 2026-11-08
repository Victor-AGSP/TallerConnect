import { create } from 'zustand';
import axios from 'axios';
import { ENV } from '@/config/env';

export type ConnectivityIssueType = 'offline' | 'timeout' | 'gateway_unavailable' | null;

export interface ConnectivityState {
  /**
   * Indica si el dispositivo tiene conectividad con la red y la API Gateway.
   */
  isConnected: boolean;

  /**
   * Indica si se está realizando una verificación activa de conectividad.
   */
  isChecking: boolean;

  /**
   * Mensaje descriptivo del último error de red o timeout detectado.
   */
  errorMessage: string | null;

  /**
   * Bandera que determina si hay un problema de conectividad activo que deba alertarse en la UI.
   */
  hasNetworkIssue: boolean;

  /**
   * Categoría del problema de conectividad actual (offline, timeout o indisponibilidad de Gateway).
   */
  issueType: ConnectivityIssueType;

  /**
   * Contador de fallos consecutivos de red/conectividad detectados.
   */
  consecutiveFailures: number;

  /**
   * Marca de tiempo ISO de la última verificación activa de conectividad.
   */
  lastCheckedAt: string | null;

  /**
   * Actualiza el estado de conectividad directamente.
   */
  setConnected: (connected: boolean) => void;

  /**
   * Registra un problema de red o timeout detectado por los interceptores.
   */
  setNetworkIssue: (message: string, issueType?: ConnectivityIssueType) => void;

  /**
   * Registra un fallo estructurado proveniente del interceptor HTTP o capa de servicios.
   */
  reportNetworkError: (params: {
    message: string;
    isTimeout?: boolean;
    isServerError?: boolean;
    status?: number;
  }) => void;

  /**
   * Limpia los errores de red y restablece el estado de conectividad a saludable.
   */
  clearNetworkIssue: () => void;

  /**
   * Ejecuta una verificación activa (ping) hacia la API Gateway para comprobar si la red se recuperó.
   */
  checkConnectivity: (customPing?: () => Promise<boolean>) => Promise<boolean>;

  /**
   * Restablece el store a su estado inicial.
   */
  reset: () => void;
}

const initialState = {
  isConnected: true,
  isChecking: false,
  errorMessage: null as string | null,
  hasNetworkIssue: false,
  issueType: null as ConnectivityIssueType,
  consecutiveFailures: 0,
  lastCheckedAt: null as string | null,
};

export const useConnectivityStore = create<ConnectivityState>((set, get) => ({
  ...initialState,

  setConnected: (connected: boolean) => {
    set({
      isConnected: connected,
      hasNetworkIssue: !connected,
      issueType: connected ? null : get().issueType ?? 'offline',
      consecutiveFailures: connected ? 0 : Math.max(1, get().consecutiveFailures),
      errorMessage: connected ? null : get().errorMessage ?? 'Sin conexión a internet',
    });
  },

  setNetworkIssue: (message: string, issueType?: ConnectivityIssueType) => {
    const resolvedType: ConnectivityIssueType =
      issueType ??
      (message.toLowerCase().includes('tiempo de espera') ? 'timeout' : 'offline');

    set({
      isConnected: false,
      hasNetworkIssue: true,
      issueType: resolvedType,
      consecutiveFailures: get().consecutiveFailures + 1,
      errorMessage: message,
    });
  },

  reportNetworkError: ({ message, isTimeout, isServerError, status }) => {
    const issueType: ConnectivityIssueType = isTimeout
      ? 'timeout'
      : isServerError || status === 502 || status === 503 || status === 504
      ? 'gateway_unavailable'
      : 'offline';

    set({
      isConnected: false,
      hasNetworkIssue: true,
      issueType,
      consecutiveFailures: get().consecutiveFailures + 1,
      errorMessage: message,
    });
  },

  clearNetworkIssue: () => {
    set({
      isConnected: true,
      hasNetworkIssue: false,
      issueType: null,
      consecutiveFailures: 0,
      errorMessage: null,
    });
  },

  checkConnectivity: async (customPing?: () => Promise<boolean>): Promise<boolean> => {
    set({ isChecking: true });
    const checkedAt = new Date().toISOString();

    try {
      if (customPing) {
        const success = await customPing();
        if (success) {
          get().clearNetworkIssue();
        } else {
          get().setNetworkIssue('No fue posible conectar con el servidor.', 'offline');
        }
        set({ isChecking: false, lastCheckedAt: checkedAt });
        return success;
      }

      // Verificación directa mediante ping HTTP ligero hacia la API Gateway (timeout de 5s)
      await axios.get(ENV.API_URL, {
        timeout: ENV.PING_TIMEOUT_MS,
        headers: { Accept: 'application/json' },
      });

      get().clearNetworkIssue();
      set({ isChecking: false, lastCheckedAt: checkedAt });
      return true;
    } catch (error: unknown) {
      // Si el servidor respondió con un código HTTP que demuestra alcance a la Gateway (ej. 401, 404, 405)
      if (axios.isAxiosError(error) && error.response) {
        const status = error.response.status;
        if (status === 502 || status === 503 || status === 504) {
          get().setNetworkIssue(
            'La API Gateway no se encuentra disponible temporalmente.',
            'gateway_unavailable'
          );
          set({ isChecking: false, lastCheckedAt: checkedAt });
          return false;
        }

        get().clearNetworkIssue();
        set({ isChecking: false, lastCheckedAt: checkedAt });
        return true;
      }

      // Si no hubo respuesta o fue timeout, la red sigue caída
      const isTimeout =
        axios.isAxiosError(error) &&
        (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT');

      const message = isTimeout
        ? 'Tiempo de espera agotado al verificar conexión.'
        : 'Backend no disponible o sin conexión a internet.';

      get().setNetworkIssue(message, isTimeout ? 'timeout' : 'offline');
      set({ isChecking: false, lastCheckedAt: checkedAt });
      return false;
    }
  },

  reset: () => {
    set(initialState);
  },
}));
