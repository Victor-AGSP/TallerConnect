# S3 — Verificación de Gateway, MS2 y rechazo de token inválido

## Alcance

El script `npm run smoke:api` ejecuta exclusivamente solicitudes HTTP `GET`. No crea, modifica ni elimina registros. No necesita credenciales reales: para la ruta protegida envía un token ficticio deliberadamente inválido. Nunca imprime el token ni el cuerpo de las respuestas.

Gateway predeterminada: `https://api-tallerconnect.inf.uct.cl/api`.

## Comprobaciones

| Prueba | Método | Ruta | Resultado esperado |
|---|---|---|---|
| Salud Gateway | GET | `/health` | HTTP 2xx |
| Salud global de servicios | GET | `/health/servicios` | HTTP 2xx |
| Salud MS2 Taller | GET | `/health/servicios/ms2_taller` | HTTP 2xx |
| Rechazo de token inválido | GET | `/ordenes` | HTTP 401 o 403 |

La comprobación de autorización se considera fallida si una ruta protegida responde 2xx al token inválido. El script descarta el cuerpo de respuesta incluso en ese caso, para no mostrar datos.

## Ejecución en PowerShell

Desde la carpeta raíz del proyecto:

```powershell
npm run smoke:api -- --help
npm run smoke:api -- --dry-run
npm run smoke:api
```

No configures `SMOKE_API_TOKEN`: no se utiliza ningún JWT real. Si el Gateway cambia, configura `SMOKE_API_URL` con una URL HTTPS que termine en `/api`. El timeout por solicitud se controla con `SMOKE_TIMEOUT_MS` (10 segundos por defecto).

## Evidencia

Cada ejecución real imprime fecha y hora ISO-8601, ruta, código HTTP, clasificación y duración. La salida de la ejecución debe adjuntarse como evidencia de la tarea; este documento no inventa códigos HTTP ni declara saludable un servicio sin haberlo consultado.

## Criterios de aceptación

- Las tres rutas de salud responden HTTP 2xx.
- La ruta protegida rechaza el token inválido con HTTP 401 o 403.
- Nunca se imprime ni registra un JWT real, un encabezado de autorización o el contenido de respuestas protegidas.
- Las solicitudes son GET y no se repiten automáticamente.

## Timeout, reintentos y mocks (S3-S2)

- El cliente móvil solo reintenta `GET`, `HEAD` y `OPTIONS` ante errores transitorios; no reintenta `POST`, `PUT`, `PATCH` ni `DELETE`.
- Las solicitudes canceladas por el usuario no se reintentan.
- Los adaptadores de dominio usan exclusivamente `EXPO_PUBLIC_USE_MOCK_SERVICES=true` y solo en `development`/`test`.
- `EXPO_PUBLIC_USE_MOCK_AUTH` controla únicamente el login demo; no activa mocks de órdenes, vehículos, presupuestos, repuestos, proveedores, evidencias o notificaciones.
- En `integration` y `production`, `ENV.USE_MOCK_SERVICES` permanece desactivado.
