import { create } from 'zustand';
import axios from 'axios';
import { ENV } from '@/config/env';

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
   * Actualiza el estado de conectividad directamente.
   */
  setConnected: (connected: boolean) => void;

  /**
   * Registra un problema de red o timeout detectado por los interceptores.
   */
  setNetworkIssue: (message: string) => void;

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
  errorMessage: null,
  hasNetworkIssue: false,
};

export const useConnectivityStore = create<ConnectivityState>((set, get) => ({
  ...initialState,

  setConnected: (connected: boolean) => {
    set({
      isConnected: connected,
      hasNetworkIssue: !connected,
      errorMessage: connected ? null : get().errorMessage ?? 'Sin conexión a internet',
    });
  },

  setNetworkIssue: (message: string) => {
    set({
      isConnected: false,
      hasNetworkIssue: true,
      errorMessage: message,
    });
  },

  clearNetworkIssue: () => {
    set({
      isConnected: true,
      hasNetworkIssue: false,
      errorMessage: null,
    });
  },

  checkConnectivity: async (customPing?: () => Promise<boolean>): Promise<boolean> => {
    set({ isChecking: true });

    try {
      if (customPing) {
        const success = await customPing();
        if (success) {
          get().clearNetworkIssue();
        } else {
          get().setNetworkIssue('No fue posible conectar con el servidor.');
        }
        set({ isChecking: false });
        return success;
      }

      // Verificación directa mediante ping HTTP ligero hacia la API Gateway (timeout de 5s)
      await axios.get(ENV.API_URL, {
        timeout: 5000,
        headers: { Accept: 'application/json' },
      });

      get().clearNetworkIssue();
      set({ isChecking: false });
      return true;
    } catch (error: unknown) {
      // Si el servidor respondió con cualquier código HTTP (ej. 401, 404, 405), significa que hay conexión de red
      if (axios.isAxiosError(error) && error.response) {
        get().clearNetworkIssue();
        set({ isChecking: false });
        return true;
      }

      // Si no hubo respuesta o fue timeout, la red sigue caída
      const message =
        axios.isAxiosError(error) && error.code === 'ECONNABORTED'
          ? 'Tiempo de espera agotado al verificar conexión.'
          : 'Backend no disponible o sin conexión a internet.';

      get().setNetworkIssue(message);
      set({ isChecking: false });
      return false;
    }
  },

  reset: () => {
    set(initialState);
  },
}));
