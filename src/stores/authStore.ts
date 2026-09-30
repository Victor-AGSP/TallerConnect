import { create } from 'zustand';
import type { AuthResponse, LoginCredentials, User } from '@/models';
import type { UserRole } from '@/constants/roles';
import { authService, getCurrentUser } from '@/services/auth.service';
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

  // Serialize session mutations so an old logout cannot erase a newer login.
  function mutateStorage(action: () => Promise<void>) {
    const result = storageQueue.then(action);
    storageQueue = result.catch(() => undefined);
    return result;
  }

  async function persistSession(response: AuthResponse) {
    // Gateway's request interceptor still reads the legacy token key.
    await storage.set(AUTH_SESSION_STORAGE_KEY, JSON.stringify(response));
    await storage.set(STORAGE_KEYS.AUTH_TOKEN, response.token);
    await storage.setObject(STORAGE_KEYS.USER_DATA, response.user);
  }

  async function authenticate(load: () => Promise<AuthResponse>) {
    const operation = ++revision;
    set({ ...emptySession, isLoading: true, sessionIssue: null });
    try {
      const response = authResponseSchema.parse(await load());
      await mutateStorage(async () => {
        if (operation !== revision) throw new Error('La operación de sesión fue reemplazada.');
        try {
          await persistSession(response);
        } catch (error) {
          // Remove any partial write before reporting the failed login.
          await clearPersistedSession();
          throw error;
        }
      });
      if (operation !== revision) throw new Error('La operación de sesión fue reemplazada.');
      set(authenticatedState(response));
    } catch (error) {
      if (operation === revision) set({ ...emptySession, isLoading: false });
      throw error;
    }
  }

  async function readStoredSession(): Promise<AuthResponse | null> {
    const storedSession = await storage.get(AUTH_SESSION_STORAGE_KEY);
    if (storedSession) {
      let candidate: unknown;
      try { candidate = JSON.parse(storedSession); } catch { return null; }
      const parsed = authResponseSchema.safeParse(candidate);
      return parsed.success ? parsed.data : null;
    }
    const [token, user] = await Promise.all([
      storage.get(STORAGE_KEYS.AUTH_TOKEN),
      storage.getObject<User>(STORAGE_KEYS.USER_DATA),
    ]);
    if (!token || !user) return null;
    const parsed = authResponseSchema.safeParse({ user, token });
    return parsed.success ? parsed.data : null;
  }

  async function hydrateStoredSession(validateWithBackend: boolean) {
    const operation = ++revision;
    set({ isLoading: true, sessionIssue: null });
    try {
      await storageQueue;
      if (operation !== revision) return;
      let response = await readStoredSession();
      if (operation !== revision) return;
      let validatedByBackend = false;
      if (!response && validateWithBackend) {
        // Older installations may have saved only a token. The backend
        // supplies the user needed to build the current session format.
        const token = await storage.get(STORAGE_KEYS.AUTH_TOKEN);
        if (token) {
          try {
            const user = await getCurrentUser();
            if (operation !== revision) return;
            response = authResponseSchema.parse({ user, token });
            validatedByBackend = true;
          } catch {
            if (operation !== revision) return;
            await mutateStorage(clearPersistedSession);
            set({ ...emptySession, isLoading: false, isHydrated: true });
            return;
          }
        }
      }
      if (!response) {
        await mutateStorage(async () => {
          if (operation === revision) await clearPersistedSession();
        });
        if (operation === revision) set({ ...emptySession, isLoading: false, isHydrated: true });
        return;
      }
      // Migrate legacy sessions and keep both keys synchronized for Gateway.
      await mutateStorage(async () => {
        if (operation === revision) await persistSession(response!);
      });
      if (operation !== revision) return;
      if (validateWithBackend && !validatedByBackend) {
        try {
          const user = await getCurrentUser();
          if (operation !== revision) return;
          response = authResponseSchema.parse({ ...response, user });
          await mutateStorage(async () => {
            if (operation === revision) await persistSession(response!);
          });
        } catch {
          if (operation !== revision) return;
          await mutateStorage(clearPersistedSession);
          set({ ...emptySession, isLoading: false, isHydrated: true });
          return;
        }
      }
      if (operation === revision) set(authenticatedState(response));
    } catch {
      if (operation === revision) set({
        ...emptySession, isLoading: false, isHydrated: true,
        sessionIssue: {
          kind: 'restore',
          message: 'No se pudo recuperar la sesión del dispositivo. Reintenta para volver a leerla.',
        },
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
        await mutateStorage(clearPersistedSession);
      } catch {
        if (operation === revision) set({ sessionIssue: {
          kind: 'logout',
          message: 'La sesión se cerró en memoria, pero no se pudieron borrar todos los datos guardados. Reintenta la limpieza antes de cerrar la app.',
        } });
      }
    },
    hydrateSession: () => hydrateStoredSession(false),
    restoreSession: () => hydrateStoredSession(true),
    setLoading: (loading) => set({ isLoading: loading }),
  };
});
