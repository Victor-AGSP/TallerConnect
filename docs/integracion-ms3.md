# Integración con el MS3 (presupuestos, repuestos y proveedores)

Contrato de referencia: `https://tallerconect.vercel.app/ms3/openapi.json` ("SGTM — MS3: Presupuestos, Repuestos y Proveedores", versión 0.1.0, OpenAPI 3.1.0), consultado el 14-10-2026. La app lo consume a través de la API Gateway (`/api/...`), el mismo `apiClient` que usa para el MS2.

## Comprobaciones reales (solo lectura, sin token)

| Solicitud | Resultado |
|---|---|
| `GET /ms3/openapi.json` | 200, contrato completo |
| `GET /ms3/health`, `GET /ms3/health/db` | 200, servicio y base de datos operativos |
| `GET /api/repuestos`, `/api/proveedores`, `/api/presupuestos` | 401 `No se proporcionó un token de acceso`: la Gateway enruta al MS3 y exige JWT |

No se hicieron solicitudes autenticadas ni de escritura. El comportamiento con datos reales se verificó solo contra el contrato, mediante pruebas con el cliente HTTP simulado.

## Repuestos y proveedores

| Capa | Elemento |
|---|---|
| DTO | `src/dto/parts.dto.ts`: `RepuestoSalida`, `PaginaRepuestos`, `ProveedorSalida`, `ProveedorDetalle`, `PaginaProveedores` |
| Modelo | `src/models/parts.model.ts`: `SparePart`, `Supplier`, `SupplierDetail`, `PagedList` |
| Mapper | `src/mappers/parts.mapper.ts`: exige los identificadores enteros y rechaza respuestas que no cumplen el contrato (`null`, `{}`, listas ausentes) |
| Servicio | `PartsService`: `GET /repuestos`, `GET /proveedores`, `GET /proveedores/{proveedor_id}` |
| Vistas | `SparePartListView`, `SupplierListView`, `SupplierDetailView`: carga, vacío, error con reintento y actualización manual |
| Rutas | `(admin)/repuestos`, `(admin)/proveedores`, `(admin)/proveedores/[id]`, con acceso desde el panel del administrador |

Relación representada: cada repuesto pertenece a un proveedor (`proveedor_id`, `proveedor_nombre`), y el detalle del proveedor incluye sus repuestos. Se muestran el stock y el umbral efectivo, indicando si es propio o general, junto con la marca `bajo_umbral`.

**Modelos paralelos (revisado en SCRUM-105, 28-10-2026):** además de `parts.*` existen `src/dto/part.dto.ts`, `provider.dto.ts`, `src/models/part.model.ts`, `provider.model.ts`, `src/mappers/part.mapper.ts`, `provider.mapper.ts` y los esquemas `part-dto.schema.ts`/`provider-dto.schema.ts` (commits `043f762` y `427e354`, de otro integrante). Describen los mismos esquemas del MS3 con otros nombres (`Part`/`Provider` frente a `SparePart`/`Supplier`) y sus DTO coinciden con el contrato. Las pantallas y `PartsService` usan solo `parts.*`; `part.*`/`provider.*` se usan en los payloads simulados (`src/mocks/payloads/`) y se exportan desde `src/models/index.ts`, sin colisión de nombres. No se consolidaron: forman parte de la API pública de otro integrante y no producen errores. Unificarlos requiere acordarlo con su autor.

Fuera de alcance, por decisión: alta, edición y eliminación de repuestos y proveedores, movimientos de inventario, alertas y umbral general. Son operaciones de administración de inventario que la integración de las interfaces no requiere.

### Paginación

El contrato pagina con `desde` y `limite` (valor por defecto 50, máximo 200). La app pide la primera página sin parámetros y muestra "Mostrando N de total". Desde SCRUM-100 (28-10-2026), si el servidor tiene más registros, "Cargar más repuestos"/"Cargar más proveedores" pide `desde = registros mostrados` y `limite = 50` (`useLoadMore`): descarta repetidos por `id`, se detiene cuando una página no trae registros nuevos, conserva lo cargado ante un error (con reintento) y una actualización vuelve a la primera página. `getSpareParts`/`getSuppliers` rechazan parámetros fuera del contrato sin llamar al MS3. Pruebas: `parts-service.test.ts` y `parts-views-integration.test.tsx`.

### Roles

Los GET de repuestos y proveedores declaran `403 Rol no permitido`, pero el contrato no indica qué roles se admiten. Aunque desde SCRUM-102 un 403 ya no cierra la sesión, las vistas se siguen publicando solo para el Administrador (`RoleGuard`), porque no está confirmado que otro rol tenga permiso. Hay que pedir al responsable del MS3 que confirme si el Mecánico puede consultar repuestos, antes de exponerlos en su panel.

## Presupuesto ↔ orden de trabajo

| Capa | Elemento |
|---|---|
| DTO | `src/dto/budget.dto.ts`: `PresupuestoResumen`, `PresupuestoDetalle`, `VersionDetalle`, `ItemSalida`, `DecisionSalida`, `DecisionEntrada`, `ResultadoOperacion`, `RepuestoFaltante`, `DecisionAplicacionPendiente` |
| Modelo | `src/models/budget.model.ts`: `Budget`, `BudgetVersion`, `BudgetItem`, `BudgetDecision`, `BudgetDecisionResult` |
| Mapper | `src/mappers/budget.mapper.ts`: ordena las versiones por número y rechaza estados o decisiones desconocidos en lugar de interpretarlos |
| Servicio | `BudgetsService` (ver tabla siguiente) |
| Vista | `OrderBudgetView`: total, estado, ítems (cantidad × precio, subtotal, repuesto y proveedor), versión vigente, decisión registrada; carga, vacío, error con reintento y actualización manual |
| Rutas | `(cliente)/mis-ordenes/[id]/presupuesto` y `(admin)/ordenes/[id]/presupuesto`, abiertas con el botón "Ver presupuesto" del detalle de la orden |

| Operación | Endpoint (vía Gateway) | Rol |
|---|---|---|
| Presupuesto de una orden | `GET /presupuestos?orden_id={id}` y luego `GET /presupuestos/{presupuesto_id}` | Cliente (solo versiones enviadas) y Administrador |
| Aprobar / rechazar | `POST /presupuestos/{presupuesto_id}/versiones/{numero}/decision` | Solo Cliente |
| Reintentar la aplicación | `POST /presupuestos/decisiones/{decision_id}/aplicacion` | Solo Cliente |

### Origen del `decision_id`

El MS3 crea la decisión con `POST …/decision` y, en la primera decisión, pide al MS2 que la aplique en la orden. El identificador llega en `ResultadoOperacion.decision_id`, en `VersionDetalle.decision.decision_id` y, si la aplicación falla, en el cuerpo del 503 (`DecisionAplicacionPendiente`). En ese caso la app reintenta con `…/decisiones/{decision_id}/aplicacion` sin volver a decidir.

La app no llama directamente a `POST /ms2/ordenes/{orden_id}/decisiones-presupuesto`. Ese endpoint lo usa el MS3 para aplicar la decisión, y llamarlo desde la app duplicaría la ruta de aplicación.

### Reglas del contrato que aplica la interfaz

- Solo se puede decidir la versión más reciente visible con estado `enviada` y sin decisión. El MS3 responde 409 si la versión ya se decidió o fue reemplazada, y la app muestra ese mensaje.
- `DecisionEntrada` (`additionalProperties: false`): la app envía exactamente `decision` (`aprobado`/`rechazado`), `motivo` (recortado, o `null`) y `confirmar_cancelacion`. Todo rechazo exige motivo y `motivo` admite como máximo 1000 caracteres; la app valida ambas reglas antes de enviar (SCRUM-99, 28-10-2026).
- Rechazar sin una aprobación previa (`version_vigente = null`) cancela el servicio. La app lo advierte, pide confirmarlo y envía `confirmar_cancelacion: true`. Rechazar una modificación posterior conserva la aprobación vigente y no cancela.
- Ambas decisiones requieren una confirmación explícita.
- `efecto_en_orden` y `repuestos_faltantes` se muestran tras decidir. El MS2 confirma el estado resultante de la orden, que se ve en el detalle al actualizarlo.
- Un POST nunca se reintenta automáticamente (`attachRetryInterceptor` solo reintenta métodos seguros), y el formulario descarta una segunda pulsación con el envío en curso (bloqueo síncrono, SCRUM-101), así que una decisión no se envía dos veces.
- Garantías del backend según el contrato: un segundo POST sobre la misma versión responde 409 ("ya decidida"), y la aplicación en MS2 de la primera decisión es idempotente (`POST /presupuestos/decisiones/{decision_id}/aplicacion`). El contrato no declara idempotencia del POST de decisión en sí; la app no la supone.

### Roles y limitaciones

- El Mecánico no ve el presupuesto: `GET /presupuestos` declara `403 Rol no permitido` sin indicar qué roles admite; no se expone hasta que el responsable del MS3 lo confirme.
- El estado de la orden en el detalle usa `CODE_TO_STATUS`, alineado con el catálogo de MS2 desde el merge `f25ae44` (C1, verificado en SCRUM-104: 3 = esperando aprobación, 4 = esperando repuestos, 5 = en reparación, 8 = cancelado). El flujo del presupuesto usa además el estado de la versión y `efecto_en_orden` del MS3.
- Validación: contrato OpenAPI y pruebas con el cliente HTTP simulado (`budget-service.test.ts`) o con el adaptador de red simulado (`budget-flow-integration.test.tsx`). No se enviaron decisiones ni se crearon presupuestos en el MS3 desplegado.
