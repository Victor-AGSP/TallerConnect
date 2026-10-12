# Integración cruzada: órdenes, presupuestos, repuestos y proveedores

Revisión de los contratos entre capas (contrato de la API → DTO → mapper → modelo → servicio → vista) del módulo de órdenes, contrastada el 12-10-2026 con el contrato publicado por la API Gateway (`/ms2/openapi.json`). Complementa `docs/discrepancias-integracion.md` y `docs/matriz-endpoint-dto-modelo.md` con los cambios que el contrato incorporó desde entonces.

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

Corrección necesaria: `3 → esperando_aprobacion_presupuesto`, `5 → en_reparacion`, `8 → cancelado` y eliminar el código 9. `control_calidad` y `pausado_por_presupuesto_rechazado` no tienen código en el contrato. Hay que actualizar las pruebas que fijan el catálogo actual.

### C2. Cambio de estado (`updateOrderStatus`)

| | Contrato | App |
|---|---|---|
| Ruta | `PATCH /ordenes/{orden_id}/estado` | `PATCH /ordenes/{id}/status` |
| Cuerpo | `CambioEstadoSolicitud`: `estado_destino` (entero) y `observacion` (obligatoria al pasar a Cancelado) | `{ status: string }` |
| Restricciones | 1 → 2 y 3 → 4/5 requieren operaciones específicas y no admiten PATCH directo | No se contemplan |

El endpoint ya existe (I5 y E3 lo daban como inexistente). La corrección depende de C1 para convertir el estado a `estado_destino`.

### C3. Cliente de la orden (I2 / E8, vigente)

`OrdenRespuesta` sigue sin cliente. El mapper toma `clientId` de `creado_por_id`, de modo que con la API real la fila "Cliente" del detalle muestra el usuario creador (administrador).

### C4. Respuestas vacías del detalle

Comprobado con OrdersService real y el cliente HTTP simulado:

- Una respuesta 200 con cuerpo `null` llega a `mapOrderResponse`, que falla al leer `dto.status`; `getOrderById` propaga el mensaje técnico y la vista muestra "Cannot read properties of null (reading 'status')".
- Una respuesta 200 con `{}` se convierte en una orden con `id` vacío y valores por defecto, y la vista la representa como "Orden " sin identificador.

Corrección necesaria: validar la respuesta en el mapper o el servicio (por ejemplo, exigir `orden_id`) y lanzar un error con mensaje propio. Las pruebas correspondientes quedan como `it.todo` en `__tests__/order-view-states.test.tsx`.

## Endpoints del contrato sin uso en la app

| Endpoint | Observación |
|---|---|
| `GET /ordenes/{orden_id}/historial` | Historial de estados (`HistorialEstadoRespuesta`). |
| `POST /ordenes/{orden_id}/decisiones-presupuesto` | Solo rol Cliente. Recibe `{ decision_id }` y el MS2 verifica la decisión en el MS3 (503 si no puede). |

## Presupuestos, repuestos y proveedores (MS3)

- No existen modelos, DTO, mappers ni servicios en la app, en ninguna rama del repositorio.
- `/ms3/openapi.json` respondió 500 (`FUNCTION_INVOCATION_FAILED`) el 12-10-2026; no hay contrato publicado.
- Las secciones "Presupuesto" y "Repuestos" de los paneles de cliente y mecánico muestran datos de demostración.
- Sin MS3 no hay forma de obtener un `decision_id` real, por lo que `decisiones-presupuesto` no puede integrarse aún.

Bloquea: integración de repuestos/proveedores, integración presupuesto ↔ orden y la relación presupuesto ↔ repuestos en la regresión del flujo.
