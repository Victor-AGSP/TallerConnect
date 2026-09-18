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
   * Establece la sesión en memoria y persiste el token y datos del usuario en SecureStore.
   */
  setAuth: async (user: User, token: string) => {
    set({ isLoading: true });
    try {
      await storage.set(STORAGE_KEYS.AUTH_TOKEN, token);
      await storage.setObject(STORAGE_KEYS.USER_DATA, user);

      set({
        user,
        token,
        role: user.role,
        isAuthenticated: true,
        isLoading: false,
        isHydrated: true,
      });
    } catch (error) {
      console.error('Error al persistir sesión en SecureStore:', error);
      set({ isLoading: false });
    }
  },

  /**
   * Cierra la sesión activa, limpiando el estado en memoria y eliminando las credenciales de SecureStore.
   */
  logout: async () => {
    set({ isLoading: true });
    try {
      await storage.clearSession();
      set({
        user: null,
        token: null,
        role: null,
        isAuthenticated: false,
        isLoading: false,
        isHydrated: true,
      });
    } catch (error) {
      console.error('Error al limpiar sesión en SecureStore:', error);
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
   * Recupera el token y usuario persistidos en SecureStore para hidratar el store al arrancar.
   */
  restoreSession: async () => {
    set({ isLoading: true });
    try {
      const token = await storage.get(STORAGE_KEYS.AUTH_TOKEN);
      const user = await storage.getObject<User>(STORAGE_KEYS.USER_DATA);

      if (token && user) {
        set({
          user,
          token,
          role: user.role,
          isAuthenticated: true,
          isLoading: false,
          isHydrated: true,
        });
      } else {
        set({
          user: null,
          token: null,
          role: null,
          isAuthenticated: false,
          isLoading: false,
          isHydrated: true,
        });
      }
    } catch (error) {
      console.error('Error al restaurar sesión desde SecureStore:', error);
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
   * Modifica manualmente el indicador de carga.
   */
  setLoading: (loading: boolean) => set({ isLoading: loading }),
}));
