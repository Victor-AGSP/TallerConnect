# Consistencia general de los modelos

Este documento revisa la consistencia de los modelos de la app (vehículos, órdenes, presupuestos, repuestos, proveedores, evidencias, resumen administrativo y avisos), entre sí y con los contratos OpenAPI de MS1 a MS4. La representación de identificadores, fechas y estados se revisa en `docs/consistencia-identificadores-fechas-estados.md`. Aquí se revisan los demás aspectos: nombres, cobertura del contrato, nulabilidad, montos, listados, relaciones y dependencias entre capas.

## Criterios

- **Consistente:** el modelo sigue la misma convención que los demás y coincide con el contrato.
- **Inconsistente:** el modelo se aparta de la convención o no representa lo que el contrato define.

## Modelos revisados

| Modelo | Archivo | Contrato |
|---|---|---|
| `Vehicle` | `vehicle.model.ts` | `VehiculoRespuesta` (MS2) |
| `WorkOrder`, `OrderStatusUpdateRequest` | `order.model.ts` | `OrdenRespuesta`, `CambioEstadoSolicitud` (MS2) |
| `Budget`, `BudgetSummary`, `BudgetVersion`, `BudgetItem`, `BudgetDecision` | `budget.model.ts` | `PresupuestoDetalle`, `PresupuestoResumen`, `VersionDetalle`, `ItemSalida`, `DecisionSalida` (MS3) |
| `Part` | `part.model.ts` | `RepuestoSalida` (MS3) |
| `Provider`, `ProviderDetail` | `provider.model.ts` | `ProveedorSalida`, `ProveedorDetalle` (MS3) |
| `PaginatedList` | `pagination.model.ts` | `PaginaPresupuestos`, `PaginaRepuestos`, `PaginaProveedores` (MS3) |
| `Evidence`, `EvidenceDownloadUrl`, `EvidenceUploadMetadata` | `evidence.model.ts` | `EvidenciaLeida`, `UrlDescarga`, `Body_subir_evidencias_post` (MS4) |
| `AdminSummary` y sus secciones | `admin.model.ts` | Calculado a partir de respuestas de MS1, MS2 y MS3 |
| `Notice` y sus tipos | `notice.model.ts` | `AlertaRepuesto`, `SolicitudCancelacionRespuesta`, `CapacidadMecanicoRespuesta`, `CupoDiarioIngresosRespuesta` (MS2 y MS3) |

## Nombres

Todos los modelos usan nombres en inglés y en camelCase, y los mappers convierten los nombres en español del contrato.

| Concepto | Campo | Modelos | Categoría |
|---|---|---|---|
| Nombre del repuesto | `name` en el propio repuesto; `partName` al referirse a él | `Part`, `BudgetItem`, `LowStockNotice` | Consistente |
| Nombre del proveedor | `providerName` | `Part`, `BudgetItem`, `LowStockNotice` | Consistente |
| Umbral efectivo | `effectiveThreshold` | `Part`, `LowStockNotice` | Consistente |
| Stock bajo el umbral | `belowThreshold`, `partsBelowThreshold` | `Part`, `AdminInventorySummary` | Consistente |
| Límite de órdenes por mecánico | `maxActiveOrdersPerMechanic`, `mechanicsOverLimit` | `AdminMechanicCapacitySummary`, `MechanicsOverLimitNotice` | Consistente |
| Cupo diario | `localDate`, `maxDailyIntakes`, `registeredIntakes` | `AdminDailyIntakeSummary`, `DailyIntakeExceededNotice` | Consistente |

Cuando un mismo dato aparece en varios modelos, conserva su nombre o solo agrega el contexto necesario. Por ejemplo, `name` dentro de `Part` y `partName` en un ítem o un aviso que se refiere a un repuesto.

## Cobertura del contrato

| Modelo | Campos del contrato que no representa | Categoría |
|---|---|---|
| `Vehicle` | — | Consistente |
| `WorkOrder` | — | Consistente |
| `Budget`, `BudgetSummary`, `BudgetVersion`, `BudgetItem`, `BudgetDecision` | — | Consistente |
| `Evidence` | — | Consistente |
| `Part` | `proveedor_tipo_distribuidor` | Inconsistente |
| `Provider`, `ProviderDetail` | `tipo_distribuidor` | Inconsistente |

El contrato de MS3 declara obligatorio el tipo de distribuidor (`oficial` o `generico`) en `RepuestoSalida` y en `ProveedorSalida`. En la app, en cambio:
- `PartResponseDto` y `ProviderResponseDto` lo declaran opcional.
- `part-dto.schema.ts` y `provider-dto.schema.ts` lo validan con `.optional()`.
- Los payloads simulados de repuestos y proveedores no lo incluyen.
- `Part` y `Provider` no tienen un campo para él, así que el mapper lo descarta.

Por eso, una respuesta sin ese dato pasa la validación, y una que sí lo trae lo pierde al mapear. `ProviderQueryParamsDto` permite filtrar proveedores por `tipo_distribuidor`, pero el modelo no muestra ese valor.

Dos diferencias entre modelos sí vienen del contrato y son consistentes:
- `Part.effectiveThreshold` admite `null` (`RepuestoSalida`), mientras que `LowStockNotice.effectiveThreshold` no lo admite (`AlertaRepuesto` lo exige).
- `BudgetItem.partName` y `BudgetItem.providerName` son `null` cuando el ítem no los trae, porque `ItemSalida` no los declara obligatorios.

## Nulabilidad

| Modelos | Campos que admiten `null` | Categoría |
|---|---|---|
| `Vehicle` | `year`, `mileage` | Consistente |
| `WorkOrder` | `assignedMechanicId` | Consistente |
| `BudgetSummary`, `BudgetVersion`, `BudgetItem` | `currentVersion`, `sentAt`, `lockedAt`, `decision`, `partId`, `partName`, `providerName` | Consistente |
| `Part` | `customThreshold`, `effectiveThreshold` | Consistente |
| `Evidence` | `budgetId` | Consistente |
| `AdminSummary` | Cada sección, `generalThreshold`, `maxActiveOrdersPerMechanic`, `maxDailyIntakes` | Consistente |
| `MechanicsOverLimitNotice`, `DailyIntakeExceededNotice` | `maxActiveOrdersPerMechanic`, `maxDailyIntakes` | Consistente |

Los modelos que representan respuestas del contrato usan `null` para "sin valor" y no usan campos opcionales (`?`). En `evidence.model.ts` hay dos modelos con campos opcionales que no son respuestas:
- `EvidenceUploadMetadata`: sus campos `budgetId` y `visibleToClient` son opcionales y admiten `null`. Es un modelo de solicitud, y el contrato de subida declara esos campos como opcionales.
- `SelectedMediaAsset`: describe un archivo elegido en el dispositivo, cuyos datos (tamaño, dimensiones, duración) pueden no estar disponibles.

## Montos y cantidades

| Origen | Representación en el contrato | Representación en el modelo | Categoría |
|---|---|---|---|
| Presupuestos (MS3) | Texto decimal (`"15000.00"`, `"2.5"`) | `number`, convertido con `parseDecimal` en `budget.mapper.ts` | Consistente |
| Stock, umbrales, conteos y tamaños | Enteros | `number` | Consistente |

`parseDecimal` lanza un error si el texto no es un número válido, en lugar de convertirlo a `NaN`.

## Listados

| Respuesta | Forma en el contrato | Modelo | Categoría |
|---|---|---|---|
| `GET /presupuestos`, `GET /repuestos`, `GET /proveedores` | Página con `total`, `desde` y `limite` | `PaginatedList<T>` | Consistente |
| `GET /ordenes`, `GET /vehiculos`, `GET /evidencias`, `GET /auth/usuarios`, `GET /ordenes/cancelaciones/pendientes` | Arreglo | `T[]` | Consistente |
| `GET /inventario/alertas` | Objeto con `total` y `umbral_general`, sin paginación | `AdminInventorySummary` y `LowStockNotice[]` | Consistente |
| `PaginaRepuestos.umbral_general` | Entero o null, obligatorio | Se descarta en `mapPartPageResponse` | Inconsistente |

La app pagina solo donde el contrato pagina. Sin embargo, `PaginaRepuestos` entrega además el umbral general, que `PaginatedList` no tiene dónde guardar. Por eso `mapPartPageResponse` lo descarta. La respuesta de alertas también entrega un umbral general, y ese sí se conserva en `AdminInventorySummary.generalThreshold`. Además, `parts.mock.ts` expone por separado el de los datos simulados como `mockGeneralThreshold`.

## Relaciones entre modelos

| Tipo de relación | Ejemplos | Categoría |
|---|---|---|
| Entre microservicios: solo por identificador | `WorkOrder.vehicleId`, `Budget.orderId`, `Evidence.orderId`, `Evidence.budgetId` | Consistente |
| Dentro de un mismo microservicio: objetos anidados | `Budget.versions`, `BudgetVersion.items`, `ProviderDetail.parts` | Consistente |

Ningún modelo anida datos de otro microservicio. Esto coincide con el contrato, donde cada respuesta solo incluye datos de su propio servicio.

## Dependencias entre capas

| Caso | Situación | Categoría |
|---|---|---|
| Tipos de presupuesto | `budget.dto.ts` importa `BudgetVersionStatus`, `BudgetItemType` y `BudgetDecisionValue` desde `budget.model.ts`; `order.dto.ts` toma `WorkOrderStatus` de `src/constants/` | Inconsistente |
| Tipo de distribuidor | `PartDistributorType` (`part.dto.ts`) y `ProviderDistributorType` (`provider.dto.ts`) definen los mismos dos valores, y los dos esquemas repiten la lista | Inconsistente |

En presupuestos, el DTO depende del modelo, cuando la convención es que el DTO refleje el contrato sin depender de la representación de la app. El tipo de distribuidor, por su parte, es un mismo catálogo del contrato definido en dos lugares.

## Resumen

| Tema | Consistente | Inconsistente |
|---|---|---|
| Nombres | Nombres coherentes entre modelos, con contexto solo donde hace falta | — |
| Cobertura del contrato | `Vehicle`, `WorkOrder`, modelos de presupuesto y `Evidence` | `Part` y `Provider` sin tipo de distribuidor |
| Nulabilidad | `null` para "sin valor" en todos los modelos de respuesta | — |
| Montos y cantidades | Texto decimal convertido a número con validación | — |
| Listados | Paginación solo donde el contrato pagina | `umbral_general` de `PaginaRepuestos` se descarta |
| Relaciones | Identificadores entre servicios y anidamiento dentro de cada servicio | — |
| Dependencias entre capas | — | `budget.dto.ts` depende del modelo; tipo de distribuidor definido dos veces |

## Referencias

- [Consistencia de identificadores, fechas y estados entre módulos](./consistencia-identificadores-fechas-estados.md)
- [Convenciones de representación de datos](./convenciones-representacion-datos.md)
- [Contrato MS1 (OpenAPI)](https://tallerconect.vercel.app/ms1/openapi.json)
- [Contrato MS2 (OpenAPI)](https://tallerconect.vercel.app/ms2/openapi.json)
- [Contrato MS3 (OpenAPI)](https://tallerconect.vercel.app/ms3/openapi.json)
- [Contrato MS4 (OpenAPI)](https://tallerconect.vercel.app/ms4/openapi.json)