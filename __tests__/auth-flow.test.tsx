import { act } from '@testing-library/react-native';
import { Text } from 'react-native';

import {
  fireEvent,
  renderRouterWithProviders,
  resetStores,
  screen,
  waitFor,
} from '../test-utils';
import { mockAuthResponses } from '@/mocks/auth.mock';
import { authService } from '@/services/auth.service';
import IndexScreen from '@/app/index';
import LoginScreen from '@/app/(auth)/login';

jest.mock('@/services/auth.service', () => ({
  authService: { login: jest.fn() },
}));

const routes = {
  index: IndexScreen,
  '(auth)/login': LoginScreen,
  cliente: () => <Text>Inicio cliente</Text>,
  mecanico: () => <Text>Inicio mecánico</Text>,
  administrador: () => <Text>Inicio administrador</Text>,
};

const login = jest.mocked(authService.login);

async function enterCredentials() {
  await fireEvent.changeText(
    screen.getByTestId('login-email'),
    'cliente@tallerconnect.cl',
  );
  await fireEvent.changeText(
    screen.getByTestId('login-password'),
    'clave-segura',
  );
}

describe('flujo de autenticación', () => {
  beforeEach(() => {
    resetStores();
    login.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('valida, muestra errores y completa el login con redirección por rol', async () => {
    const router = renderRouterWithProviders(routes, { initialUrl: '/login' });
    await router;

    await fireEvent.press(screen.getByTestId('login-submit'));

    expect(await screen.findByText('El correo no puede estar vacío')).toBeTruthy();
    expect(
      screen.getByText('La contraseña debe tener al menos 6 caracteres'),
    ).toBeTruthy();
    expect(login).not.toHaveBeenCalled();
    expect(router.getPathname()).toBe('/login');

    login.mockRejectedValueOnce(new Error('Credenciales inválidas'));
    await enterCredentials();
    await fireEvent.press(screen.getByTestId('login-submit'));

    expect(
      await screen.findByText(
        'No se pudo iniciar sesión. Verifica tus credenciales e inténtalo nuevamente.',
      ),
    ).toBeTruthy();
    expect(router.getPathname()).toBe('/login');

    let resolveLogin!: (response: typeof mockAuthResponses.cliente) => void;
    login.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveLogin = resolve;
        }),
    );

    await fireEvent.press(screen.getByTestId('login-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('login-submit').props.accessibilityState).toEqual({
        disabled: true,
        busy: true,
      });
    });
    expect(login).toHaveBeenLastCalledWith({
      email: 'cliente@tallerconnect.cl',
      password: 'clave-segura',
    });

    await act(async () => {
      resolveLogin(mockAuthResponses.cliente);
    });

    await waitFor(() => expect(router.getPathname()).toBe('/cliente'));
    expect(screen.getByText('Inicio cliente')).toBeTruthy();
  });
});
