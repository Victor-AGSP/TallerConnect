import { create } from 'zustand';
import type { AuthResponse, LoginCredentials, User } from '@/models';
import type { UserRole } from '@/constants/roles';
import { authService } from '@/services/auth.service';
import { authResponseSchema } from '@/schemas/auth.schema';
import { storage, STORAGE_KEYS, StorageError } from '@/utils/storage';

export const AUTH_SESSION_STORAGE_KEY = 'tallerconnect.auth.session';

const emptySession = {
  user: null,
  token: null,
  refreshToken: null,
  role: null,
  isAuthenticated: false,
} as const;

type SessionIssue = { kind: 'restore' | 'logout'; message: string };

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isHydrated: boolean;
  sessionIssue: SessionIssue | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  setAuth: (user: User, token: string, refreshToken?: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrateSession: () => Promise<void>;
  restoreSession: () => Promise<void>;
  setLoading: (loading: boolean) => void;
}

type AuthSet = (partial: Partial<AuthState>) => void;

function authenticatedState({ user, token, refreshToken }: AuthResponse) {
  return {
    user, token, refreshToken: refreshToken ?? null, role: user.role,
    isAuthenticated: true, isLoading: false, isHydrated: true, sessionIssue: null,
  };
}

async function clearPersistedSession() {
  const results = await Promise.allSettled([
    storage.remove(AUTH_SESSION_STORAGE_KEY),
    storage.clearSession(),
  ]);
  if (results.some((result) => result.status === 'rejected')) {
    throw new StorageError('eliminar');
  }
}

async function hydrateStoredSession(set: AuthSet): Promise<void> {
  set({ isLoading: true, sessionIssue: null });
  try {
    let candidate: unknown = null;
    const storedSession = await storage.get(AUTH_SESSION_STORAGE_KEY);
    if (storedSession) {
      try { candidate = JSON.parse(storedSession); } catch { candidate = null; }
    } else {
      const [token, user] = await Promise.all([
        storage.get(STORAGE_KEYS.AUTH_TOKEN),
        storage.getObject<User>(STORAGE_KEYS.USER_DATA),
      ]);
      if (token && user) candidate = { user, token };
    }

    const parsed = authResponseSchema.safeParse(candidate);
    if (!parsed.success) {
      await clearPersistedSession();
      set({ ...emptySession, isLoading: false, isHydrated: true });
      return;
    }

    if (!storedSession) {
      // Write the validated session before retiring legacy keys.
      await storage.set(AUTH_SESSION_STORAGE_KEY, JSON.stringify(parsed.data));
      await storage.clearSession();
    }
    set(authenticatedState(parsed.data));
  } catch {
    set({
      ...emptySession, isLoading: false, isHydrated: true,
      sessionIssue: { kind: 'restore', message: 'No se pudo recuperar la sesión del dispositivo. Reintenta para volver a leerla.' },
    });
  }
}

async function persistSession(response: AuthResponse, set: AuthSet) {
  const validated = authResponseSchema.parse(response);
  await storage.set(AUTH_SESSION_STORAGE_KEY, JSON.stringify(validated));
  set(authenticatedState(validated));
}

export const useAuthStore = create<AuthState>((set) => ({
  ...emptySession,
  isLoading: true,
  isHydrated: false,
  sessionIssue: null,

  login: async (credentials) => {
    set({ ...emptySession, isLoading: true, sessionIssue: null });
    try {
      await persistSession(await authService.login(credentials), set);
    } catch (error) {
      set({ ...emptySession, isLoading: false });
      throw error;
    }
  },

  setAuth: async (user, token, refreshToken) => {
    set({ ...emptySession, isLoading: true, sessionIssue: null });
    try {
      await persistSession({ user, token, refreshToken }, set);
    } catch (error) {
      set({ ...emptySession, isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    set({ ...emptySession, isLoading: false, isHydrated: true, sessionIssue: null });
    try {
      await clearPersistedSession();
    } catch {
      set({ sessionIssue: { kind: 'logout', message: 'La sesión se cerró en memoria, pero no se pudieron borrar todos los datos guardados. Reintenta la limpieza antes de cerrar la app.' } });
    }
  },

  hydrateSession: async () => hydrateStoredSession(set),
  restoreSession: async () => hydrateStoredSession(set),
  setLoading: (loading) => set({ isLoading: loading }),
}));
