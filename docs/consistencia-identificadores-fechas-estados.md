# Consistencia de identificadores, fechas y estados entre módulos

Este documento revisa cómo se representan los identificadores, las fechas y los estados que comparten los módulos de la app (usuarios, vehículos, órdenes, presupuestos, repuestos, proveedores y evidencias). Contrasta los contratos OpenAPI de MS1 a MS4 con los DTO, esquemas, mappers, modelos y datos simulados, y toma como referencia `docs/convenciones-representacion-datos.md`.

## Criterios

- **Consistente:** el dato se representa y convierte igual en todos los módulos y coincide con el contrato.
- **Inconsistente:** dos partes de la app representan o convierten el mismo dato de forma distinta, o se apartan de la convención.
- **Sin definir en el contrato:** el contrato no entrega la información necesaria para comprobarlo.

## Identificadores

### Recepción

| Módulo | Campos del contrato | Campos del modelo |
|---|---|---|
| Usuarios (MS1) | `id` | `User.id` |
| Vehículos (MS2) | `vehiculo_id`, `cliente_id` | `Vehicle.id`, `Vehicle.ownerId` |
| Órdenes (MS2) | `orden_id`, `vehiculo_id`, `ingreso_id`, `mecanico_actual_id`, `creado_por_id` | `WorkOrder.id`, `vehicleId`, `intakeId`, `assignedMechanicId`, `createdById` |
| Presupuestos (MS3) | `presupuesto_id`, `orden_id`, `item_id`, `repuesto_id`, `decision_id`, `cliente_usuario_id`, `creado_por_id` | `Budget.id`, `orderId`, `BudgetItem.id`, `partId`, `BudgetDecision.id`, `clientUserId`, `BudgetVersion.createdById` |
| Repuestos y proveedores (MS3) | `repuesto_id`, `proveedor_id` | `Part.id`, `Part.providerId`, `Provider.id` |
| Evidencias (MS4) | `evidencia_id`, `orden_id`, `presupuesto_id` | `Evidence.id`, `orderId`, `budgetId` |

**Categoría: Consistente.** En todos los módulos, los identificadores numéricos se mantienen como entero en el DTO y el mapper los convierte con `String()`. Los que admiten nulo (`mecanico_actual_id`, `repuesto_id`, `presupuesto_id`) se conservan como `null`.

`evidencia_id` es el único identificador que el contrato define como texto (formato `uuid`). Se mantiene como `string` en el DTO y en el modelo.

### Relaciones entre módulos

| Relación | Campo del modelo | Se compara con | Categoría |
|---|---|---|---|
| Orden → vehículo | `WorkOrder.vehicleId` | `Vehicle.id` | Consistente |
| Presupuesto → orden | `Budget.orderId` | `WorkOrder.id` | Consistente |
| Evidencia → orden | `Evidence.orderId` | `WorkOrder.id` | Consistente |
| Evidencia → presupuesto | `Evidence.budgetId` | `Budget.id` | Consistente |
| Ítem → repuesto | `BudgetItem.partId` | `Part.id` | Consistente |
| Repuesto → proveedor | `Part.providerId` | `Provider.id` | Consistente |
| Decisión → cliente | `BudgetDecision.clientUserId` | `User.id` | Consistente |
| Vehículo → cliente | `Vehicle.ownerId` | `User.id` | Sin definir en el contrato |
| Orden → mecánico | `WorkOrder.assignedMechanicId` | `User.id` | Sin definir en el contrato |
| Orden y versión → creador | `WorkOrder.createdById`, `BudgetVersion.createdById` | `User.id` | Sin definir en el contrato |

El contrato usa dos nombres para referirse al cliente:
- `VehiculoRespuesta` (MS2) entrega `cliente_id`.
- `SolicitudCancelacionRespuesta` (MS2) y `DecisionSalida` (MS3) entregan `cliente_usuario_id`, cuyo nombre indica que es un identificador de usuario.

MS2 además responde `404` "No existe el perfil Cliente local", lo que indica que mantiene un perfil de cliente propio. El contrato no aclara si `cliente_id` es el mismo identificador que el `id` de usuario de MS1. Lo mismo ocurre con `mecanico_actual_id` y `creado_por_id`.

### Envío a la API

La convención establece convertir con `Number(id)` y comprobar que el resultado sea un entero.

| Lugar | Tratamiento | Categoría |
|---|---|---|
| `mapEvidenceUploadRequest` (`evidence-upload.mapper.ts`) | Rechaza un identificador que no represente un entero mayor que 0 | Consistente |
| `buildBudgetQueryParams` (`budgets.service.ts`) | Elimina los caracteres no numéricos antes de convertir (`replace(/\D/g, '')`): `'ot-00124'` se envía como `124` | Inconsistente |
| `CreateOrderRequestDto.vehiculo_id`, `AssignMechanicRequestDto.mecanico_id`, `CreateBudgetRequestDto.orden_id` | Admiten `number \| string`; el contrato exige un entero mayor que 0 | Inconsistente |

`buildBudgetQueryParams` interpreta el contenido del identificador, lo que contradice que los identificadores son opacos. Un valor con otro formato se convierte en otro identificador sin aviso, en lugar de rechazarse.

### Datos simulados

| Datos | Origen | Formato de identificador |
|---|---|---|
| `mockUsers`, `mockVehicles`, `mockWorkOrders` | Escritos con forma de modelo | `'usr-001'`, `'veh-001'`, `'ot-00124'`, `'ing-001'` |
| `mockBudgets`, `mockEvidences` | Derivados de los payloads mediante el mapper | `'102'`, `'103'`, `'105'`, etc. |
| Usuarios demo de `auth.service.ts` | Escritos en el servicio | `'demo-cliente-001'`, `'demo-mecanico-001'`, `'demo-admin-001'` |

**Categoría: Inconsistente.** La convención admite identificadores de texto en los datos simulados con forma de modelo, así que el formato por sí solo no es el problema. El problema está en las relaciones entre módulos:
- Los presupuestos y evidencias simulados apuntan a órdenes (`'102'`, `'103'`, `'105'`, `'106'`, `'108'`) que no existen en `mockWorkOrders`.
- Por eso, con los adaptadores simulados, una orden no encuentra su presupuesto ni sus evidencias.

## Fechas

| Módulo | Campos del contrato | Campos del modelo | Validación del DTO |
|---|---|---|---|
| Órdenes (MS2) | `creado_en`, `actualizado_en` | `createdAt`, `updatedAt` | `z.iso.datetime({ offset: true })` |
| Presupuestos (MS3) | `creado_en`, `enviado_en`, `bloqueada_en`, `fecha_hora` (decisión) | `createdAt`, `sentAt`, `lockedAt`, `decidedAt` | `z.iso.datetime({ offset: true })` |
| Evidencias (MS4) | `creada_en` | `createdAt` | `z.iso.datetime({ offset: true })` |

**Categoría: Consistente.** Los tres módulos validan las fechas con zona horaria y las guardan en el modelo como texto ISO, sin convertirlas. Los nombres distintos del contrato (`creado_en`, `creada_en`, `fecha_hora`) se unifican en el modelo. `enviado_en` y `bloqueada_en` se conservan como `null` cuando no tienen valor. Vehículos, repuestos y proveedores no tienen fechas.

### Zona horaria

| Fuente | Ejemplo |
|---|---|
| Ejemplos del contrato de MS2 | `2026-09-28T10:30:00-03:00` |
| Payloads simulados | `2026-03-01T09:00:00Z` |
| Datos simulados con forma de modelo | `2026-03-01T09:00:00.000Z` |

Los tres formatos son ISO 8601 con zona horaria y los esquemas aceptan todos. Como pueden llegar fechas con distinto desplazamiento horario, dos fechas no se pueden ordenar comparando el texto. Por ejemplo, `2026-09-28T10:30:00-03:00` (13:30 UTC) es posterior a `2026-09-28T12:00:00Z`, aunque como texto aparezca antes. Para comparar u ordenar se debe convertir a `Date`, como indica la convención.

### Fechas sin hora

`CupoDiarioIngresosRespuesta.jornada_local` (MS2) tiene formato `date`, por ejemplo `2026-09-28`, y es el único campo del contrato sin hora ni zona horaria. Esto tiene dos consecuencias:
- `z.iso.datetime()` lo rechaza; corresponde validarlo con `z.iso.date()`.
- `new Date('2026-09-28')` lo interpreta como medianoche UTC. Al mostrarlo en la zona horaria de Chile, aparece como el día anterior.

## Estados

### Catálogos

| Catálogo | Contrato | App | Categoría |
|---|---|---|---|
| Estado de orden | `estado_codigo` entero; catálogo 1 a 8 publicado en la descripción del campo | `ORDER_STATUS_BY_CODE`, `WorkOrderStatus` y `ORDER_STATUS_LABELS` en `src/constants/orderStatus.ts` | Consistente |
| Rol de usuario | `NombreRol`: `cliente`, `mecanico`, `administrador` | `ROLES` en `src/constants/roles.ts` | Consistente |
| Contexto de evidencia | `ContextoEvidencia`: cuatro valores | `EVIDENCE_CONTEXTS` en `src/constants/evidence.ts` | Consistente |
| Estado de versión de presupuesto | `borrador`, `enviada`, `aprobada`, `rechazada` | Tipo `BudgetVersionStatus` en `budget.model.ts`; la lista se repite en `budget-dto.schema.ts` | Inconsistente |
| Decisión de presupuesto | `aprobado`, `rechazado` | Tipo `BudgetDecisionValue` en `budget.model.ts`; la lista se repite en `budget-dto.schema.ts` | Inconsistente |
| Estado de evidencia | `string`, sin valores publicados | `Evidence.status: string` | Sin definir en el contrato |
| Tipo de archivo de evidencia | `string`, sin valores publicados | `Evidence.fileType: string` | Sin definir en el contrato |

Los estados de orden, los roles y los contextos de evidencia se definen una sola vez como constantes en `src/constants/`, y sus tipos se derivan de ellas. Los catálogos de presupuesto, en cambio, se definen como tipos en el modelo y su lista de valores se escribe de nuevo en el esquema, así que un cambio en el contrato obliga a modificar dos lugares.

Los nombres del catálogo de órdenes coinciden con el contrato, incluido el estado 6, que el contrato llama "Listo".

### Códigos de estado de orden fuera de `OrdenRespuesta`

| Dónde aparece | Campo | Tratamiento en la app | Categoría |
|---|---|---|---|
| `OrdenRespuesta` | `estado_codigo` | `mapOrderResponse` lo convierte con el catálogo | Consistente |
| `CambioEstadoSolicitud` | `estado_destino` | `mapOrderStatusUpdateRequest` lo obtiene con `STATUS_TO_CODE` | Consistente |
| `HistorialEstadoRespuesta` | `estado_anterior`, `estado_nuevo` | `getOrderHistory` devuelve el DTO con los códigos numéricos; no hay modelo de historial | Inconsistente |
| `AplicacionDecisionRespuesta`, `AplicacionEnvioPresupuestoRespuesta` | `estado_aplicado` (1 a 8) | `BudgetOperationResultDto.aplicacion_en_orden` se tipa como `Record<string, unknown>` | Inconsistente |

El mismo estado de orden llega a la app como `WorkOrderStatus` en las órdenes y como código numérico en el historial. Por eso, una pantalla que muestre ambos tendría que convertir los códigos por su cuenta.

MS3 entrega además `efecto_en_orden` con nombres propios: `esperando_aprobacion` corresponde a `esperando_aprobacion_presupuesto`, código 3 (detallado en `docs/relaciones-orden-presupuesto-repuestos.md`). `BudgetOperationEffect` reproduce esos valores tal como los define el contrato.

### Valores desconocidos

| Mapper | Ante un valor fuera del catálogo |
|---|---|
| `mapOrderResponse` | Lanza un error |
| `mapUserResponse` | Lanza un error si el rol no pertenece a la app |
| `mapEvidenceResponse` | `normalizeContext` reemplaza el contexto por `'diagnostico'` sin aviso |
| `mapBudgetSummaryResponse`, `mapBudgetVersionResponse` | Copian el estado sin comprobarlo; solo el esquema lo valida |

**Categoría: Inconsistente.** Un dato inesperado del backend se rechaza en órdenes y usuarios, pero se reemplaza en evidencias. Un estado de presupuesto inválido solo se detecta si el servicio valida con el esquema antes de llamar al mapper.

### Etiquetas

`ORDER_STATUS_LABELS` contiene los nombres oficiales de cada estado. `OrderDetailScreen.tsx` define su propio mapa (`getStatusLabel`) con textos distintos: "Esperando aprobación" en lugar de "Esperando aprobación de presupuesto", y "Listo para entrega" en lugar de "Listo".

**Categoría: Inconsistente.** El mismo estado se muestra con nombres distintos según la pantalla.

## Lo que el contrato no precisa

- Si `cliente_id` de `VehiculoRespuesta` es el `id` de usuario de MS1 o el de un perfil de cliente propio de MS2.
- Si `mecanico_actual_id`, `mecanico_id` y `creado_por_id` corresponden al `id` de usuario de MS1.
- Qué valores puede tomar el estado de una evidencia y su tipo de archivo. Los payloads usan `confirmada`, `foto` y `video`.
- En qué orden llegan los roles de un usuario con varios roles. El contrato de MS2 menciona usuarios multirol, como un administrador que también es mecánico, y `mapUserResponse` usa el primero.
- Qué claves tienen los objetos de `mecanicos_sobre_limite` en `CapacidadMecanicoRespuesta`; solo declara que sus valores son