# Catálogo de endpoints y códigos de respuesta de la API Gateway

Este catálogo reúne los endpoints de la API Gateway que consume la app móvil, agrupados por módulo y método HTTP, y los contrasta con los contratos OpenAPI de cada microservicio (`/ms1/openapi.json` a `/ms4/openapi.json`). Las rutas se obtuvieron de las llamadas a `apiClient` en `src/services/`; todas se resuelven sobre la base `https://tallerconect.vercel.app/api`.

- **Códigos del contrato**: respuestas que declara el OpenAPI para esa operación.
- **Observado**: códigos obtenidos con las cuentas de prueba de los tres roles, mediante consultas `GET` y el inicio de sesión (`POST /auth/login`), sin operaciones que modifiquen datos. Un guion indica que la ruta no se consultó. Que un código no aparezca en esta columna no significa que la operación no pueda devolverlo.

## Autenticación y notificaciones (MS1)

| Método | Ruta | Servicio | Códigos del contrato | Observado |
|---|---|---|---|---|
| `POST` | `/auth/login` | `auth.service.ts` | 200, 401, 403, 422, 429 | 200 (tres roles) |
| `GET` | `/auth/me` | `auth.service.ts` | 200 | 200 (tres roles) |
| `GET` | `/auth/usuarios` | `admin-dashboard.service.ts` | 200, 401, 403, 500 | — |
| `GET` | `/notificaciones` | `notifications.service.ts` | 200, 422 | — |
| `PATCH` | `/notificaciones/{id}/leida` | `notifications.service.ts` | No existe en el contrato | — |
| `POST` | `/notificaciones/leer-todas` | `notifications.service.ts` | No existe en el contrato | — |

## Vehículos (MS2)

| Método | Ruta | Servicio | Códigos del contrato | Observado |
|---|---|---|---|---|
| `GET` | `/vehiculos` | `vehicles.service.ts`, `admin-dashboard.service.ts` | 200, 401, 403, 404, 500 | 200 (cliente, administrador); 403 (mecánico) |
| `GET` | `/vehiculos/asignados` | `vehicles.service.ts` | 200, 401, 403, 500 | 200 (mecánico); 403 (cliente, administrador) |
| `GET` | `/vehiculos/{vehiculo_id}` | `vehicles.service.ts` | 200, 401, 404, 422, 500 | — |
| `POST` | `/vehiculos` | `vehicles.service.ts` | 201, 401, 403, 404, 409, 422, 500 | — |
| `PATCH` | `/vehiculos/{vehiculo_id}` | `vehicles.service.ts` | 200, 401, 403, 404, 422, 500 | — |

## Órdenes (MS2)

| Método | Ruta | Servicio | Códigos del contrato | Observado |
|---|---|---|---|---|
| `GET` | `/ordenes` | `orders.service.ts`, `admin-dashboard.service.ts` | 200, 401, 500 | 200 (tres roles) |
| `GET` | `/ordenes/{orden_id}` | `orders.service.ts` | 200, 401, 404, 422, 500 | — |
| `POST` | `/ordenes` | `orders.service.ts` | 201, 401, 403, 404, 409, 422, 500 | — |
| `PATCH` | `/ordenes/{orden_id}/estado` | `orders.service.ts` | 200, 401, 403, 404, 409, 422, 500 | — |
| `PUT` | `/ordenes/{orden_id}/mecanico` | `orders.service.ts` | 200, 401, 403, 404, 409, 422, 500, 503 | — |
| `GET` | `/ordenes/{orden_id}/historial` | `orders.service.ts` | 200, 401, 404, 422, 500 | — |
| `GET` | `/ordenes/{orden_id}/bitacora` | `order-log.service.ts` | 200, 401, 404, 422, 500 | — |
| `POST` | `/ordenes/{orden_id}/bitacora` | `order-log.service.ts` | 201, 401, 403, 404, 422, 500 | — |
| `GET` | `/ordenes/cancelaciones/pendientes` | `notifications.service.ts`, `admin-dashboard.service.ts` | 200, 401, 403 | — |
| `GET` | `/ordenes/configuracion/capacidad/mecanicos` | `notifications.service.ts`, `admin-dashboard.service.ts` | 200 | — |
| `GET` | `/ordenes/configuracion/capacidad/ingresos-diarios` | `notifications.service.ts`, `admin-dashboard.service.ts` | 200 | — |

## Presupuestos (MS3)

| Método | Ruta | Servicio | Códigos del contrato | Observado |
|---|---|---|---|---|
| `GET` | `/presupuestos` | `budgets.service.ts`, `admin-dashboard.service.ts` | 200, 401, 403, 422, 503 | — |
| `GET` | `/presupuestos/{presupuesto_id}` | `budgets.service.ts` | 200, 401, 404, 422, 503 | — |
| `GET` | `/presupuestos/{presupuesto_id}/versiones/{numero}` | `budgets.service.ts` | 200, 401, 404, 422, 503 | — |
| `POST` | `/presupuestos` | `budgets.service.ts` | 201, 401, 403, 404, 409, 422, 503 | — |
| `POST` | `/presupuestos/{presupuesto_id}/versiones` | `budgets.service.ts` | 201, 401, 403, 404, 409, 422 | — |
| `PUT` | `/presupuestos/{presupuesto_id}/versiones/{numero}/items` | `budgets.service.ts` | 200, 401, 403, 404, 409, 422 | — |
| `POST` | `/presupuestos/{presupuesto_id}/versiones/{numero}/envio` | `budgets.service.ts` | 200, 401, 403, 404, 409, 422, 503 | — |
| `POST` | `/presupuestos/{presupuesto_id}/versiones/{numero}/decision` | `budgets.service.ts` | 201, 401, 403, 404, 409, 422, 503 | — |
| `POST` | `/presupuestos/decisiones/{decision_id}/aplicacion` | `budgets.service.ts` | 200, 401, 403, 404, 409, 422, 503 | — |

## Repuestos, proveedores e inventario (MS3)

| Método | Ruta | Servicio | Códigos del contrato | Observado |
|---|---|---|---|---|
| `GET` | `/repuestos` | `parts.service.ts` | 200, 401, 403, 422 | — |
| `GET` | `/repuestos/{repuesto_id}` | `parts.service.ts` | 200, 401, 403, 404, 422 | — |
| `POST` | `/repuestos` | `parts.service.ts` | 201, 401, 403, 404, 409, 422 | — |
| `PATCH` | `/repuestos/{repuesto_id}` | `parts.service.ts` | 200, 401, 403, 404, 409, 422 | — |
| `DELETE` | `/repuestos/{repuesto_id}` | `parts.service.ts` | 204, 401, 403, 404, 409, 422 | — |
| `GET` | `/proveedores` | `providers.service.ts`, `parts.service.ts` | 200, 401, 403, 422 | — |
| `GET` | `/proveedores/{proveedor_id}` | `providers.service.ts`, `parts.service.ts` | 200, 401, 403, 404, 422 | — |
| `POST` | `/proveedores` | `providers.service.ts` | 201, 401, 403, 409, 422 | — |
| `PATCH` | `/proveedores/{proveedor_id}` | `providers.service.ts` | 200, 401, 403, 404, 409, 422 | — |
| `DELETE` | `/proveedores/{proveedor_id}` | `providers.service.ts` | 204, 401, 403, 404, 409, 422 | — |
| `GET` | `/inventario/alertas` | `notifications.service.ts`, `admin-dashboard.service.ts` | 200, 401, 403 | — |

## Evidencias (MS4)

| Método | Ruta | Servicio | Códigos del contrato | Observado |
|---|---|---|---|---|
| `POST` | `/evidencias` (`multipart/form-data`) | `evidence.service.ts` | 201, 400, 401, 403, 404, 409, 413, 415, 422, 503 | — |
| `GET` | `/evidencias?orden_id={orden_id}` | `evidence.service.ts` | 200, 401, 404, 422, 503 | — |
| `GET` | `/evidencias/{evidencia_id}` | `evidence.service.ts` | 200, 401, 404, 422, 503 | — |
| `GET` | `/evidencias/{evidencia_id}/descarga` | `evidence.service.ts` | 200, 401, 404, 422, 503 | — |

## Tratamiento de los códigos en la app

`src/services/api/interceptors.ts` normaliza todas las respuestas de error. Si el backend envía `detail`, se usa ese mensaje; si no, se asigna uno según el código:

| Código | Tratamiento |
|---|---|
| 401 | Mensaje de sesión expirada y cierre de sesión coordinado, salvo en `POST /auth/login` |
| 403 | Mensaje de falta de permisos; no cierra la sesión |
| 404, 409, 413, 415, 422, 429 | Mensaje específico para cada código |
| 502, 503, 504 | Servicio o Gateway no disponible temporalmente |
| Otros 5xx | Error interno del servidor |
| Otros 4xx | Mensaje genérico de la solicitud HTTP |

## Diferencias con OpenAPI

| Ruta en la app | Contrato | Diferencia |
|---|---|---|
| `PATCH /notificaciones/{id}/leida` con cuerpo `{ leida: true }` | `PATCH /notificaciones/{notificacion_id}/leer`, sin cuerpo, responde 204 | La ruta no existe en el contrato. Además, la app valida la respuesta con `mapNotificationResponse`, que rechaza un cuerpo vacío como el de un 204 |
| `POST /notificaciones/leer-todas` | `PATCH /notificaciones/leer-todas`, responde 204 | Distinto método. Además, la app lee `actualizadas` de la respuesta; con un 204 sin cuerpo devolvería 0 notificaciones marcadas |
| `GET /notificaciones` con los campos de `NotificationQueryParamsDto` (`categoria`, `solo_no_leidas`, `rol`, `orden_id`, `skip`, `limit` y sus alias en inglés) | Parámetros `limite`, `solo_no_leidas` y `offset` | Solo `solo_no_leidas` coincide; la paginación usa otros nombres. La app además filtra la lista localmente |
| `POST /evidencias` | Declara 400 cuando el archivo no se puede leer | La app no tiene un mensaje propio para 400: muestra el `detail` del backend o el mensaje genérico |
| `GET /auth/me`, `GET /notificaciones`, `GET /ordenes/configuracion/capacidad/mecanicos` y `GET /ordenes/configuracion/capacidad/ingresos-diarios` | Rutas protegidas con `HTTPBearer` | El contrato no declara 401, aunque la ruta exige token |

Las tres diferencias de notificaciones solo se ejercitan con `EXPO_PUBLIC_ENABLE_NOTIFICATIONS_API=true`; sin esa variable, la app deriva los avisos de las rutas de cancelaciones, capacidad e inventario. Los parámetros de consulta de `/presupuestos`, `/repuestos`, `/proveedores`, `/evidencias` y `/ordenes/{orden_id}` coinciden con los del contrato, y `GET /ordenes` no envía parámetros: los filtros se aplican en la app.

### Diferencias con `docs/matriz-endpoint-dto-modelo.md`

La matriz endpoint → DTO → modelo registra rutas y nombres que ya no coinciden con los contratos ni con el código, por lo que no debe usarse como referencia de rutas hasta que se actualice; mientras tanto, la referencia es este catálogo. Las diferencias son:

- `PATCH /presupuestos/{presupuesto_id}`, `POST /presupuestos/{presupuesto_id}/aprobar`, `POST /repuestos/{repuesto_id}/ajustar-stock`, `GET /ordenes/{orden_id}/evidencias` y `DELETE /evidencias/{evidencia_id}` no existen en los contratos ni se usan en la app.
- `GET /ordenes/{orden_id}/historial` cita `orderHistoryEntryDtoSchema`, que no existe; la respuesta del historial no se valida con un esquema.
- Los parámetros de consulta de `/presupuestos`, `/repuestos` y `/proveedores` no son los del contrato (por ejemplo `skip`, `limit` y `search` en lugar de `desde`, `limite` y `q`).
- No incluye 15 rutas que la app consume: `GET /auth/usuarios`, `GET` y `POST /ordenes/{orden_id}/bitacora`, `GET /ordenes/cancelaciones/pendientes`, las dos rutas de capacidad, `GET /presupuestos/{presupuesto_id}/versiones/{numero}`, `POST /presupuestos/{presupuesto_id}/versiones`, `PUT .../items`, `POST .../envio`, `POST .../decision`, `POST /presupuestos/decisiones/{decision_id}/aplicacion`, `DELETE /repuestos/{repuesto_id}`, `GET /inventario/alertas` y `GET /evidencias/{evidencia_id}/descarga`.