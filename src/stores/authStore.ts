import { create } from 'zustand';
import type { LoginCredentials, User } from '@/models';
import type { UserRole } from '@/constants/roles';
import { authService } from '@/services/auth.service';
import { authResponseSchema } from '@/schemas/auth.schema';
import { storage } from '@/utils/storage';

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
  refreshToken: string | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (credentials: LoginCredentials) => Promise<void>;
  setAuth: (
    user: User,
    token: string,
    refreshToken?: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  hydrateSession: () => Promise<void>;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  refreshToken: null,
  role: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (credentials) => {
    set({ isLoading: true });

    try {
      const response = await authService.login(credentials);
      await storage.set(AUTH_SESSION_STORAGE_KEY, JSON.stringify(response));

      set({
        user: response.user,
        token: response.token,
        refreshToken: response.refreshToken ?? null,
        role: response.user.role,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  setAuth: async (user, token, refreshToken) => {
    const response = { user, token, refreshToken };
    set({
      user,
      token,
      refreshToken: refreshToken ?? null,
      role: user.role,
      isAuthenticated: true,
      isLoading: false,
    });
    await storage.set(AUTH_SESSION_STORAGE_KEY, JSON.stringify(response));
  },

  logout: async () => {
    set({ ...emptySession, isLoading: false });
    await storage.remove(AUTH_SESSION_STORAGE_KEY);
  },

  hydrateSession: async () => {
    set({ isLoading: true });

    const storedSession = await storage.get(AUTH_SESSION_STORAGE_KEY);

    if (!storedSession) {
      set({ ...emptySession, isLoading: false });
      return;
    }

    let candidate: unknown;
    try {
      candidate = JSON.parse(storedSession);
    } catch {
      await storage.remove(AUTH_SESSION_STORAGE_KEY);
      set({ ...emptySession, isLoading: false });
      return;
    }

    const parsedSession = authResponseSchema.safeParse(candidate);
    if (!parsedSession.success) {
      await storage.remove(AUTH_SESSION_STORAGE_KEY);
      set({ ...emptySession, isLoading: false });
      return;
    }

    const { user, token, refreshToken } = parsedSession.data;
    set({
      user,
      token,
      refreshToken: refreshToken ?? null,
      role: user.role,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  setLoading: (loading) => set({ isLoading: loading }),
}));
