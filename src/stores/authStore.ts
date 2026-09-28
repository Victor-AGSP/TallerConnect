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

export const useAuthStore = create<AuthState>((set) => {
  let revision = 0;
  let storageQueue: Promise<void> = Promise.resolve();

  // Serialize writes/deletes so a previous logout cannot erase a newer login.
  function mutateStorage(action: () => Promise<void>) {
    const result = storageQueue.then(action);
    storageQueue = result.catch(() => undefined);
    return result;
  }

  async function authenticate(load: () => Promise<AuthResponse>) {
    const operation = ++revision;
    set({ ...emptySession, isLoading: true, sessionIssue: null });
    try {
      const validated = authResponseSchema.parse(await load());
      await mutateStorage(async () => {
        if (operation !== revision) throw new Error('La operación de sesión fue reemplazada.');
        await storage.set(AUTH_SESSION_STORAGE_KEY, JSON.stringify(validated));
      });
      if (operation !== revision) throw new Error('La operación de sesión fue reemplazada.');
      set(authenticatedState(validated));
    } catch (error) {
      if (operation === revision) set({ ...emptySession, isLoading: false });
      throw error;
    }
  }

  async function hydrateStoredSession() {
    const operation = ++revision;
    set({ isLoading: true, sessionIssue: null });
    try {
      await storageQueue;
      if (operation !== revision) return;
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
      if (operation !== revision) return;
      const parsed = authResponseSchema.safeParse(candidate);
      if (!parsed.success) {
        await mutateStorage(async () => {
          if (operation === revision) await clearPersistedSession();
        });
        if (operation === revision) set({ ...emptySession, isLoading: false, isHydrated: true });
        return;
      }
      if (!storedSession) {
        await mutateStorage(async () => {
          if (operation !== revision) return;
          // Persist validated data before retiring legacy keys.
          await storage.set(AUTH_SESSION_STORAGE_KEY, JSON.stringify(parsed.data));
          await storage.clearSession();
        });
      }
      if (operation === revision) set(authenticatedState(parsed.data));
    } catch {
      if (operation === revision) set({
        ...emptySession, isLoading: false, isHydrated: true,
        sessionIssue: { kind: 'restore', message: 'No se pudo recuperar la sesión del dispositivo. Reintenta para volver a leerla.' },
      });
    }
  }

  return {
    ...emptySession,
    isLoading: true,
    isHydrated: false,
    sessionIssue: null,
    login: (credentials) => authenticate(() => authService.login(credentials)),
    setAuth: (user, token, refreshToken) => authenticate(async () => ({ user, token, refreshToken })),
    logout: async () => {
      const operation = ++revision;
      set({ ...emptySession, isLoading: false, isHydrated: true, sessionIssue: null });
      try {
        // Always finish this deletion, even when a new login has already started.
        await mutateStorage(clearPersistedSession);
      } catch {
        if (operation === revision) set({ sessionIssue: {
          kind: 'logout',
          message: 'La sesión se cerró en memoria, pero no se pudieron borrar todos los datos guardados. Reintenta la limpieza antes de cerrar la app.',
        } });
      }
    },
    hydrateSession: hydrateStoredSession,
    restoreSession: hydrateStoredSession,
    setLoading: (loading) => set({ isLoading: loading }),
  };
});
