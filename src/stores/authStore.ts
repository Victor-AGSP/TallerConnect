import { create } from 'zustand';
import type { LoginCredentials, User } from '@/models';
import type { UserRole } from '@/constants/roles';
import { authService } from '@/services/auth.service';
import { authResponseSchema } from '@/schemas/auth.schema';
import { storage, STORAGE_KEYS } from '@/utils/storage';

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
  isHydrated: boolean;

  login: (credentials: LoginCredentials) => Promise<void>;
  setAuth: (user: User, token: string, refreshToken?: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrateSession: () => Promise<void>;
  restoreSession: () => Promise<void>;
  setLoading: (loading: boolean) => void;
}

type AuthSet = (partial: Partial<AuthState>) => void;

async function hydrateStoredSession(set: AuthSet): Promise<void> {
  set({ isLoading: true });

  let candidate: unknown = null;
  const storedSession = await storage.get(AUTH_SESSION_STORAGE_KEY);

  if (storedSession) {
    try {
      candidate = JSON.parse(storedSession);
    } catch {
      candidate = null;
    }
  } else {
    // Migrate sessions written by Develop's separate token/user storage.
    const [token, user] = await Promise.all([
      storage.get(STORAGE_KEYS.AUTH_TOKEN),
      storage.getObject<User>(STORAGE_KEYS.USER_DATA),
    ]);
    if (token && user) candidate = { user, token };
  }

  const parsedSession = authResponseSchema.safeParse(candidate);
  if (!parsedSession.success) {
    await storage.remove(AUTH_SESSION_STORAGE_KEY);
    await storage.clearSession();
    set({ ...emptySession, isLoading: false, isHydrated: true });
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
    isHydrated: true,
  });
}

export const useAuthStore = create<AuthState>((set) => ({
  ...emptySession,
  isLoading: true,
  isHydrated: false,

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
        isHydrated: true,
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
      isHydrated: true,
    });
    await storage.set(AUTH_SESSION_STORAGE_KEY, JSON.stringify(response));
  },

  logout: async () => {
    set({ ...emptySession, isLoading: false, isHydrated: true });
    await storage.remove(AUTH_SESSION_STORAGE_KEY);
    await storage.clearSession();
  },

  hydrateSession: async () => hydrateStoredSession(set),
  restoreSession: async () => hydrateStoredSession(set),
  setLoading: (loading) => set({ isLoading: loading }),
}));
