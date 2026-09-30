import React from 'react';

import {
  fireEvent,
  render,
  waitFor,
} from '@testing-library/react-native';

import LoginScreen from '@/app/(auth)/login';

const mockReplace = jest.fn();
const mockLogin = jest.fn();
const mockUseAuthStore = jest.fn();

const mockAuthState = {
  login: mockLogin,
  isLoading: false,
  sessionIssue: null,
  hydrateSession: jest.fn(),
  logout: jest.fn(),
};

jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

jest.mock('@/stores/authStore', () => ({
  useAuthStore: (selector: unknown) =>
    mockUseAuthStore(selector),
}));

jest.mock('@/utils/storage', () => ({
  StorageError: class StorageError extends Error {},
}));

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockAuthState.isLoading = false;

    mockUseAuthStore.mockImplementation(
      (selector: (state: typeof mockAuthState) => unknown) =>
        selector(mockAuthState),
    );
  });

  it('muestra un error cuando las credenciales son inválidas', async () => {
    mockLogin.mockRejectedValueOnce(
      new Error('Credenciales inválidas'),
    );

    const view = await render(<LoginScreen />);

    await fireEvent.changeText(
      view.getByTestId('login-email'),
      'cliente@pruebas.cl',
    );

    await fireEvent.changeText(
      view.getByTestId('login-password'),
      'contraseña-incorrecta',
    );

    await fireEvent.press(
      view.getByTestId('login-submit'),
    );

    expect(
      await view.findByText('Credenciales inválidas'),
    ).toBeTruthy();

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('muestra el estado de carga mientras inicia sesión', async () => {
    let resolveLogin: (() => void) | undefined;

    const pendingLogin = new Promise<void>((resolve) => {
      resolveLogin = resolve;
    });

    mockLogin.mockImplementationOnce(async () => {
      mockAuthState.isLoading = true;

      await pendingLogin;

      mockAuthState.isLoading = false;
    });

    const view = await render(<LoginScreen />);

    await fireEvent.changeText(
      view.getByTestId('login-email'),
      'cliente@pruebas.cl',
    );

    await fireEvent.changeText(
      view.getByTestId('login-password'),
      'ClientePrueba123!',
    );

    await fireEvent.press(
      view.getByTestId('login-submit'),
    );

    await waitFor(async () => {
      await view.rerender(<LoginScreen />);

      const button = view.getByTestId('login-submit');

      expect(button.props.accessibilityState).toEqual(
        expect.objectContaining({
          disabled: true,
          busy: true,
        }),
      );
    });

    expect(mockLogin).toHaveBeenCalledWith({
      email: 'cliente@pruebas.cl',
      password: 'ClientePrueba123!',
    });

    resolveLogin?.();

    await waitFor(async () => {
      await view.rerender(<LoginScreen />);

      expect(
        view.getByTestId('login-submit').props.accessibilityState,
      ).toEqual(
        expect.objectContaining({
          disabled: false,
          busy: false,
        }),
      );
    });
  });

  it('muestra un error cuando no existe conexión con el servidor', async () => {
    mockLogin.mockRejectedValueOnce(
      new Error(
        'No fue posible conectarse con el servidor.',
      ),
    );

    const view = await render(<LoginScreen />);

    await fireEvent.changeText(
      view.getByTestId('login-email'),
      'cliente@pruebas.cl',
    );

    await fireEvent.changeText(
      view.getByTestId('login-password'),
      'ClientePrueba123!',
    );

    await fireEvent.press(
      view.getByTestId('login-submit'),
    );

    expect(
      await view.findByText(
        'No fue posible conectarse con el servidor.',
      ),
    ).toBeTruthy();
  });

  it('permite mostrar y ocultar la contraseña', async () => {
    const view = await render(<LoginScreen />);

    const passwordInput =
      view.getByTestId('login-password');

    const toggle =
      view.getByTestId('login-password-toggle');

    expect(
      passwordInput.props.secureTextEntry,
    ).toBe(true);

    await fireEvent.press(toggle);

    expect(
      view.getByTestId('login-password')
        .props.secureTextEntry,
    ).toBe(false);

    await fireEvent.press(toggle);

    expect(
      view.getByTestId('login-password')
        .props.secureTextEntry,
    ).toBe(true);
  });
});