import { create } from 'zustand';

import { User } from '@/models/user.model';
import { UserRole } from '@/constants/roles';
import { storage, STORAGE_KEYS } from '@/utils/storage';

export interface AuthState {
  user: User | null;
  token: string | null;
  role: UserRole | null;

  isAuthenticated: boolean;
  isLoading: boolean;
  isHydrated: boolean;

  setAuth: (user: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  role: null,

  isAuthenticated: false,
  isLoading: false,
  isHydrated: false,

  /**
   * Guarda la sesión tanto en memoria como en almacenamiento.
   */
  setAuth: async (user: User, token: string) => {
    set({
      isLoading: true,
    });

    try {
      await storage.set(
        STORAGE_KEYS.AUTH_TOKEN,
        token
      );

      await storage.setObject(
        STORAGE_KEYS.USER_DATA,
        user
      );

      set({
        user,
        token,
        role: user.role,

        isAuthenticated: true,
        isLoading: false,
        isHydrated: true,
      });
    } catch (error) {
      console.error(
        'Error al guardar la sesión:',
        error
      );

      set({
        isLoading: false,
      });

      throw error;
    }
  },

  /**
   * Cierra la sesión actual.
   */
  logout: async () => {
    set({
      isLoading: true,
    });

    try {
      await storage.clearSession();
    } finally {
      set({
        user: null,
        token: null,
        role: null,

        isAuthenticated: false,
        isLoading: false,
        isHydrated: true,
      });
    }
  },

  /**
   * Recupera una sesión guardada previamente.
   *
   * Esto permite que al recargar la aplicación el usuario
   * no tenga que iniciar sesión nuevamente.
   */
  restoreSession: async () => {
    set({
      isLoading: true,
    });

    try {
      const token = await storage.get(
        STORAGE_KEYS.AUTH_TOKEN
      );

      const user =
        await storage.getObject<User>(
          STORAGE_KEYS.USER_DATA
        );

      if (token && user) {
        set({
          user,
          token,
          role: user.role,

          isAuthenticated: true,
          isLoading: false,
          isHydrated: true,
        });

        return;
      }

      set({
        user: null,
        token: null,
        role: null,

        isAuthenticated: false,
        isLoading: false,
        isHydrated: true,
      });
    } catch (error) {
      console.error(
        'Error al restaurar la sesión:',
        error
      );

      set({
        user: null,
        token: null,
        role: null,

        isAuthenticated: false,
        isLoading: false,
        isHydrated: true,
      });
    }
  },

  setLoading: (loading: boolean) => {
    set({
      isLoading: loading,
    });
  },
}));