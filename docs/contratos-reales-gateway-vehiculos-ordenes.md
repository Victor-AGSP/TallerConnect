# Contratos reales de la Gateway: vehículos y órdenes

Este documento contrasta las respuestas que entrega la API Gateway con el contrato OpenAPI de MS2 (`/ms2/openapi.json`) y con los tipos de la app. Las respuestas se obtuvieron con las cuentas de prueba de cada rol, usando solo consultas de lectura, a través de la Gateway anterior (`https://tallerconect.vercel.app/api`). Esa Gateway ya fue retirada. La URL oficial actual es la de la UCT (`https://api-tallerconnect.inf.uct.cl/api`).

Las fixtures anonimizadas, sus relaciones y las pruebas de regresión de mappers se describen en `docs/fixtures-anonimizadas-y-regresion-mappers.md`.

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

`mapVehicleResponse` no usa `vehicleResponseDtoSchema`. Valida la respuesta por su cuenta y, además del contrato, acepta nombres de campos de un formato anterior.

| Campo | Contrato | `VehicleResponseDto` | `vehicleResponseDtoSchema` | `mapVehicleResponse` | `Vehicle` |
|---|---|---|---|---|---|
| `vehiculo_id` | Obligatorio, no nulo | `number` | Entero obligatorio | Entero obligatorio; acepta también `id` | `id: string` |
| `cliente_id` | Obligatorio, no nulo | `number` | Entero obligatorio | Opcional; si viene, debe ser entero; acepta también `client_id`, `clientId`, `owner_id` y `ownerId` | `ownerId?: string` |
| `patente` | Obligatorio, no nulo | `string` | Texto obligatorio | Texto no vacío; acepta también `patent`, `license_plate` y `plate` | `plate: string` |
| `marca` | Obligatorio, no nulo | `string` | Texto obligatorio | Texto; acepta también `brand` | `brand: string` |
| `modelo` | Obligatorio, no nulo | `string` | Texto obligatorio | Texto; acepta también `model` | `model: string` |
| `anio` | Obligatorio, admite `null` | `number \| null` | Entero o `null`, obligatorio | Entero o `null`, obligatorio; acepta también `year` | `year: number \| null` |
| `kilometraje` | Obligatorio, admite `null` | `number \| null` | Entero o `null`, obligatorio | Entero o `null`, obligatorio; acepta también `mileage` | `mileage: number \| null` |

El DTO y el esquema coinciden con el contrato. Quedan dos diferencias:

- El mapper acepta respuestas sin `cliente_id` y con nombres del formato anterior, que el esquema rechaza.
- En el modelo, `ownerId` es opcional, aunque `cliente_id` es obligatorio en el contrato.

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
| `devuelto_en` | Obligatorio, admite `null`, `date-time` | `string \| null`, opcional | Fecha ISO con zona horaria o `null`, opcional | Se conserva; si falta, se omite | `returnedAt?: string \| null` |
| `devuelto_por_id` | Obligatorio, admite `null` | `number \| null`, opcional | Entero o `null`, opcional | Se convierte a texto; `null` se conserva; si falta, se omite | `returnedById?: string \| null` |
| — | No existe | No existe | No existe | No se asigna | `clientId?: string` |

Los diez campos del contrato coinciden en tipo y nulabilidad con la app.

- **Devolución.** `devuelto_en` y `devuelto_por_id` registran la devolución física de una orden cancelada. Se incorporaron en todas las capas, pero son opcionales en la app, aunque el contrato los exige. Así no se rompen los datos de prueba existentes que no los incluyen (caso O2).
- **Cliente.** `clientId` existe solo en el modelo, y el mapper no lo asigna porque `OrdenRespuesta` no tiene un campo equivalente. Según la documentación de `WorkOrder`, el cliente de una orden se obtiene a través de su vehículo (`vehicleId` → `Vehicle.ownerId`).

### Casos incompatibles

La tabla muestra el comportamiento detectado en el contraste inicial y el estado después de las correcciones de la capa de contratos.

| Caso | Respuesta | Contrato | Comportamiento detectado | Estado actual |
|---|---|---|---|---|
| O1 | Orden con `devuelto_en` y `devuelto_por_id` con valor | Válida | El esquema los descartaba sin error, y la app perdía la fecha y el responsable de la devolución | Corregido: el esquema y el mapper los conservan en `returnedAt` y `returnedById` |
| O2 | Orden sin `devuelto_en` ni `devuelto_por_id` | Fuera de contrato | El esquema la acepta | Se mantiene, para no romper datos de prueba existentes que no incluyen esos campos |
| V1 | Vehículo sin `cliente_id` ni `anio` | Fuera de contrato | El mapper la aceptaba con `anio` en `null`, y un dato faltante se mostraba como desconocido | Corregido: el mapper la rechaza, igual que el esquema |
| V2 | Vehículo con `cliente_id` y sin `anio` | Fuera de contrato | El mapper la rechaza | Sin cambios; ahora V1 y V2 se tratan igual |
| V3 | Vehículo solo con nombres del formato anterior (`id`, `plate`, `brand`, `model`, `year`, `mileage`) | Fuera de contrato | El mapper la acepta; el esquema la rechaza | Se mantiene, por compatibilidad con el formato anterior que aún usan datos de prueba del proyecto |
| V4 | Vehículo con `vehiculo_id` de texto | Fuera de contrato | El mapper la aceptaba, y un tipo incorrecto no se detectaba | Corregido: el mapper la rechaza, igual que el esquema |

O1 aparece en las respuestas reales: la orden cancelada y devuelta trae ambos campos con valor. Las respuestas reales de vehículos son compatibles; V1 a V4 son respuestas fuera de contrato construidas a partir del ejemplo anonimizado.

La prueba `__tests__/gateway-contract-contrast.test.ts` reproduce los seis casos con su estado actual, usando las fixtures `src/mocks/gateway/vehicles.gateway.ts` y `src/mocks/gateway/orders.gateway.ts`. `__tests__/mapper-ids-dates-nulls.test.ts` cubre además la compatibilidad que se mantiene fuera de contrato: un vehículo sin `cliente_id` y una orden con solo uno de los campos de devolución. En las órdenes, los identificadores y las fechas se reemplazaron por valores ficticios que conservan su formato y las relaciones entre registros; los códigos de estado y los valores nulos se conservan.

## Cliente en el detalle de la orden

Las rutas de detalle `(admin)/ordenes/[id]`, `(cliente)/mis-ordenes/[id]` y `(mecanico)/ordenes-asignadas/[id]` usan `OrderDetailView`, que muestra la fila "Cliente" con `clientId` o, si no tiene valor, "No disponible". Como `OrdenRespuesta` no tiene un campo de cliente, `mapOrderResponse` nunca asigna `clientId` y la fila muestra siempre "No disponible".

### Campo faltante

| Dato | En `OrdenRespuesta` | Dónde lo entrega el contrato | Cómo se obtiene |
|---|---|---|---|
| Identificador del cliente | No existe | `cliente_id` de `VehiculoRespuesta` (MS2): entero, obligatorio y no nulo | Con el `vehiculo_id` de la orden, mediante `GET /api/vehiculos/{vehiculo_id}` |
| Nombre del cliente | No existe | `full_name` de `UsuarioRespuesta` (MS1) | Requiere confirmar que `cliente_id` de MS2 corresponde al `id` de usuario de MS1 |

- Las respuestas reales de vehículos revisadas, de los tres roles, traen `cliente_id` en todos los registros.
- En las fixtures anonimizadas, la orden `201` tiene `vehiculo_id: 101`, y ese vehículo tiene `cliente_id: 501`.

### Responsable

- No se requiere agregar un campo de cliente a `OrdenRespuesta`: el identificador ya está disponible a través del vehículo de la orden.
- El dato debe proveerlo la app móvil al construir el detalle: la vista o su ruta deben consultar el vehículo de la orden con `vehiclesService.getVehicleById` y tomar su `ownerId`. El mapper de órdenes no puede asignarlo, porque solo recibe `OrdenRespuesta`.
- `OrderDetailScreen` ya consulta el vehículo de la orden y muestra su `ownerId` como "ID del cliente" cuando el rol es administrador, pero solo la usan las rutas `(cliente)/ordenes/[id]` y `(mecanico)/ordenes/[id]`, por lo que esa fila no se muestra en ninguna ruta.

### Sin confirmar

- `GET /api/vehiculos/{vehiculo_id}` está declarado para usuarios autenticados según la visibilidad de cada rol, pero no se consultó con la cuenta de administrador. `GET /api/vehiculos`, que también entrega `cliente_id`, responde `200` a ese rol.
- El contrato no aclara si `cliente_id` es el `id` de usuario de MS1 o el de un perfil de cliente propio de MS2, por lo que buscarlo en la lista de `GET /api/auth/usuarios` no garantiza obtener el nombre del cliente.