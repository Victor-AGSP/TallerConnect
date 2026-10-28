# Integración cruzada: órdenes, presupuestos, repuestos y proveedores

Revisión de los contratos entre capas (contrato de la API → DTO → mapper → modelo → servicio → vista) del módulo de órdenes, contrastada el 12-10-2026 con el contrato publicado por la API Gateway (`/ms2/openapi.json`) y actualizada el 14-10-2026 tras la publicación del MS3 (`/ms3/openapi.json`). Complementa `docs/discrepancias-integracion.md` y `docs/matriz-endpoint-dto-modelo.md` con los cambios que el contrato incorporó desde entonces. La integración con el MS3 está documentada en `docs/integracion-ms3.md`.

## Cadena verificada en la app

| Capa | Elemento | Estado |
|---|---|---|
| Rutas | `(admin)/ordenes/[id]`, `(cliente)/mis-ordenes/[id]`, `(mecanico)/ordenes-asignadas/[id]` | Las tres delegan en `OrderDetailView` con `ordersService.getOrderById` |
| Vista | `OrderDetailView` + `useDataQuery` | Representa todos los campos de `WorkOrder`; carga, error, reintento y actualización manual |
| Servicio | `OrdersService.getOrderById` → `GET /ordenes/{id}` | Ruta alineada con el contrato |
| Mapper | `mapOrderResponse` | Campos de identificación, vehículo, ingreso, mecánico, autor y fechas alineados con `OrdenRespuesta` |
| Modelo | `WorkOrder` | Compatible con la vista |

Pruebas: `__tests__/order-contract-compatibility.test.tsx` ejercita la cadena completa con los ejemplos oficiales de `OrdenRespuesta`, simulando solo el cliente HTTP.

## Incompatibilidades detectadas (pendientes del responsable del código)

Estas diferencias están en `src/mappers/order.mapper.ts` y `src/services/orders.service.ts`. No se modificaron en esta tarea porque corresponden a otro integrante.

Estado al 14-10-2026 (contrato MS2 vuelto a consultar):

| | Rama `Victor` | Rama `Develop` |
|---|---|---|
| C1 | Corregida (merge de Develop `f25ae44`; verificada en SCRUM-104) | Corregida (`ORDER_STATUS_BY_CODE`: 3, 5 y 8 alineados con el contrato) |
| C2 | Corregida (`PATCH /ordenes/{id}/estado` con `estado_destino`; verificada en SCRUM-104) | Pendiente (`PATCH /ordenes/{id}/status`) |
| C3 | Pendiente (el contrato sigue sin cliente en `OrdenRespuesta`) | No verificado |
| C4 | Corregida (SCRUM-103, 28-10-2026) | No verificado |

Ninguna bloquea la integración con el MS3: el presupuesto y los repuestos se representan con los datos del MS3 (estado de la versión y `efecto_en_orden`), no con `estado_codigo`.

### C1. Catálogo de estados (`CODE_TO_STATUS`)

El contrato ya publica el catálogo en la descripción de `OrdenRespuesta.estado_codigo` (antes registrado como I1, "sin catálogo publicado").

| Código | Contrato MS2 | `CODE_TO_STATUS` actual | ¿Coincide? |
|---|---|---|---|
| 1 | Recibido | `recibido` | Sí |
| 2 | Esperando diagnóstico | `esperando_diagnostico` | Sí |
| 3 | Esperando aprobación de presupuesto | `en_reparacion` | **No** |
| 4 | Esperando repuestos | `esperando_repuestos` | Sí |
| 5 | En reparación | `control_calidad` | **No** |
| 6 | Listo | `listo_para_entrega` | Sí (equivalente) |
| 7 | Entregado | `entregado` | Sí |
| 8 | Cancelado | `esperando_aprobacion_presupuesto` | **No** |
| 9 | — (no existe) | `cancelado` | **No** |

Efecto: una orden en código 3 se muestra como "En reparación" y una cancelada (8) como "Esperando aprobación del presupuesto". El tramo presupuesto → repuestos → reparación (3 → 4 → 5) no se representa correctamente.

**Corregido en `Victor` (merge `f25ae44`):** `ORDER_STATUS_BY_CODE` asigna 1–8 según el contrato y no existe el código 9; un código fuera del catálogo se rechaza (SCRUM-103). `control_calidad` y `pausado_por_presupuesto_rechazado` no tienen código en el contrato y `updateOrderStatus` los rechaza sin llamar a MS2. Pruebas: `order-contract-compatibility.test.tsx` (códigos 1–8, ida y vuelta, fuera de catálogo).

### C2. Cambio de estado (`updateOrderStatus`)

| | Contrato | App |
|---|---|---|
| Ruta | `PATCH /ordenes/{orden_id}/estado` | `PATCH /ordenes/{id}/status` |
| Cuerpo | `CambioEstadoSolicitud`: `estado_destino` (entero) y `observacion` (obligatoria al pasar a Cancelado) | `{ status: string }` |
| Restricciones | 1 → 2 y 3 → 4/5 requieren operaciones específicas y no admiten PATCH directo | No se contemplan |

El endpoint ya existe (I5 y E3 lo daban como inexistente).

**Corregido en `Victor` (merge `f25ae44`, ajustado en SCRUM-104):** `updateOrderStatus` envía `PATCH /ordenes/{id}/estado` con `CambioEstadoSolicitud` exacto (`estado_destino` y, si existe, `observacion` recortada; un texto vacío se omite por `minLength: 1`). La cancelación sin observación se rechaza en la app. La app **no** filtra transiciones: según el contrato, el PATCH genérico solo admite 5 → 6 por el mecánico asignado; 1 → 2, 2 → 3 y 3 → 4/5/8 requieren operaciones específicas, y 4 → 5, 6 → 7 y la cancelación genérica están bloqueadas. MS2 responde 409 en esos casos y la app propaga el `detail` sin reintentar. Ninguna pantalla llama hoy a `updateOrderStatus`. Pruebas: `order-flow-regression.test.tsx` ("estados y transiciones MS2").

### C3. Cliente de la orden (I2 / E8, vigente)

`OrdenRespuesta` sigue sin cliente. El mapper toma `clientId` de `creado_por_id`, de modo que con la API real la fila "Cliente" del detalle muestra el usuario creador (administrador).

### C4. Respuestas vacías del detalle

Comprobado con OrdersService real y el cliente HTTP simulado:

- Una respuesta 200 con cuerpo `null` llega a `mapOrderResponse`, que falla al leer `dto.status`; `getOrderById` propaga el mensaje técnico y la vista muestra "Cannot read properties of null (reading 'status')".
- Una respuesta 200 con `{}` se convierte en una orden con `id` vacío y valores por defecto, y la vista la representa como "Orden " sin identificador.

**Corregido (SCRUM-103, 28-10-2026):** `mapOrderResponse` valida la respuesta con `orderResponseDtoSchema` (todos los campos obligatorios de `OrdenRespuesta`, enteros, fechas ISO 8601 y `mecanico_actual_id` entero o `null`) y no completa valores por defecto. Una respuesta inválida o un `estado_codigo` fuera del catálogo lanza `InvalidOrderResponseError`, que `normalizeOrderServiceError` convierte en `ServiceError` con código `ORDER_INVALID_RESPONSE` y mensaje apto para la UI. La vista muestra el error con "Reintentar" y no representa una orden ficticia. Pruebas: `__tests__/order-view-states.test.tsx` ("respuestas vacías o inválidas").

## Hallazgos de las pruebas funcionales

`__tests__/order-functional.test.tsx` usa pantallas, sesión, servicios e interceptores reales (Jest; sin emulador ni dispositivo) y recorre dos casos de uso:

- **Consultar una orden** (tres roles): login → panel → detalle → actualización → regreso → cierre de sesión.
- **Decidir el presupuesto** (cliente, desde el 14-10-2026): login → detalle de la orden → "Ver presupuesto" → aprobar o rechazar. Las respuestas de MS2 y MS3 se simulan en el adaptador de Axios según sus contratos; no se envían decisiones a producción. Se verifica:
  - la confirmación previa a toda decisión, y que "Volver" no envía nada;
  - el motivo obligatorio al rechazar y la advertencia de cancelación en el primer rechazo (`confirmar_cancelacion: true`);
  - el efecto en la orden, los repuestos faltantes y la recarga del presupuesto; al volver a la orden y actualizar, se ve el estado aplicado (código 4);
  - el token de la sesión en la decisión, y que la app no llama a `decisiones-presupuesto` del MS2;
  - un error 503 sin decisión registrada: no hay reintento automático del POST y el cliente puede volver a intentarlo;
  - una aplicación pendiente (503 con `decision_id`): se reintenta `…/aplicacion` sin repetir la decisión;
  - una decisión registrada no vuelve a ofrecerse, ni siquiera tras recargar;
  - un tiempo de espera agotado al cargar el presupuesto: dos reintentos automáticos y luego el reintento manual.

Observaciones:

- Ninguna vista enlaza al detalle de una orden: solo se llega por ruta (`/ordenes/{id}`, `/mis-ordenes/{id}`, `/ordenes-asignadas/{id}`). Falta un listado de órdenes o un acceso desde los paneles. **Pendiente**: puede corresponder a otro integrante, por eso no se implementó.
- Las secciones de órdenes, presupuesto y repuestos de los paneles muestran datos fijos de demostración, y las acciones del panel del mecánico ("Actualizar estado", "Revisar repuestos", etc.) no tienen comportamiento asociado. **Pendiente**: tampoco se modificaron, por la misma razón.
- Ante un tiempo de espera agotado, el cliente HTTP reintenta dos veces las consultas GET (1 s y 2 s) antes de que la vista muestre el error y ofrezca el reintento manual. Los POST de decisión no se reintentan.
- **Pendiente (`it.todo`)**: la doble pulsación de "Confirmar" con la decisión aún en curso. El botón queda deshabilitado mientras se envía, pero no se puede automatizar, porque el manejador devuelve la promesa del envío y el `fireEvent` de las pruebas la convierte en un `act()` asíncrono que no admite una segunda pulsación solapada. Se cubre que la decisión se envía una sola vez en los demás escenarios.
- Corregido (SCRUM-102, 28-10-2026): `attachErrorInterceptor` ya no cierra la sesión ante 403, como indican los contratos (403 = rol sin permiso). Pruebas: `order-role-access.test.tsx` (tres roles), `budget-flow-integration.test.tsx` e `interceptors.test.ts`.

## Endpoints del contrato sin uso en la app

| Endpoint | Observación |
|---|---|
| `GET /ordenes/{orden_id}/historial` | Historial de estados (`HistorialEstadoRespuesta`). |
| `POST /ordenes/{orden_id}/decisiones-presupuesto` | Solo rol Cliente. Recibe `{ decision_id }` y el MS2 verifica la decisión en el MS3 (503 si no puede). No se usa por diseño: el MS3 lo invoca al registrar la decisión, y la app reintenta la aplicación con `POST /presupuestos/decisiones/{decision_id}/aplicacion` (ver `docs/integracion-ms3.md`). |

## Presupuestos, repuestos y proveedores (MS3)

El 12-10-2026 `/ms3/openapi.json` respondía 500 y bloqueaba esta parte. Al 14-10-2026 el MS3 está operativo (contrato 0.1.0, `/ms3/health` y `/ms3/health/db` responden 200) y la app lo consume a través de la API Gateway:

| Integración | Estado | Detalle |
|---|---|---|
| Repuestos y proveedores ↔ interfaces | Integrado | `PartsService`, vistas `(admin)/repuestos` y `(admin)/proveedores` |
| Presupuesto ↔ orden de trabajo | Integrado | `BudgetsService`, vista `…/[id]/presupuesto` desde el detalle de la orden |
| Decisión del cliente (`decision_id`) | Integrado | El MS3 genera el `decision_id` al aprobar o rechazar; la app no llama al endpoint del MS2 |
| Presupuesto ↔ repuestos | Representado | Ítems con `repuesto_id`, repuesto y proveedor; `repuestos_faltantes` tras aprobar |

Pendientes que no corresponden a esta integración:

- Rol Mecánico: el contrato del MS3 no indica qué roles pueden leer repuestos y presupuestos, Aunque un 403 ya no cierra la sesión (SCRUM-102), las vistas se exponen solo a los roles con permiso seguro hasta que el responsable del MS3 lo confirme.
- Las tarjetas de presupuesto y repuestos de los paneles (`cliente.tsx`, `mecanico.tsx`, `administrador.tsx`) siguen con datos de demostración, y no hay un listado de órdenes que enlace al detalle. Pueden corresponder a funcionalidades de otros integrantes; no se modificaron.

Detalle de endpoints, roles, reglas y validaciones: `docs/integracion-ms3.md`.
