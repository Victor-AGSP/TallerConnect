# S3-AMP-S1-JAVIER-03 y S3-AMP-S1-JAVIER-04

## Vencimiento de sesión

- Una respuesta HTTP 401 en una ruta protegida invalida la sesión; los 401 del endpoint de login no provocan logout.
- HTTP 403 conserva la sesión porque representa falta de permisos, no vencimiento de credenciales.
- Al expirar, se elimina la sesión persistida (sesión, token y datos de usuario), se limpia el estado autenticado y la navegación protegida devuelve a `/login`.
- La pantalla de login informa que la sesión expiró y permite autenticarse nuevamente.
- Los mensajes y registros no incluyen JWT ni credenciales.

Prueba focalizada:

```powershell
npm test -- --runInBand __tests__/auth-session.test.tsx __tests__/services-session-navigation.test.tsx src/__tests__/interceptors.test.ts
```

## Build de integración

La verificación realiza una exportación Android real con un entorno aislado:

- `EXPO_PUBLIC_APP_ENV=integration`
- `EXPO_PUBLIC_API_URL=https://tallerconect.vercel.app/api`
- mocks desactivados
- se eliminan del entorno hijo las demás variables `EXPO_PUBLIC_*` para evitar heredar overrides locales.

Después inspecciona los bundles y manifiestos exportados sin imprimir sus contenidos ni variables. Falla si encuentra `localhost`, `10.0.2.2` o `127.0.0.1`, y exige que esté presente la URL oficial de Gateway.

```powershell
npm run verify:integration-build
```

La exportación temporal se elimina al finalizar. El comando no muestra tokens ni valores de otras variables.
