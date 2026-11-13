# Contratos reales de la Gateway: vehículos y órdenes

Este documento contrasta las respuestas que entrega la API Gateway (`https://tallerconect.vercel.app/api`) con el contrato OpenAPI de MS2 (`/ms2/openapi.json`) y con los tipos de la app. Las respuestas se obtuvieron con las cuentas de prueba de cada rol, usando solo consultas de lectura.

## Campos de respuesta de vehículos

`GET /api/vehiculos` devuelve una lista de `VehiculoRespuesta` para los roles cliente y administrador. El mecánico consulta `GET /api/vehiculos/asignados`, que según el contrato devuelve el mismo esquema. Se revisaron las respuestas de los tres roles. Cada vehículo tiene estos campos:

| Campo | Tipo en el contrato | Obligatorio | Admite `null` | Respuesta real | `VehicleResponseDto` |
|---|---|---|---|---|---|
| `vehiculo_id` | `integer` | Sí | No | Entero | `number` |
| `cliente_id` | `integer` | Sí | No | Entero | `number` |
| `patente` | `string` | Sí | No | Texto; con letras y dígitos o solo con dígitos | `string` |
| `marca` | `string` | Sí | No | Texto libre, sin mayúsculas normalizadas | `string` |
| `modelo` | `string` | Sí | No | Texto libre, sin mayúsculas normalizadas | `string` |
| `anio` | `integer \| null` | Sí | Sí | Entero en todos los vehículos revisados | `number \| null` |
| `kilometraje` | `integer \| null` | Sí | Sí | Entero en todos los vehículos revisados | `number \| null` |

- El contrato declara los siete campos como `required`: ninguno es opcional. Un campo ausente significa una respuesta fuera de contrato, no un dato desconocido.
- Solo `anio` y `kilometraje` admiten `null`.
- Las respuestas revisadas de los tres roles coinciden con el contrato y con `VehicleResponseDto`: cada vehículo trae los siete campos y ninguno adicional.
- Ninguna respuesta revisada contiene `null`. Ese caso se cubre con las fixtures de contrato de `src/mocks/payloads/vehicle.payload.ts`.

### Ejemplo anonimizado

Respuesta de `GET /api/vehiculos` con la cuenta del rol cliente, disponible como fixture en `src/mocks/gateway/vehicles.gateway.ts`. Las patentes y los identificadores se reemplazaron por valores ficticios que conservan su formato y las relaciones entre registros; marca, modelo, año y kilometraje se conservan.

```json
[
  {
    "vehiculo_id": 101,
    "cliente_id": 501,
    "patente": "XYZW10",
    "marca": "Toyota",
    "modelo": "Corolla",
    "anio": 2019,
    "kilometraje": 65000
  },
  {
    "vehiculo_id": 102,
    "cliente_id": 501,
    "patente": "XYZW20",
    "marca": "Hyundai",
    "modelo": "Accent",
    "anio": 2017,
    "kilometraje": 98000
  },
  {
    "vehiculo_id": 103,
    "cliente_id": 501,
    "patente": "900001",
    "marca": "nissan",
    "modelo": "pathfinder",
    "anio": 2007,
    "kilometraje": 8425
  }
]
```

La prueba `__tests__/vehicle-gateway-response.test.ts` comprueba que el ejemplo trae exactamente los campos del contrato y que cumple el esquema `vehicleResponseDtoSchema`.

## Estados de órdenes

`OrdenRespuesta.estado_codigo` es un entero cuyo catálogo oficial publica `/ms2/openapi.json`. La app representa el estado con `WorkOrderStatus` (`src/constants/orderStatus.ts`) y convierte el código con `ORDER_STATUS_BY_CODE`, que usa `mapOrderStatus` en `src/mappers/order.mapper.ts`. Para enviar un cambio de estado, `STATUS_TO_CODE` hace la conversión inversa.

| Código MS2 | Estado en el contrato | `WorkOrderStatus` | Etiqueta en la app | Equivalencia |
|---|---|---|---|---|
| `1` | Recibido | `recibido` | Recibido | Directa |
| `2` | Esperando diagnóstico | `esperando_diagnostico` | Esperando diagnóstico | Directa |
| `3` | Esperando aprobación de presupuesto | `esperando_aprobacion_presupuesto` | Esperando aprobación del presupuesto | Directa |
| `4` | Esperando repuestos | `esperando_repuestos` | Esperando repuestos | Directa |
| `5` | En reparación | `en_reparacion` | En reparación | Directa |
| `6` | Listo | `listo_para_entrega` | Listo para entrega | Directa, con nombre más específico en la app |
| `7` | Entregado | `entregado` | Entregado | Directa |
| `8` | Cancelado | `cancelado` | Cancelado | Directa |
| — | — | `pausado_por_presupuesto_rechazado` | Pausada por presupuesto rechazado | Sin código en MS2 |
| — | — | `control_calidad` | Control de calidad | Sin código en MS2 |

### Diferencias

- Los ocho códigos del contrato tienen un estado equivalente en la app, en ambos sentidos. Un código fuera del catálogo se rechaza con `InvalidOrderResponseError`.
- `pausado_por_presupuesto_rechazado` no existe en MS2. Según el contrato, el rechazo inicial del presupuesto lleva la orden de `3` a `8` (Cancelado); no hay un estado de pausa.
- `control_calidad` no existe en MS2. El contrato pasa directamente de En reparación (`5`) a Listo (`6`).
- Como ninguno de estos dos estados tiene un código equivalente en el catálogo de MS2, no pueden representarse mediante `estado_codigo`. Además, `mapOrderStatusUpdateRequest` rechaza enviarlos como `estado_destino`.
- El comentario de `src/constants/orderStatus.ts` describe el flujo Esperando diagnóstico → En reparación → Esperando repuestos. En el contrato, Esperando repuestos (`4`) precede a En reparación (`5`): la decisión inicial del presupuesto pasa de `3` a `4`, `5` u `8`, y la disponibilidad de repuestos de `4` a `5`.
- Las respuestas reales revisadas traen los códigos `5`, `6` y `8`, todos dentro del catálogo.

El mismo catálogo identifica los estados en otros campos del contrato: `estado_anterior` y `estado_nuevo` de `HistorialEstadoRespuesta`, `estado_al_solicitar` de `SolicitudCancelacionRespuesta` y `estado_aplicado` de las respuestas de envío y decisión de presupuesto.

La prueba `__tests__/order-status-equivalence.test.ts` comprueba que la app reconoce exactamente los códigos del catálogo y que solo `pausado_por_presupuesto_rechazado` y `control_calidad` quedan sin código.

## Contraste de DTO y mappers con la Gateway

Las respuestas reales de `GET /api/vehiculos` y `GET /api/ordenes` se compararon con cada capa de la app: el DTO, el esquema Zod, el mapper y el modelo. La columna "Contrato" usa los esquemas `VehiculoRespuesta` y `OrdenRespuesta` de `/ms2/openapi.json`.

### Vehículos

`mapVehicleResponse` no usa `vehicleResponseDtoSchema`: valida la respuesta por su cuenta y acepta, además del contrato, nombres de campos de un formato anterior.

| Campo | Contrato | `VehicleResponseDto` | `vehicleResponseDtoSchema` | `mapVehicleResponse` | `Vehicle` |
|---|---|---|---|---|---|
| `vehiculo_id` | Obligatorio, no nulo | `number` | Entero obligatorio | Obligatorio; acepta también `id` y valores de texto | `id: string` |
| `cliente_id` | Obligatorio, no nulo | `number` | Entero obligatorio | Opcional; acepta también `client_id`, `clientId`, `owner_id` y `ownerId` | `ownerId?: string` |
| `patente` | Obligatorio, no nulo | `string` | Texto obligatorio | Texto no vacío; acepta también `patent`, `license_plate` y `plate` | `plate: string` |
| `marca` | Obligatorio, no nulo | `string` | Texto obligatorio | Texto; acepta también `brand` | `brand: string` |
| `modelo` | Obligatorio, no nulo | `string` | Texto obligatorio | Texto; acepta también `model` | `model: string` |
| `anio` | Obligatorio, admite `null` | `number \| null` | Entero o `null`, obligatorio | Si falta, se asigna `null`, salvo que venga `cliente_id` | `year: number \| null` |
| `kilometraje` | Obligatorio, admite `null` | `number \| null` | Entero o `null`, obligatorio | Si falta, se asigna `null`, salvo que venga `cliente_id` | `mileage: number \| null` |

El DTO y el esquema coinciden con el contrato. Las diferencias están en el mapper, que acepta respuestas que el esquema rechaza, y en el modelo, donde `ownerId` es opcional aunque `cliente_id` es obligatorio en el contrato.

### Órdenes

`mapOrderResponse` valida la respuesta con `orderResponseDtoSchema` antes de mapearla.

| Campo | Contrato | `OrderResponseDto` | `orderResponseDtoSchema` | `mapOrderResponse` | `WorkOrder` |
|---|---|---|---|---|---|
| `orden_id` | Obligatorio, no nulo | `number` | Entero obligatorio | Se convierte a texto | `id: string` |
| `vehiculo_id` | Obligatorio, no nulo | `number` | Entero obligatorio | Se convierte a texto | `vehicleId: string` |
| `ingreso_id` | Obligatorio, no nulo | `number` | Entero obligatorio | Se convierte a texto | `intakeId: string` |
| `estado_codigo` | Obligatorio, no nulo | `number` | Entero obligatorio | Se convierte con `mapOrderStatus`; rechaza códigos fuera del catálogo | `status: WorkOrderStatus` |
| `mecanico_actual_id` | Obligatorio, admite `null` | `number \| null` | Entero o `null`, obligatorio | Se convierte a texto; `null` se conserva | `assignedMechanicId: string \| null` |
| `creado_por_id` | Obligatorio, no nulo | `number` | Entero obligatorio | Se convierte a texto | `createdById: string` |
| `creado_en` | Obligatorio, no nulo, `date-time` | `string` | Fecha ISO con zona horaria, obligatoria | Se conserva | `createdAt: string` |
| `actualizado_en` | Obligatorio, no nulo, `date-time` | `string` | Fecha ISO con zona horaria, obligatoria | Se conserva | `updatedAt: string` |
| `devuelto_en` | Obligatorio, admite `null`, `date-time` | No existe | No existe; se descarta | No existe | No existe |
| `devuelto_por_id` | Obligatorio, admite `null` | No existe | No existe; se descarta | No existe | No existe |
| — | No existe | No existe | No existe | No se asigna | `clientId?: string` |

Los ocho campos que la app conoce coinciden con el contrato en tipo y nulabilidad. `devuelto_en` y `devuelto_por_id` registran la devolución física de una orden cancelada; la app no los tiene en ninguna capa. `clientId` existe solo en el modelo y el mapper no lo asigna, porque `OrdenRespuesta` no tiene un campo equivalente. Según la documentación de `WorkOrder`, el cliente de una orden se obtiene a través de su vehículo (`vehicleId` → `Vehicle.ownerId`).

### Casos incompatibles

| Caso | Respuesta | Contrato | Comportamiento actual | Efecto |
|---|---|---|---|---|
| O1 | Orden con `devuelto_en` y `devuelto_por_id` con valor | Válida | El esquema los descarta sin error | La app pierde la fecha y el responsable de la devolución |
| O2 | Orden sin `devuelto_en` ni `devuelto_por_id` | Fuera de contrato | El esquema la acepta | Una respuesta incompleta no se detecta |
| V1 | Vehículo sin `cliente_id` ni `anio` | Fuera de contrato | El mapper la acepta con `anio` en `null`; el esquema la rechaza | Un dato faltante se muestra como desconocido |
| V2 | Vehículo con `cliente_id` y sin `anio` | Fuera de contrato | El mapper la rechaza | La misma ausencia se trata distinto que en V1 |
| V3 | Vehículo solo con nombres del formato anterior (`id`, `plate`, `brand`, `model`, `year`, `mileage`) | Fuera de contrato | El mapper la acepta; el esquema la rechaza | Se aceptan respuestas que no son de MS2 |
| V4 | Vehículo con `vehiculo_id` de texto | Fuera de contrato | El mapper la acepta; el esquema la rechaza | Un tipo incorrecto no se detecta |

O1 aparece en las respuestas reales: la orden cancelada y devuelta trae ambos campos con valor. Las respuestas reales de vehículos son compatibles; V1 a V4 son respuestas fuera de contrato construidas a partir del ejemplo anonimizado.

La prueba `__tests__/gateway-contract-contrast.test.ts` reproduce los seis casos con las fixtures `src/mocks/gateway/vehicles.gateway.ts` y `src/mocks/gateway/orders.gateway.ts`. En las órdenes, los identificadores y las fechas se reemplazaron por valores ficticios que conservan su formato y las relaciones entre registros; los códigos de estado y los valores nulos se conservan.