# Mocks y patrones de pruebas

TallerConnect usa Jest con `jest-expo`, React Native Testing Library (RNTL), Expo Router y un store global de autenticación basado en Zustand. Las pruebas van en `__tests__/` o junto al código con sufijo `.test.ts(x)`; `src/app` se reserva para rutas y layouts.

## Componentes React Native

Prueba lo que ve y hace el usuario: consulta por rol, etiqueta o texto accesible, dispara eventos y comprueba el estado visible. Usa `renderWithProviders` para incluir los providers compartidos y, cuando corresponda, `initialAuthState` para preparar la sesión.

```tsx
import { fireEvent, renderWithProviders } from '../test-utils';
import { Button } from '@/components/common';

it('permite iniciar una acción', () => {
  const onPress = jest.fn();
  const { getByRole } = renderWithProviders(
    <Button title="Guardar" onPress={onPress} />,
  );

  fireEvent.press(getByRole('button', { name: 'Guardar' }));

  expect(onPress).toHaveBeenCalledTimes(1);
});
```

Para componentes reutilizables, cubre estados observables como `disabled`, `loading`, errores, ayuda y reintentos. Evita depender de detalles de estilos internos salvo que el estilo sea parte del requisito.

## Expo Router

`renderRouterWithProviders` usa `expo-router/testing-library`, que crea un árbol de rutas en memoria. Para una prueba enfocada, pasa un mapa de rutas pequeño; usa `initialUrl` para elegir la ruta de entrada y `screen.toHavePathname` para comprobar navegación. Así se prueba el comportamiento real de Router sin reemplazar `useRouter` por un mock.

```tsx
import { Link } from 'expo-router';
import { Text, View } from 'react-native';
import {
  fireEvent,
  renderRouterWithProviders,
  screen,
} from '../test-utils';

it('navega a la ruta solicitada', () => {
  renderRouterWithProviders({
    index: () => <Link href="/perfil">Abrir perfil</Link>,
    perfil: () => <Text>Perfil</Text>,
  });

  fireEvent.press(screen.getByText('Abrir perfil'));

  expect(screen).toHavePathname('/perfil');
});
```

Usa los fixtures inline para flujos pequeños y rutas reales de `src/app` cuando la prueba necesite validar la integración entre layouts y pantallas. No pongas fixtures de ruta dentro de `src/app` si no son rutas de producción.

## Zustand

El store de autenticación actual se crea con `create`, por lo que no requiere un provider React. Inicializa el estado por medio de `initialAuthState` y llama `resetStores()` entre pruebas. Para otro store, `resetStore(store)` usa `getInitialState()` y reemplaza el estado completo, incluidas sus acciones.

```tsx
import { resetStores, renderWithProviders } from '../test-utils';
import { useAuthStore } from '@/stores/authStore';

beforeEach(() => resetStores());

it('parte desde el estado de sesión definido para el caso', () => {
  renderWithProviders(<Profile />, {
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

## Referencias

- [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/)
- [Pruebas de integración con Expo Router](https://docs.expo.dev/router/reference/testing/)
- [Pruebas de Zustand](https://zustand.docs.pmnd.rs/learn/guides/testing)
