# S3-S1 — Verificación de API Gateway y seguridad de URLs

## Objetivo

Verificar que el cliente móvil de integración de TallerConnect envíe las solicitudes de API exclusivamente a la API Gateway, sin conectarse directamente a microservicios ni a bases de datos.

**Entorno autorizado de integración:** `https://tallerconect.vercel.app/api`.

El equipo móvil mantiene únicamente el frontend. La configuración y los servicios backend permanecen bajo responsabilidad del equipo backend.

## Configuración verificada

La URL base se resuelve en `src/config/env.ts` y se consume desde `src/services/api/client.ts`:

- Integración: `https://tallerconect.vercel.app/api`.
- Producción: la constante actualmente apunta al mismo origen publicado; no se inventa una URL de producción distinta.
- Desarrollo local: `http://localhost:8000/api`.
- Emulador Android local: `http://10.0.2.2:8000/api`.

En integración y producción la validación exige HTTPS, el origen oficial configurado y la ruta exacta `/api`. La variable explícita `EXPO_PUBLIC_API_URL` no puede saltarse esas reglas. El cliente HTTP rechaza URLs absolutas para impedir que una solicitud evite la Gateway.

## Variables públicas EXPO_PUBLIC

Expo incorpora estas variables al bundle del cliente. Sus valores son visibles para quien instala o inspecciona la aplicación: no son un almacén de secretos.

| Variable | Uso | Valor de referencia |
|---|---|---|
| `EXPO_PUBLIC_APP_ENV` | Entorno de ejecución | `development`, `integration` o `production` |
| `EXPO_PUBLIC_API_URL` | URL base única de API Gateway | `https://tallerconect.vercel.app/api` en integración |
| `EXPO_PUBLIC_USE_MOCK_AUTH` | Login demo/adaptadores simulados donde corresponda | `false` para integración real |
| `EXPO_PUBLIC_USE_MOCK_SERVICES` | Bandera global de compatibilidad expuesta en ENV | `false` |
| `EXPO_PUBLIC_API_TIMEOUT_MS` | Timeout REST estándar | `15000` |
| `EXPO_PUBLIC_UPLOAD_TIMEOUT_MS` | Timeout de subida multimedia | `60000` |
| `EXPO_PUBLIC_ENABLE_NOTIFICATIONS_API` | Habilita el contrato HTTP de notificaciones | `false` salvo habilitación del backend |
| `EXPO_PUBLIC_EVIDENCE_MAX_BYTES` | Límite local de selección de evidencias | `10485760` (10 MiB por defecto) |

La plantilla versionada es `.env.example`. El archivo local `.env` y sus variantes están excluidos mediante `.gitignore`. No deben agregarse contraseñas, JWT, API keys, claves privadas ni variables como `DATABASE_URL` a archivos `EXPO_PUBLIC_`.

## Arquitectura de solicitudes

- `src/services/api/client.ts` crea la instancia Axios central y usa `ENV.API_URL` como `baseURL`.
- Los servicios de autenticación, vehículos, órdenes, bitácora, presupuestos, repuestos, proveedores, evidencias, notificaciones y panel administrador usan `apiClient`.
- Los servicios entregan rutas relativas, por ejemplo `/auth/login`, `/auth/me`, `/vehiculos`, `/ordenes` y `/evidencias`.
- El interceptor normaliza el prefijo `/api` y agrega el JWT en las solicitudes protegidas.
- No se deben configurar URLs de microservicios (/ms1, /ms2, /ms3, /ms4) ni conexiones a bases de datos en el cliente móvil.

### Excepción: almacenamiento de evidencias

La descarga de fotografías puede utilizar una URL prefirmada de almacenamiento devuelta por el endpoint de Gateway `GET /evidencias/{id}/descarga`. Esa URL permite acceder al objeto durante un tiempo limitado; no es una API de microservicio ni una conexión a la base de datos. En el adaptador real, la app solicita primero la URL a través de `apiClient`. La URL fija que aparece en el adaptador mock es exclusivamente un dato simulado.

## Pruebas automáticas

Las suites `__tests__/env-config.test.ts` y `__tests__/microservices-audit.test.ts` verifican:

1. La URL base termina exactamente en `/api` y el cliente comparte `ENV.API_URL`.
2. Integración/producción rechazan HTTP, orígenes ajenos y rutas de microservicios.
3. `apiClient` rechaza URLs absolutas.
4. El código de `src/` no contiene endpoints absolutos de microservicios, puertos internos no autorizados ni cadenas de conexión a bases de datos.
5. La creación de clientes HTTP está centralizada y no se utiliza `fetch` directo en el código fuente.
6. `.env.example` documenta las variables públicas y `.gitignore` excluye el archivo local `.env`.

Ejecutar desde la raíz del repositorio:

```powershell
npx.cmd jest --runInBand __tests__/env-config.test.ts __tests__/microservices-audit.test.ts
npx.cmd tsc --noEmit
```

## Comprobación manual en integración (solo lectura)

Configurar el archivo local `.env` con:

```dotenv
EXPO_PUBLIC_APP_ENV=integration
EXPO_PUBLIC_API_URL=https://tallerconect.vercel.app/api
EXPO_PUBLIC_USE_MOCK_AUTH=false
EXPO_PUBLIC_USE_MOCK_SERVICES=false
```

Iniciar con `npx.cmd expo start -c` y, usando cuentas autorizadas de prueba, revisar en el inspector de red las solicitudes del flujo de login y consulta:

- `POST https://tallerconect.vercel.app/api/auth/login`
- `GET https://tallerconect.vercel.app/api/auth/me`
- Consultas de lectura de los módulos habilitados, por ejemplo `/vehiculos`, `/ordenes`, `/presupuestos`, `/repuestos` o `/proveedores`.

Todas deben usar el mismo origen de Gateway y el prefijo `/api`. No deben aparecer llamadas de la app a `/ms1`, `/ms2`, `/ms3`, `/ms4`, hosts internos, puertos de microservicios ni URLs de bases de datos. No ejecutar operaciones POST/PATCH/PUT/DELETE de negocio durante esta comprobación.

Registrar fecha, rol probado y rutas de lectura observadas sin copiar credenciales ni encabezados Authorization. La suite automatizada demuestra la arquitectura estática; la comprobación de red en el dispositivo confirma el despliegue y el flujo real.

## Resultado y alcance

La configuración de integración queda limitada al origen Gateway autorizado y a `/api`; las rutas de dominio se mantienen relativas y el cliente no admite URLs absolutas. La inspección estática cubre el código fuente móvil. La verificación manual de red debe completarse en el dispositivo con las cuentas autorizadas antes de marcar como comprobado el flujo desplegado.
