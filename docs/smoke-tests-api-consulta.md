# S3-S1 — Smoke tests HTTP de endpoints de consulta

## Propósito y seguridad

Este smoke test comprueba conectividad y lectura a través de la API Gateway autorizada. Solo envía solicitudes HTTP GET; no crea, modifica ni elimina datos. No imprime JWT, encabezados de autorización ni cuerpos de respuesta que puedan contener datos personales.

Gateway permitida: https://tallerconect.vercel.app/api.

## Pruebas incluidas

| Prueba | Método | Ruta | Autenticación |
|---|---|---|---|
| Salud Gateway | GET | /health (configurable) | No |
| Vehículos | GET | /vehiculos | Bearer |
| Órdenes | GET | /ordenes | Bearer |
| Presupuestos | GET | /presupuestos | Bearer |

Las tres rutas de consulta están implementadas en los servicios móviles y documentadas en los contratos OpenAPI del repositorio. La ruta /health se usa como valor inicial configurable: debe confirmarse con el equipo backend que esté publicada en la Gateway. Si devuelve 404, se clasifica como HEALTH_ROUTE_NOT_FOUND; eso no demuestra que los endpoints de negocio estén caídos.

## Preparación

Requisitos: Node.js 22 o superior y un JWT temporal de una cuenta autorizada del entorno de integración.

En PowerShell, configura el token en la sesión actual sin escribirlo directamente en un comando:

\`\`\`powershell
$secureToken = Read-Host "JWT de integración" -AsSecureString
$env:SMOKE_API_TOKEN = [System.Net.NetworkCredential]::new("", $secureToken).Password
$env:SMOKE_API_URL = "https://tallerconect.vercel.app/api"
$env:SMOKE_HEALTH_PATH = "/health"
\`\`\`

No guardes el token en .env.example, archivos versionados, tickets ni capturas. Usa solo cuentas de prueba de integración. Al terminar:

\`\`\`powershell
Remove-Item Env:SMOKE_API_TOKEN
Remove-Item Env:SMOKE_API_URL
Remove-Item Env:SMOKE_HEALTH_PATH
\`\`\`

## Ejecución

\`\`\`powershell
npm run smoke:api -- --help
npm run smoke:api -- --dry-run
npm run smoke:api
\`\`\`

Cada solicitud tiene timeout configurable mediante SMOKE_TIMEOUT_MS (10 segundos por defecto). El proceso termina con código 1 si una o más comprobaciones fallan, y con código 2 si la configuración impide iniciar.

## Clasificación

| Clasificación | HTTP / condición | Interpretación |
|---|---|---|
| OK | 2xx | Solicitud atendida |
| AUTH_REQUIRED | 401 | Token ausente, inválido o expirado |
| FORBIDDEN | 403 | Rol autenticado sin permiso |
| NOT_FOUND | 404 en negocio | Ruta o recurso no encontrado |
| HEALTH_ROUTE_NOT_FOUND | 404 en salud | Ruta de salud no publicada o incorrecta |
| REQUEST_INVALID | 400 / 422 | Solicitud/contrato rechazado |
| RATE_LIMITED | 429 | Límite de solicitudes alcanzado |
| UPSTREAM_UNAVAILABLE | 502 / 503 / 504 | Gateway o servicio backend no disponible |
| SERVER_ERROR | Otros 5xx | Error interno |
| TIMEOUT | Timeout | No hubo respuesta dentro del límite |
| NETWORK_ERROR | DNS, TLS o conectividad | No se pudo establecer conexión |
| INVALID_JSON | 2xx con cuerpo no JSON | Respuesta incompatible con JSON |

Un 403 no implica que el endpoint esté caído: puede ser correcto para un rol sin permiso. Para comprobar las tres lecturas, usa una cuenta autorizada con permisos suficientes o ejecuta el test por rol y registra los 403 como restricciones de autorización.

## Alcance y limitaciones

- No se envían cuerpos JSON ni parámetros que cambien datos.
- No se invocan POST, PUT, PATCH ni DELETE.
- Se utiliza un token existente; el script no realiza login ni almacena credenciales.
- Se validan códigos HTTP y que el contenido 2xx sea JSON válido; no se imprimen datos de vehículos, órdenes ni presupuestos.
- La ruta de salud debe confirmarse con backend; el repositorio frontend no acredita que /health exista en Gateway.
- Una ejecución exitosa confirma disponibilidad y lectura para el token/rol probado en ese momento.

## Evidencia para cerrar la tarea

Registrar la salida de npm run smoke:api con el token oculto, fecha/hora, entorno y rol de la cuenta. No adjuntar payloads ni encabezados. Criterio de cierre: ruta de salud confirmada con backend y GET de vehículos, órdenes y presupuestos con respuesta 2xx, o restricciones 403 justificadas por rol y documentadas.
