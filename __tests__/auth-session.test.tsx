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
