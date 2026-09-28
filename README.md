# TallerConnect

Aplicación móvil para la gestión de servicios técnicos vehiculares, desarrollada con Expo, React Native y TypeScript.

## Requisitos

- Node.js `20.19.4` o superior dentro de las versiones compatibles con Expo (`20`, `22`, `24` o `25+`). La versión recomendada del proyecto es Node `24` (`.nvmrc`).
- npm, incluido con Node.js.

Con nvm, instala y activa la versión del proyecto desde la raíz:

```bash
nvm install
nvm use
node --version
```

## Instalación y ejecución

```bash
npm ci
npm start
```

Para abrir la aplicación en web o Android:

```bash
npm run web
npm run android
```

La autenticación de demostración está habilitada de forma predeterminada. Usa una de estas cuentas con contraseña `123456`:

| Rol | Correo |
| --- | --- |
| Cliente | `cliente@demo.local` |
| Mecánico | `mecanico@demo.local` |
| Administrador | `admin@demo.local` |

Para consumir la API Gateway, define `EXPO_PUBLIC_USE_MOCK_AUTH=false` y `EXPO_PUBLIC_API_URL` en un archivo `.env` local. Para un dispositivo físico, usa una dirección IP accesible desde el teléfono en lugar de `localhost`.

## Verificaciones

```bash
npm run test:regression
npm test
npm run typecheck
npm run export:android
```

`npm test` ejecuta Jest secuencialmente para mantener estable el uso de recursos en local. `npm run test:ci` es el alias utilizado por GitHub Actions y llama al mismo comando. GitHub Actions ejecuta estas verificaciones para cambios en `Victor` y `Develop` y en pull requests hacia esas ramas.
