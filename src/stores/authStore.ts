import { create } from 'zustand';

import type { LoginCredentials, User } from '@/models';
import type { UserRole } from '@/constants/roles';

import {
  authService,
  getCurrentUser,
} from '@/services/auth.service';

import {
  authResponseSchema,
} from '@/schemas/auth.schema';

import {
  storage,
  STORAGE_KEYS,
} from '@/utils/storage';

export const AUTH_SESSION_STORAGE_KEY =
  'tallerconnect.auth.session';

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

  refreshToken: string | null;

  role: UserRole | null;

  isAuthenticated: boolean;

  isLoading: boolean;

  isHydrated: boolean;

  login: (
    credentials: LoginCredentials
  ) => Promise<void>;

  setAuth: (
    user: User,
    token: string,
    refreshToken?: string
  ) => Promise<void>;

  logout: () => Promise<void>;

  hydrateSession: () => Promise<void>;

  restoreSession: () => Promise<void>;

  setLoading: (
    loading: boolean
  ) => void;
}

type AuthSet = (
  partial: Partial<AuthState>
) => void;

/**
 * ============================================================
 * RESTAURAR SESIÓN
 * ============================================================
 */
async function hydrateStoredSession(
  set: AuthSet
): Promise<void> {
  set({
    isLoading: true,
  });

  let candidate: unknown = null;

  /**
   * Primero buscamos la sesión nueva.
   */
  const storedSession =
    await storage.get(
      AUTH_SESSION_STORAGE_KEY
    );

  if (storedSession) {
    try {
      candidate =
        JSON.parse(storedSession);
    } catch {
      candidate = null;
    }
  } else {
    /**
     * Compatibilidad con la sesión utilizada
     * por la versión anterior de Javier.
     */
    const [
      token,
      user,
    ] = await Promise.all([
      storage.get(
        STORAGE_KEYS.AUTH_TOKEN
      ),

      storage.getObject<User>(
        STORAGE_KEYS.USER_DATA
      ),
    ]);

    if (token && user) {
      candidate = {
        user,
        token,
      };
    }
  }

  const parsedSession =
    authResponseSchema.safeParse(
      candidate
    );

  /**
   * Sesión inválida.
   */
  if (!parsedSession.success) {
    await storage.remove(
      AUTH_SESSION_STORAGE_KEY
    );

    await storage.clearSession();

    set({
      ...emptySession,
      isLoading: false,
      isHydrated: true,
    });

    return;
  }

  const {
    user,
    token,
    refreshToken,
  } =
    parsedSession.data;

  set({
    user,

    token,

    refreshToken:
      refreshToken ?? null,

    role: user.role,

    isAuthenticated: true,

    isLoading: false,

    isHydrated: true,
  });
}

/**
 * ============================================================
 * AUTH STORE
 * ============================================================
 */
export const useAuthStore =
  create<AuthState>((set) => ({
    ...emptySession,

    isLoading: true,

    isHydrated: false,

    /**
     * ========================================================
     * LOGIN
     * ========================================================
     */
    login: async (
      credentials
    ) => {
      set({
        isLoading: true,
      });

      try {
        const response =
          await authService.login(
            credentials
          );

        /**
         * Guardamos la sesión completa.
         */
        await storage.set(
          AUTH_SESSION_STORAGE_KEY,
          JSON.stringify(response)
        );

        /**
         * También mantenemos las claves antiguas
         * para compatibilidad con el código existente.
         */
        await storage.set(
          STORAGE_KEYS.AUTH_TOKEN,
          response.token
        );

        await storage.setObject(
          STORAGE_KEYS.USER_DATA,
          response.user
        );

        set({
          user: response.user,

          token: response.token,

          refreshToken:
            response.refreshToken ?? null,

          role: response.user.role,

          isAuthenticated: true,

          isLoading: false,

          isHydrated: true,
        });
      } catch (error) {
        set({
          isLoading: false,
        });

        throw error;
      }
    },

    /**
     * ========================================================
     * SET AUTH
     * ========================================================
     */
    setAuth: async (
      user,
      token,
      refreshToken
    ) => {
      const response = {
        user,
        token,
        refreshToken,
      };

      set({
        user,

        token,

        refreshToken:
          refreshToken ?? null,

        role: user.role,

        isAuthenticated: true,

        isLoading: false,

        isHydrated: true,
      });

      await storage.set(
        AUTH_SESSION_STORAGE_KEY,
        JSON.stringify(response)
      );

      await storage.set(
        STORAGE_KEYS.AUTH_TOKEN,
        token
      );

      await storage.setObject(
        STORAGE_KEYS.USER_DATA,
        user
      );
    },

    /**
     * ========================================================
     * LOGOUT
     * ========================================================
     */
    logout: async () => {
      set({
        ...emptySession,

        isLoading: false,

        isHydrated: true,
      });

      await storage.remove(
        AUTH_SESSION_STORAGE_KEY
      );

      await storage.clearSession();
    },

    /**
     * ========================================================
     * HYDRATE SESSION
     * ========================================================
     */
    hydrateSession: async () => {
      await hydrateStoredSession(
        set
      );
    },

    /**
     * ========================================================
     * RESTORE SESSION
     * ========================================================
     *
     * Valida el token almacenado con el backend mediante getCurrentUser().
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

        const user =
          await getCurrentUser();

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
     * LOADING
     * ========================================================
     */
    setLoading: (
      loading
    ) => {
      set({
        isLoading: loading,
      });
    },
  }));