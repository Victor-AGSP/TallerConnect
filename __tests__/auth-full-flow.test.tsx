import * as SecureStore from 'expo-secure-store';

import {
  cleanup,
  fireEvent,
  renderRouterWithProviders,
  resetStores,
  screen,
  waitFor,
} from '../test-utils';
import RootLayout from '@/app/_layout';
import AdminLayout from '@/app/(admin)/_layout';
import AdminScreen from '@/app/(admin)/administrador';
import AuthLayout from '@/app/(auth)/_layout';
import LoginScreen from '@/app/(auth)/login';
import ClienteLayout from '@/app/(cliente)/_layout';
import ClienteScreen from '@/app/(cliente)/cliente';
import IndexScreen from '@/app/index';
import MecanicoLayout from '@/app/(mecanico)/_layout';
import MecanicoScreen from '@/app/(mecanico)/mecanico';
import { mockAuthResponses } from '@/mocks/auth.mock';
import { authService } from '@/services/auth.service';
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
  '(auth)/_layout': AuthLayout,
  '(auth)/login': LoginScreen,
  '(admin)/_layout': AdminLayout,
  '(admin)/administrador': AdminScreen,
  '(cliente)/_layout': ClienteLayout,
  '(cliente)/cliente': ClienteScreen,
  '(mecanico)/_layout': MecanicoLayout,
  '(mecanico)/mecanico': MecanicoScreen,
};

const roleCases = [
  ['cliente', '/cliente', 'Mi taller'],
  ['mecanico', '/mecanico', 'Mis órdenes'],
  ['administrador', '/administrador', 'Panel del taller'],
] as const;

describe('flujo completo de Login → rol → Logout', () => {
  beforeEach(() => {
    resetStores();
    getItem.mockReset().mockResolvedValue(null);
    setItem.mockReset().mockResolvedValue(undefined);
    deleteItem.mockReset().mockResolvedValue(undefined);
    login.mockReset();
  });

  it.each(roleCases)(
    'autentica al rol %s, abre su panel y cierra la sesión',
    async (role, expectedRoute, expectedHeading) => {
      const response = mockAuthResponses[role];
      login.mockResolvedValueOnce(response);

      const router = renderRouterWithProviders(routes, {
        initialUrl: '/login',
      });
      await router;

      await fireEvent.changeText(
        screen.getByTestId('login-email'),
        response.user.email,
      );
      await fireEvent.changeText(
        screen.getByTestId('login-password'),
        'clave-segura',
      );
      await fireEvent.press(screen.getByTestId('login-submit'));

      await waitFor(() => expect(router.getPathname()).toBe(expectedRoute));
      expect(screen.getByText(expectedHeading)).toBeTruthy();
      expect(useAuthStore.getState()).toMatchObject({
        user: response.user,
        role,
        isAuthenticated: true,
        isLoading: false,
      });
      expect(setItem).toHaveBeenCalledWith(
        AUTH_SESSION_STORAGE_KEY,
        JSON.stringify(response),
      );

      await fireEvent.press(screen.getByText('Cerrar sesión'));

      await waitFor(() => expect(router.getPathname()).toBe('/login'));
      expect(screen.getByTestId('login-submit')).toBeTruthy();
      expect(useAuthStore.getState()).toMatchObject({
        user: null,
        token: null,
        refreshToken: null,
        role: null,
        isAuthenticated: false,
        isLoading: false,
      });
      expect(deleteItem).toHaveBeenCalledWith(AUTH_SESSION_STORAGE_KEY);
    },
  );
});

it.each(roleCases)('permite reintentar una limpieza fallida desde el logout de %s', async (role, route) => {
  resetStores();
  deleteItem.mockReset().mockResolvedValue(undefined);
  deleteItem.mockRejectedValueOnce(new Error('fallo de almacenamiento'));
  const response = mockAuthResponses[role];
  const router = renderRouterWithProviders(routes, {
    initialUrl: route,
    initialAuthState: {
      ...response, role, isAuthenticated: true, isHydrated: true, isLoading: false,
    },
  });
  await router;
  await fireEvent.press(screen.getByText('Cerrar sesión'));
  await waitFor(() => expect(router.getPathname()).toBe('/login'));
  expect(await screen.findByText(/no se pudieron borrar todos los datos/)).toBeTruthy();
  expect(useAuthStore.getState().isAuthenticated).toBe(false);
  await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
  await waitFor(() => expect(useAuthStore.getState().sessionIssue).toBeNull());
  expect(screen.queryByText(/no se pudieron borrar todos los datos/)).toBeNull();
  expect(deleteItem).toHaveBeenCalledTimes(6);
});

it.each(roleCases)('recupera %s al arrancar y no recupera la sesión después de Logout y reinicio', async (role, route) => {
  resetStores();
  const disk = new Map([[AUTH_SESSION_STORAGE_KEY, JSON.stringify(mockAuthResponses[role])]]);
  getItem.mockReset().mockImplementation(async (key) => disk.get(key) ?? null);
  setItem.mockReset().mockImplementation(async (key, value) => { disk.set(key, value); });
  deleteItem.mockReset().mockImplementation(async (key) => { disk.delete(key); });
  const appRoutes = { ...routes, _layout: RootLayout };
  const router = renderRouterWithProviders(appRoutes, {
    initialUrl: '/', initialAuthState: { isLoading: true, isHydrated: false },
  });
  await router;
  await waitFor(() => expect(router.getPathname()).toBe(route));
  expect(useAuthStore.getState().role).toBe(role);
  await fireEvent.press(screen.getByText('Cerrar sesión'));
  await waitFor(() => expect(router.getPathname()).toBe('/login'));
  await waitFor(() => expect(disk.size).toBe(0));
  await cleanup();
  resetStores();
  const restarted = renderRouterWithProviders(appRoutes, {
    initialUrl: '/', initialAuthState: { isLoading: true, isHydrated: false },
  });
  await restarted;
  await waitFor(() => expect(restarted.getPathname()).toBe('/login'));
  expect(useAuthStore.getState()).toMatchObject({ isAuthenticated: false, token: null, role: null });
});
