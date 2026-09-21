# Utilidades de pruebas

- Usa `renderWithProviders` para componentes React Native.
- Usa `renderRouterWithProviders` para rutas de Expo Router. Por defecto carga `src/app`; permite definir `initialUrl`.
- Pasa `initialAuthState` para preparar el store de autenticación en un caso de prueba.
- Usa `resetStores` entre pruebas para volver al estado inicial del store de autenticación, y `resetStore(store)` para otros stores de Zustand.
- Pasa un `wrapper` opcional si la prueba necesita otro provider.

El helper de Router usa `expo-router/testing-library`, que crea una app de Router en memoria. Zustand usa un store global en esta app, por lo que se inicializa mediante `initialAuthState` y se limpia con los helpers de reset; no requiere un provider React propio.
