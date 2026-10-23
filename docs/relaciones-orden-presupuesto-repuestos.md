# Relaciones entre orden, presupuesto y repuestos

Este documento revisa cómo se relacionan las órdenes de trabajo (MS2) con los presupuestos, repuestos y proveedores (MS3): qué campo une cada relación, qué garantizan los contratos y cómo se mantienen esas relaciones en los modelos de la app.

## Relaciones en los contratos

| Relación | Campo que la une | Cardinalidad | Qué garantiza el contrato |
|---|---|---|---|
| Orden → presupuesto | `orden_id` en el presupuesto | Una orden tiene 0 o 1 presupuesto | Crear un segundo presupuesto para la misma orden responde `409` "La orden ya tiene presupuesto" |
| Presupuesto → versiones | `numero` dentro de `versiones` | Un presupuesto tiene 1 o más versiones | Las versiones anteriores no se modifican; cada corrección crea una nueva |
| Versión → ítems | `items` | Una versión tiene hasta 100 ítems | Una versión solo se envía si tiene ítems con precio |
| Ítem → repuesto | `repuesto_id` en el ítem | Un ítem apunta como máximo a un repuesto; cuando `repuesto_id` está informado, identifica ese repuesto | Un ítem con un repuesto inexistente responde `422` |
| Repuesto → proveedor | `proveedor_id` en el repuesto | Un proveedor tiene 0 o más repuestos; un repuesto tiene un proveedor | Un repuesto con un proveedor inexistente responde `404` |

## Orden y presupuesto

La orden está en MS2 y el presupuesto en MS3, cada uno con su propia base de datos, así que no hay una llave foránea entre ambos. El presupuesto guarda el `orden_id` de MS2 y la orden no guarda ninguna referencia a su presupuesto.

Para obtener el presupuesto de una orden se consulta `GET /api/presupuestos?orden_id={orden_id}`. Al consultar, MS3 valida la orden contra MS2: si MS2 no está disponible responde `503`, y un cliente solo obtiene los presupuestos de sus propias órdenes. Para la creación (`POST /api/presupuestos`), el contrato no declara un error para una orden inexistente.

## Presupuesto y repuestos

El campo `repuesto_id` de un ítem es el que lo relaciona con un repuesto. Junto a él, el ítem puede incluir `repuesto_nombre` y `proveedor_nombre`, de modo que el presupuesto puede mostrarse sin consultar los repuestos. El contrato define dos tipos de ítem: `repuesto` y `mano_de_obra`.

El contrato protege esta relación al eliminar:

| Operación | Restricción |
|---|---|
| `DELETE /api/repuestos/{repuesto_id}` | Solo elimina un repuesto que nunca se usó; si tiene historial, responde `409` |
| `DELETE /api/proveedores/{proveedor_id}` | Solo elimina un proveedor sin repuestos; si tiene, responde `409` |

Estas restricciones impiden eliminar un repuesto que tenga historial o un proveedor que todavía tenga repuestos asociados.

## Efecto del presupuesto en el estado de la orden

El estado de la orden vive en MS2, pero enviar y decidir un presupuesto en MS3 lo cambia. MS3 informa el resultado en `efecto_en_orden`, y en la primera decisión solicita a MS2 aplicar el cambio; `estado_aplicado` es el código de estado de MS2 (1 a 8).

| Operación en MS3 | `efecto_en_orden` | Estado de la orden en la app | Código |
|---|---|---|---|
| Primer envío de una versión | `esperando_aprobacion` | `esperando_aprobacion_presupuesto` | 3 |
| Aprobación con stock suficiente | `en_reparacion` | `en_reparacion` | 5 |
| Aprobación sin stock suficiente | `esperando_repuestos` | `esperando_repuestos` | 4 |
| Rechazo antes de la primera aprobación | `cancelado` | `cancelado` | 8 |
| Envío o rechazo de una modificación posterior | `null` | Sin cambio | — |

El estado de espera de aprobación tiene un nombre distinto en MS3 (`esperando_aprobacion`) y en la app (`esperando_aprobacion_presupuesto`); ambos corresponden al código 3.

## Relaciones en los modelos de la app

| Relación | Campo del modelo | Se compara con | Origen de ambos valores |
|---|---|---|---|
| Presupuesto → orden | `Budget.orderId` | `WorkOrder.id` | `String(orden_id)` |
| Ítem → repuesto | `BudgetItem.partId` | `Part.id` | `String(repuesto_id)` |
| Repuesto → proveedor | `Part.providerId` | `Provider.id` | `String(proveedor_id)` |

Los mappers convierten los identificadores de ambos lados de la misma forma, así que cada relación se puede comprobar comparando los valores directamente. Cuando un ítem no tiene `repuesto_id`, `BudgetItem.partId` es `null`.

## Lo que el contrato no precisa

- Si un ítem de tipo `repuesto` puede quedar sin `repuesto_id`, o si un ítem de `mano_de_obra` puede llevarlo; el contrato admite `repuesto_id` como opcional y nulable al crear un ítem.
- Si `repuesto_nombre` y `proveedor_nombre` de un ítem guardan el nombre al momento de crear la versión o muestran el nombre actual, considerando que el nombre y el proveedor de un repuesto pueden modificarse.

## Referencias

- [Contrato MS2 (OpenAPI)](https://tallerconect.vercel.app/ms2/openapi.json)
- [Contrato MS3 (OpenAPI)](https://tallerconect.vercel.app/ms3/openapi.json)