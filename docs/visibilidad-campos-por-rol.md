# Visibilidad de campos por rol en presupuestos, repuestos y proveedores

Este documento revisa, en el contrato publicado del MS3 (`/ms3/openapi.json`), qué datos de presupuestos, repuestos y proveedores puede consultar cada rol de TallerConnect (cliente, mecánico y administrador) y qué restricciones aplica el backend a cada uno.

## Cómo indica el contrato los permisos

OpenAPI no tiene un campo estándar para declarar roles. El MS3 los indica de tres formas:

| Forma | Ejemplo en el contrato | Qué significa |
|---|---|---|
| Descripción de la respuesta `403` | "Se requiere rol Mecánico o Administrador" | Roles que pueden usar la operación |
| Descripción de la operación | "El cliente solo ve presupuestos de sus órdenes y solo las versiones enviadas" | Qué registros recibe cada rol |
| Descripción de la respuesta `404` | "Presupuesto o versión inexistente (o ajeno)" | Un registro ajeno se responde como inexistente |

Todos los endpoints exigen token Bearer. Cuando un endpoint no declara `403` ni restricciones en su descripción, el contrato no declara una restricción por rol para esa operación.

## El contrato no define campos distintos por rol

Cada endpoint declara un único esquema de respuesta. El contrato no documenta variantes por rol ni campos que se omitan según quién consulta. Las diferencias que sí documenta están en qué registros se entregan: el cliente recibe solo presupuestos de sus órdenes y solo versiones enviadas.

## Presupuestos

### Consulta

| Endpoint | Cliente | Mecánico | Administrador |
|---|---|---|---|
| `GET /api/presupuestos` | Solo indicando `orden_id` de una orden suya | Sin restricción declarada | Sin restricción declarada |
| `GET /api/presupuestos/{presupuesto_id}` | Solo de sus órdenes y solo versiones enviadas | Sin restricción declarada | Sin restricción declarada |
| `GET /api/presupuestos/{presupuesto_id}/versiones/{numero}` | Solo de sus órdenes; si es ajena, `404` | Sin restricción declarada | Sin restricción declarada |
| `GET /api/presupuestos/decisiones/{decision_id}` | Solo el cliente responsable de la decisión | No | No |

`GET /api/presupuestos` declara `403` "Rol no permitido", pero no indica qué rol queda excluido.

### Operaciones

| Operación | Cliente | Mecánico | Administrador |
|---|---|---|---|
| Crear presupuesto, crear versión y reemplazar ítems | No | Sí | Sí |
| Enviar una versión al cliente | No | No | Sí |
| Aprobar o rechazar una versión enviada | Sí, el dueño de la orden | No | No |
| Reintentar la aplicación de una decisión | Sí | No | No |

### Qué ve el cliente

Según el contrato, el administrador envía una versión en `borrador` y desde ese momento queda congelada; luego el cliente la aprueba o la rechaza. Por eso, las versiones enviadas que recibe el cliente pueden estar en `enviada`, `aprobada` o `rechazada`, y no recibe versiones en `borrador`.

Al consultar un presupuesto, recibe todos los campos de sus versiones enviadas, entre ellos:

| Campo | Esquema | Dato que expone |
|---|---|---|
| `precio_unitario`, `subtotal`, `total` | `ItemSalida`, `VersionDetalle` | Precios y montos de cada ítem y de la versión |
| `repuesto_nombre`, `proveedor_nombre` | `ItemSalida` | Repuesto y proveedor de cada ítem |
| `creado_por_id` | `VersionDetalle` | Identificador del usuario que creó la versión |
| `decision`, `motivo` | `VersionDetalle`, `DecisionSalida` | Su decisión y el motivo de un rechazo |

Así, el cliente conoce el nombre del proveedor de cada repuesto a través del presupuesto, aunque el contrato no indique si puede consultar los endpoints de proveedores.

Además, al consultar una de sus decisiones (`GET /api/presupuestos/decisiones/{decision_id}`), recibe `DecisionPresupuestoVerificada`, que incluye `repuestos_disponibles`: si había stock al momento de decidir.

### Lo que el contrato no precisa

- Si los campos de resumen (`cantidad_versiones`, `ultima_version`, `estado_ultima_version`, `total_ultima_version`) se calculan, para el cliente, solo sobre las versiones enviadas o sobre todas.
- Si el mecánico ve todos los presupuestos o solo los de las órdenes que tiene asignadas.

## Repuestos y proveedores

| Endpoint | Esquema de respuesta | Restricción declarada |
|---|---|---|
| `GET /api/repuestos` | `PaginaRepuestos` | `403` "Rol no permitido" |
| `GET /api/repuestos/{repuesto_id}` | `RepuestoSalida` | `403` "Rol no permitido" |
| `GET /api/proveedores` | `PaginaProveedores` | `403` "Rol no permitido" |
| `GET /api/proveedores/{proveedor_id}` | `ProveedorDetalle` | `403` "Rol no permitido" |

Las operaciones de creación, modificación y eliminación de ambos recursos declaran la misma respuesta. El contrato no indica qué roles pueden consultar ni modificar repuestos y proveedores.

Los esquemas de respuesta incluyen, en repuestos, el stock y los umbrales (`stock`, `umbral_particular`, `umbral_efectivo`, `bajo_umbral`); en proveedores, el contacto (`contacto`), que puede ser un teléfono, un correo o una persona.

## Resumen

| Recurso | Cliente | Mecánico | Administrador |
|---|---|---|---|
| Presupuestos | Solo de sus órdenes, solo versiones enviadas | Consulta sin restricción declarada; crea presupuestos y versiones y reemplaza ítems | Consulta sin restricción declarada; crea presupuestos y versiones, reemplaza ítems y envía versiones |
| Decisiones | Solo las suyas; aprueba o rechaza | No | No |
| Repuestos | No especificado | No especificado | No especificado |
| Proveedores | No especificado | No especificado | No especificado |

## Referencias

- [Contrato MS3 (OpenAPI)](https://tallerconect.vercel.app/ms3/openapi.json)
- [Documentación MS3 (Swagger)](https://tallerconect.vercel.app/ms3/docs)