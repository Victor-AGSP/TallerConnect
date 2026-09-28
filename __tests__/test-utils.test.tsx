import { createContext, useContext, type PropsWithChildren } from 'react';
import { Link } from 'expo-router';
import { Text } from 'react-native';
import { createStore } from 'zustand/vanilla';
import { Button } from '@/components/common';
import { useAuthStore } from '@/stores/authStore';
import {
  act, fireEvent, renderRouterWithProviders, renderWithProviders,
  resetStore, resetStores, screen, waitFor,
} from '../test-utils';

beforeEach(() => resetStores());

it('ejecuta el ejemplo documentado de eventos asíncronos', async () => {
  const onPress = jest.fn();
  const { getByRole } = await renderWithProviders(<Button title="Guardar" onPress={onPress} />);
  await fireEvent.press(getByRole('button', { name: 'Guardar' }));
  expect(onPress).toHaveBeenCalledTimes(1);
});

it('navega con Router real y consulta la ruta desde el resultado del render', async () => {
  const router = renderRouterWithProviders({
    index: () => <Link href="./perfil">Abrir perfil</Link>,
    perfil: () => <Text>Perfil</Text>,
  });
  await router;
  await fireEvent.press(screen.getByText('Abrir perfil'));
  await waitFor(() => expect(router.getPathname()).toBe('/perfil'));
  expect(screen.getByText('Perfil')).toBeTruthy();
});

it('compone providers personalizados y conserva la suscripción a Zustand', async () => {
  const Context = createContext('sin provider');
  function Wrapper({ children }: PropsWithChildren) {
    return <Context.Provider value="contexto">{children}</Context.Provider>;
  }
  function Profile() {
    const role = useAuthStore((state) => state.role);
    return <Text>{useContext(Context)}: {role ?? 'sin sesión'}</Text>;
  }
  await renderWithProviders(<Profile />, {
    wrapper: Wrapper,
    initialAuthState: { role: 'mecanico' },
  });
  expect(screen.getByText('contexto: mecanico')).toBeTruthy();
  await act(async () => useAuthStore.setState({ role: 'cliente' }));
  expect(screen.getByText('contexto: cliente')).toBeTruthy();
  await act(async () => resetStores());
  expect(screen.getByText('contexto: sin sesión')).toBeTruthy();
});

it('restablece valores y acciones de un store sin conservar mocks', () => {
  const store = createStore<{ count: number; action: () => string }>(() => ({ count: 0, action: () => 'original' }));
  store.setState({ count: 4, action: jest.fn(() => 'mock') });
  resetStore(store);
  expect(store.getState().count).toBe(0);
  expect(store.getState().action()).toBe('original');
});
