# Mocks y patrones de pruebas

TallerConnect usa Jest con `jest-expo`, React Native Testing Library (RNTL), Expo Router y un store global de autenticación basado en Zustand. Las pruebas van en `__tests__/` o junto al código con sufijo `.test.ts(x)`; `src/app` se reserva para rutas y layouts.

## Componentes React Native

Prueba lo que ve y hace el usuario: consulta por rol, etiqueta o texto accesible, dispara eventos y comprueba el estado visible. Usa `renderWithProviders` para incluir los providers compartidos y, cuando corresponda, `initialAuthState` para preparar la sesión.

```tsx
import { fireEvent, renderWithProviders } from '../test-utils';
import { Button } from '@/components/common';

it('permite iniciar una acción', async () => {
  const onPress = jest.fn();
  const { getByRole } = await renderWithProviders(
    <Button title="Guardar" onPress={onPress} />,
  );

  await fireEvent.press(getByRole('button', { name: 'Guardar' }));

  expect(onPress).toHaveBeenCalledTimes(1);
});
```

Para componentes reutilizables, cubre estados observables como `disabled`, `loading`, errores, ayuda y reintentos. Evita depender de detalles de estilos internos salvo que el estilo sea parte del requisito.

## Expo Router

`renderRouterWithProviders` usa `expo-router/testing-library`, que crea un árbol de rutas en memoria. Para una prueba enfocada, pasa un mapa de rutas pequeño; usa `initialUrl` para elegir la ruta de entrada y `router.getPathname()` para comprobar navegación. Así se prueba el comportamiento real de Router sin reemplazar `useRouter` por un mock.

```tsx
import { Link } from 'expo-router';
import { Text } from 'react-native';
import {
  fireEvent,
  renderRouterWithProviders,
  screen,
  waitFor,
} from '../test-utils';

it('navega a la ruta solicitada', async () => {
  const router = renderRouterWithProviders({
    index: () => <Link href="./perfil">Abrir perfil</Link>,
    perfil: () => <Text>Perfil</Text>,
  });

  await router;
  await fireEvent.press(screen.getByText('Abrir perfil'));

  await waitFor(() => expect(router.getPathname()).toBe('/perfil'));
});
```

Usa los fixtures inline para flujos pequeños y rutas reales de `src/app` cuando la prueba necesite validar la integración entre layouts y pantallas. No pongas fixtures de ruta dentro de `src/app` si no son rutas de producción.

## Zustand

El store de autenticación actual se crea con `create`, por lo que no requiere un provider React. Inicializa el estado por medio de `initialAuthState` y llama `resetStores()` entre pruebas. Para otro store, `resetStore(store)` usa `getInitialState()` y reemplaza el estado completo, incluidas sus acciones.

```tsx
import { Text } from 'react-native';
import { resetStores, renderWithProviders } from '../test-utils';
import { useAuthStore } from '@/stores/authStore';

beforeEach(() => resetStores());

function Profile() {
  const role = useAuthStore((state) => state.role);
  return <Text>{role}</Text>;
}

it('parte desde el estado de sesión definido para el caso', async () => {
  await renderWithProviders(<Profile />, {
    initialAuthState: {
      isAuthenticated: true,
      role: 'mecanico',
    },
  });

  expect(useAuthStore.getState().role).toBe('mecanico');
});
```

Evita mockear `zustand` o el hook del store para pruebas de componentes: se perdería la suscripción que hace que la UI reaccione a cambios. Cambia el estado mediante las acciones del store o usa `initialAuthState` al renderizar.

## Mocks de servicios y módulos nativos

Mantén los mocks en los límites externos. En pruebas del login, mockea `AuthService` para resolver o rechazar la petición; deja reales la pantalla, el store y Router. En pruebas de persistencia, mockea las funciones async de `expo-secure-store` y verifica las operaciones y el estado recuperado. No hagas solicitudes reales al backend desde Jest.

```tsx
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));
```

## Compatibilidad comprobada

Con RNTL 14, `render`, `renderRouter` y `fireEvent` son asíncronos: espera su finalización. Conserva primero el objeto de `renderRouterWithProviders` y luego haz `await router`; los helpers como `getPathname` pertenecen a ese objeto, no a `screen` ni al valor que resuelve la promesa. El helper upstream `testRouter` no se reexporta porque la versión instalada consulta esos helpers en `screen`.

Los ejemplos de botón, navegación, provider personalizado y reinicio de Zustand se ejecutan en `__tests__/test-utils.test.tsx`.

## Referencias

- [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/)
- [Pruebas de integración con Expo Router](https://docs.expo.dev/router/reference/testing/)
- [Pruebas de Zustand](https://zustand.docs.pmnd.rs/learn/guides/testing)
