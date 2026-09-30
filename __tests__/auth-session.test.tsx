import { Text } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import {
  act,
  renderRouterWithProviders,
  resetStores,
  screen,
  waitFor,
} from '../test-utils';
import { mockAuthResponses } from '@/mocks/auth.mock';
import { authService } from '@/services/auth.service';
import IndexScreen from '@/app/index';
import { AUTH_SESSION_STORAGE_KEY, useAuthStore } from '@/stores/authStore';
import { STORAGE_KEYS } from '@/utils/storage';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('@/services/auth.service', () => ({
  authService: { login: jest.fn() },
}));

const getItem = jest.mocked(SecureStore.getItemAsync);
const setItem = jest.mocked(SecureStore.setItemAsync);
const deleteItem = jest.mocked(SecureStore.deleteItemAsync);
const login = jest.mocked(authService.login);

const routes = {
  index: IndexScreen,
  '(auth)/login': () => <Text>Iniciar sesión</Text>,
  administrador: () => <Text>Inicio administrador</Text>,
  mecanico: () => <Text>Inicio mecánico</Text>,
  cliente: () => <Text>Inicio cliente</Text>,
};

describe('persistencia y recuperación de sesión', () => {
  beforeEach(() => {
    resetStores();
    getItem.mockReset().mockResolvedValue(null);
    setItem.mockReset().mockResolvedValue(undefined);
    deleteItem.mockReset().mockResolvedValue(undefined);
    login.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it.each(['login', 'setAuth'] as const)('no autentica si %s no puede persistir la sesión', async (action) => {
    const response = mockAuthResponses.cliente;
    login.mockResolvedValueOnce(response);
    setItem.mockRejectedValueOnce(new Error('SecureStore unavailable'));
    const operation = action === 'login'
      ? useAuthStore.getState().login({ email: response.user.email, password: 'clave-segura' })
      : useAuthStore.getState().setAuth(response.user, response.token);

    await expect(operation).rejects.toThrow();
    expect(useAuthStore.getState()).toMatchObject({
      user: null, token: null, role: null, isAuthenticated: false, isLoading: false,
    });
  });

  it('migra la sesión antigua y conserva las claves que usa Gateway', async () => {
    const response = mockAuthResponses.cliente;
    getItem.mockImplementation(async (key) => {
      if (key === STORAGE_KEYS.AUTH_TOKEN) return response.token;
      if (key === STORAGE_KEYS.USER_DATA) return JSON.stringify(response.user);
      return null;
    });

    await useAuthStore.getState().hydrateSession();

    expect(setItem).toHaveBeenCalledWith(AUTH_SESSION_STORAGE_KEY,
      JSON.stringify({ user: response.user, token: response.token }));
    expect(setItem).toHaveBeenCalledWith(STORAGE_KEYS.AUTH_TOKEN, response.token);
    expect(setItem).toHaveBeenCalledWith(STORAGE_KEYS.USER_DATA, JSON.stringify(response.user));
    expect(deleteItem).not.toHaveBeenCalled();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('un fallo de lectura termina la carga sin borrar los datos recuperables', async () => {
    getItem.mockRejectedValueOnce(new Error('SecureStore locked'));
    await useAuthStore.getState().hydrateSession();

    expect(deleteItem).not.toHaveBeenCalled();
    expect(useAuthStore.getState()).toMatchObject({
      isAuthenticated: false, isLoading: false, isHydrated: true,
      sessionIssue: { kind: 'restore' },
    });
  });

  it('guarda en SecureStore la sesión devuelta por el login', async () => {
    const response = mockAuthResponses.cliente;
    login.mockResolvedValueOnce(response);

    await act(async () => {
      await useAuthStore.getState().login({
        email: 'cliente@tallerconnect.cl',
        password: 'clave-segura',
      });
    });

    expect(setItem).toHaveBeenCalledWith(
      AUTH_SESSION_STORAGE_KEY,
      JSON.stringify(response),
    );
    expect(setItem).toHaveBeenCalledWith(STORAGE_KEYS.AUTH_TOKEN, response.token);
    expect(setItem).toHaveBeenCalledWith(STORAGE_KEYS.USER_DATA, JSON.stringify(response.user));
    expect(useAuthStore.getState()).toMatchObject({
      user: response.user,
      token: response.token,
      refreshToken: response.refreshToken,
      role: 'cliente',
      isAuthenticated: true,
      isLoading: false,
    });
  });

  it('recupera usuario, token y rol desde SecureStore', async () => {
    const response = mockAuthResponses.mecanico;
    getItem.mockResolvedValueOnce(JSON.stringify(response));

    await act(async () => {
      await useAuthStore.getState().hydrateSession();
    });

    expect(getItem).toHaveBeenCalledWith(AUTH_SESSION_STORAGE_KEY);
    expect(useAuthStore.getState()).toMatchObject({
      user: response.user,
      token: response.token,
      refreshToken: response.refreshToken,
      role: 'mecanico',
      isAuthenticated: true,
      isLoading: false,
    });
    expect(deleteItem).not.toHaveBeenCalled();
  });

  it('descarta una sesión malformada y termina la carga', async () => {
    getItem.mockResolvedValueOnce('{sesion-invalida');

    await act(async () => {
      await useAuthStore.getState().hydrateSession();
    });

    expect(deleteItem).toHaveBeenCalledWith(AUTH_SESSION_STORAGE_KEY);
    expect(useAuthStore.getState()).toMatchObject({
      user: null,
      token: null,
      refreshToken: null,
      role: null,
      isAuthenticated: false,
      isLoading: false,
    });
  });

  it('elimina la sesión guardada al cerrar sesión', async () => {
    await act(async () => {
      await useAuthStore.getState().logout();
    });

    expect(deleteItem).toHaveBeenCalledWith(AUTH_SESSION_STORAGE_KEY);
    expect(useAuthStore.getState()).toMatchObject({
      user: null,
      token: null,
      refreshToken: null,
      role: null,
      isAuthenticated: false,
      isLoading: false,
    });
  });

  it('espera la recuperación antes de redirigir al inicio del rol guardado', async () => {
    const response = mockAuthResponses.mecanico;
    getItem.mockResolvedValueOnce(JSON.stringify(response));

    const router = renderRouterWithProviders(routes, {
      initialUrl: '/',
      initialAuthState: { isLoading: true },
    });
    await router;

    expect(await screen.findByText('Cargando...')).toBeTruthy();

    await act(async () => {
      await useAuthStore.getState().hydrateSession();
    });

    await waitFor(() => expect(router.getPathname()).toBe('/mecanico'));
    expect(screen.getByText('Inicio mecánico')).toBeTruthy();
  });
});
