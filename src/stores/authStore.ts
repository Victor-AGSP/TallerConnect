import { create } from 'zustand';

import { User } from '@/models/user.model';

import { UserRole } from '@/constants/roles';

import {
  getCurrentUser,
} from '@/services/auth.service';

import {
  storage,
  STORAGE_KEYS,
} from '@/utils/storage';

export const AUTH_SESSION_STORAGE_KEY = 'tallerconnect.auth.session';

const emptySession = {
  user: null,
  token: null,
  refreshToken: null,
  role: null,
  isAuthenticated: false,
} as const;

export interface AuthState {
  user: User | null;

  token: string | null;
  role: UserRole | null;
  isAuthenticated: boolean;

  isLoading: boolean;

  isHydrated: boolean;

  setAuth: (
    user: User,
    token: string
  ) => Promise<void>;

  logout: () => Promise<void>;

  restoreSession: () => Promise<void>;

  setLoading: (
    loading: boolean
  ) => void;
}

export const useAuthStore =
  create<AuthState>((set) => ({
    user: null,

    token: null,

    role: null,

    isAuthenticated: false,

    isLoading: false,

    isHydrated: false,

    /**
     * ========================================================
     * GUARDAR SESIÓN
     * ========================================================
     */
    setAuth: async (
      user: User,
      token: string
    ) => {
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
     * ========================================================
     * CERRAR SESIÓN
     * ========================================================
     *
     * El backend no documenta un endpoint de logout.
     *
     * El JWT es stateless, por lo que el logout del cliente
     * consiste en eliminar la sesión local.
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
     * ========================================================
     * RESTAURAR SESIÓN
     * ========================================================
     *
     * 1. Busca JWT almacenado.
     * 2. Si no existe, no hay sesión.
     * 3. Si existe, consulta /auth/me.
     * 4. El backend valida realmente el JWT.
     * 5. Si es válido, actualizamos el usuario.
     * 6. Si es inválido, eliminamos la sesión.
     */
    restoreSession: async () => {
      set({
        isLoading: true,
      });

      try {
        const token =
          await storage.get(
            STORAGE_KEYS.AUTH_TOKEN
          );

        if (!token) {
          set({
            user: null,

            token: null,

            role: null,

            isAuthenticated: false,

            isLoading: false,

            isHydrated: true,
          });

          return;
        }

        /**
         * Validación real contra el backend.
         */
        const user =
          await getCurrentUser();

        /**
         * Actualizamos los datos del usuario
         * almacenados localmente.
         */
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
          'La sesión almacenada no es válida:',
          error
        );

        /**
         * El JWT ya no es válido.
         * Eliminamos toda la sesión.
         */
        await storage.clearSession();

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
     * ========================================================
     * ESTADO DE CARGA
     * ========================================================
     */
    setLoading: (
      loading: boolean
    ) => {
      set({
        isLoading: loading,
      });
    },
  }));
