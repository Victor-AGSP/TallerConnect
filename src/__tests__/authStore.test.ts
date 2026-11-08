import { useAuthStore } from '@/stores/authStore';

import { getCurrentUser } from '@/services/auth.service';

import {
  storage,
  STORAGE_KEYS,
} from '@/utils/storage';

jest.mock('@/services/auth.service', () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock('@/utils/storage', () => ({
  storage: {
    set: jest.fn(),
    setObject: jest.fn(),
    get: jest.fn(),
    getObject: jest.fn(),
    remove: jest.fn(),
    clearSession: jest.fn(),
  },

  STORAGE_KEYS: {
    AUTH_TOKEN: 'tc_auth_token',
    USER_DATA: 'tc_user_data',
  },
}));

const mockedStorage =
  storage as jest.Mocked<typeof storage>;

const mockedGetCurrentUser =
  getCurrentUser as jest.MockedFunction<
    typeof getCurrentUser
  >;

describe('authStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedStorage.get.mockReset();
    mockedGetCurrentUser.mockReset();

    useAuthStore.setState({
      user: null,
      token: null,
      role: null,
      isAuthenticated: false,
      isLoading: false,
      isHydrated: false,
    });
  });

  it('debe iniciar sin una sesión autenticada', () => {
    const state = useAuthStore.getState();

    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.role).toBeNull();
  });

  it('debe guardar una sesión correctamente', async () => {
    const user = {
      id: '1',
      name: 'Cliente de Prueba',
      email: 'cliente@pruebas.cl',
      role: 'cliente' as const,
    };

    await useAuthStore
      .getState()
      .setAuth(user, 'jwt-token');

    const state =
      useAuthStore.getState();

    expect(state.user).toEqual(user);
    expect(state.token).toBe('jwt-token');
    expect(state.role).toBe('cliente');
    expect(state.isAuthenticated).toBe(true);

    expect(
      mockedStorage.set
    ).toHaveBeenCalledWith(
      STORAGE_KEYS.AUTH_TOKEN,
      'jwt-token'
    );

    expect(
      mockedStorage.setObject
    ).toHaveBeenCalledWith(
      STORAGE_KEYS.USER_DATA,
      user
    );
  });

  it('debe cerrar la sesión correctamente', async () => {
    useAuthStore.setState({
      user: {
        id: '1',
        name: 'Cliente de Prueba',
        email: 'cliente@pruebas.cl',
        role: 'cliente',
      },

      token: 'jwt-token',

      role: 'cliente',

      isAuthenticated: true,
      isLoading: false,
      isHydrated: true,
    });

    await useAuthStore
      .getState()
      .logout();

    const state =
      useAuthStore.getState();

    expect(
      mockedStorage.clearSession
    ).toHaveBeenCalled();

    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.role).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('debe restaurar una sesión almacenada', async () => {
    const user = {
      id: '1',
      name: 'Cliente de Prueba',
      email: 'cliente@pruebas.cl',
      role: 'cliente' as const,
    };

    mockedStorage.get.mockImplementation(async (key) =>
      key === STORAGE_KEYS.AUTH_TOKEN ? 'jwt-token' : null
    );

    mockedGetCurrentUser.mockResolvedValueOnce(
      user
    );

    await useAuthStore
      .getState()
      .restoreSession();

    const state =
      useAuthStore.getState();

    expect(
      mockedGetCurrentUser
    ).toHaveBeenCalled();

    expect(state.user).toEqual(user);
    expect(state.token).toBe('jwt-token');
    expect(state.role).toBe('cliente');
    expect(state.isAuthenticated).toBe(true);
    expect(state.isHydrated).toBe(true);

    expect(
      mockedStorage.setObject
    ).toHaveBeenCalledWith(
      STORAGE_KEYS.USER_DATA,
      user
    );
  });

  it('debe quedar no autenticado si no existe sesión almacenada', async () => {
    mockedStorage.get.mockResolvedValueOnce(
      null
    );

    await useAuthStore
      .getState()
      .restoreSession();

    const state =
      useAuthStore.getState();

    expect(
      mockedGetCurrentUser
    ).not.toHaveBeenCalled();

    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.role).toBeNull();
    expect(state.isHydrated).toBe(true);
  });

  it('debe eliminar la sesión si el token almacenado ya no es válido', async () => {
    mockedStorage.get.mockImplementation(async (key) =>
      key === STORAGE_KEYS.AUTH_TOKEN ? 'token-expirado' : null
    );

    mockedGetCurrentUser.mockRejectedValueOnce(
      new Error(
        'No se pudo validar la sesión.'
      )
    );

    await useAuthStore
      .getState()
      .restoreSession();

    const state =
      useAuthStore.getState();

    expect(
      mockedGetCurrentUser
    ).toHaveBeenCalled();

    expect(
      mockedStorage.clearSession
    ).toHaveBeenCalled();

    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.role).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isHydrated).toBe(true);
  });
});
