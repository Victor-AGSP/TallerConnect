# Contratos OpenAPI de Presupuestos, Repuestos y Proveedores (MS3)

Este documento estudia el contrato OpenAPI 3.1 publicado por el microservicio **SGTM — MS3: Presupuestos, Repuestos y Proveedores** (`https://tallerconect.vercel.app/ms3/openapi.json`, versión `0.1.0`) y define su correspondencia con los DTOs, parámetros de consulta, obtención de detalle y métodos tipados de `BudgetService`, `PartService` y `ProviderService` en la aplicación móvil.

---

## 1. Seguridad, Servidores y Códigos de Error en MS3

El microservicio MS3 expone sus rutas directamente bajo `/ms3` en Vercel y a través de la API Gateway bajo el prefijo `/api`. Todos los endpoints de negocio exigen autenticación mediante `HTTPBearer` (`Authorization: Bearer <access_token>`).

| Código HTTP | Significado en el contrato MS3 | Código `ServiceError` en la app |
|---|---|---|
| `200` / `201` | Operación exitosa (`201` en creaciones `POST` y decisiones) | — |
| `204` | Eliminación exitosa sin contenido (`DELETE /repuestos/{id}`, `DELETE /proveedores/{id}`) | — |
| `401` | JWT ausente, inválido o expirado | `*_UNAUTHORIZED` |
| `403` | Rol no permitido para la operación o recurso ajeno | `*_FORBIDDEN` |
| `404` | Presupuesto, versión, repuesto o proveedor inexistente (o ajeno al cliente) | `*_NOT_FOUND` |
| `409` | Conflicto de negocio (orden ya tiene presupuesto, versión ya enviada/congelada, nombre repetido en proveedor, repuesto con historial, stock insuficiente) | `*_CONFLICT` |
| `422` | Error de validación de esquema o regla de negocio (p. ej. rechazo sin motivo o sin confirmar cancelación, ítems sin precio) | `*_VALIDATION_ERROR` |
| `503` | MS2 no disponible para validar la orden o coordinación pendiente de aplicación en MS2 | `BUDGET_COORDINATION_ERROR` / `*_SERVER_ERROR` |

---

## 2. Contrato OpenAPI de Presupuestos (`/presupuestos`)

### 2.1 Endpoints disponibles

| Método y Ruta (MS3) | Ruta vía Gateway | Rol requerido | Parámetros (Path / Query) | Body (Request) | Respuesta (`200`/`201`) | Método en `BudgetService` |
|---|---|---|---|---|---|---|
| `GET /presupuestos` | `GET /api/presupuestos` | Cliente (con `orden_id`), Mecánico o Admin | Query: `orden_id?: int`, `desde?: int` (def. `0`), `limite?: int` (def. `50`, máx. `200`) | — | `PaginaPresupuestos` | `getBudgetsPage(params?)` / `getBudgets(params?)` / `getBudgetByOrderId(orderId)` |
| `GET /presupuestos/{presupuesto_id}` | `GET /api/presupuestos/{presupuesto_id}` | Autenticado (cliente solo ve versiones enviadas de sus órdenes) | Path: `presupuesto_id: integer` | — | `PresupuestoDetalle` | `getBudgetById(id)` |
| `GET /presupuestos/{presupuesto_id}/versiones/{numero}` | `GET /api/presupuestos/{presupuesto_id}/versiones/{numero}` | Autenticado (según visibilidad) | Path: `presupuesto_id: integer`, `numero: integer` (`>= 1`) | — | `VersionDetalle` | `getBudgetVersion(budgetId, versionNumber)` |
| `POST /presupuestos` | `POST /api/presupuestos` | Mecánico o Administrador | — | `PresupuestoCrear` | `PresupuestoDetalle` (`201`) | `createBudget(data)` |
| `POST /presupuestos/{presupuesto_id}/versiones` | `POST /api/presupuestos/{presupuesto_id}/versiones` | Mecánico o Administrador | Path: `presupuesto_id: integer` | `NuevaVersion \| null` | `PresupuestoDetalle` (`201`) | `createBudgetVersion(budgetId, data?)` |
| `PUT /presupuestos/{presupuesto_id}/versiones/{numero}/items` | `PUT /api/presupuestos/{presupuesto_id}/versiones/{numero}/items` | Mecánico o Administrador | Path: `presupuesto_id: integer`, `numero: integer` | `ItemsVersion` | `VersionDetalle` (`200`) | `updateBudgetVersionItems(budgetId, versionNumber, data)` |
| `POST /presupuestos/{presupuesto_id}/versiones/{numero}/envio` | `POST /api/presupuestos/{presupuesto_id}/versiones/{numero}/envio` | Administrador | Path: `presupuesto_id: integer`, `numero: integer` | — | `ResultadoOperacion` (`200`) | `sendBudgetVersion(budgetId, versionNumber)` |
| `POST /presupuestos/{presupuesto_id}/versiones/{numero}/decision` | `POST /api/presupuestos/{presupuesto_id}/versiones/{numero}/decision` | Cliente propietario | Path: `presupuesto_id: integer`, `numero: integer` | `DecisionEntrada` | `ResultadoOperacion` (`201`) | `submitBudgetDecision(budgetId, versionNumber, data)` |

### 2.2 Esquemas principales de Presupuestos

- **`PaginaPresupuestos`** (`BudgetPageResponseDto`):
  - `total`: `integer`
  - `desde`: `integer`
  - `limite`: `integer`
  - `presupuestos`: `PresupuestoResumen[]`
- **`PresupuestoResumen`** (`BudgetSummaryResponseDto`):
  - `presupuesto_id`: `integer`
  - `orden_id`: `integer`
  - `creado_en`: `string (date-time)`
  - `cantidad_versiones`: `integer`
  - `ultima_version`: `integer`
  - `estado_ultima_version`: `'borrador' | 'enviada' | 'aprobada' | 'rechazada'`
  - `total_ultima_version`: `string` (decimal en texto, ej. `"29000.00"`)
  - `version_vigente`: `integer | null`
- **`PresupuestoDetalle`** (`BudgetDetailResponseDto`):
  - Extiende `PresupuestoResumen` y añade `versiones: VersionDetalle[]`.
- **`VersionDetalle`** (`BudgetVersionResponseDto`):
  - `numero`: `integer`, `estado`: `BudgetVersionStatus`, `es_modificacion`: `boolean`, `creado_por_id`: `integer`, `creado_en`: `string`, `enviado_en`: `string | null`, `bloqueada_en`: `string | null`, `total`: `string`, `items`: `ItemSalida[]`, `decision`: `DecisionSalida | null`.
- **`ItemEntrada`** (`BudgetItemInputDto`):
  - `tipo`: `'repuesto' | 'mano_de_obra'`
  - `descripcion`: `string` (`1..200`)
  - `cantidad`: `number | string` (`> 0`)
  - `precio_unitario?`: `number | string` (`>= 0`, por defecto `"0"`)
  - `repuesto_id?`: `integer | null`
- **`DecisionEntrada`** (`BudgetDecisionRequestDto`):
  - `decision`: `'aprobado' | 'rechazado'`
  - `motivo?`: `string | null` (obligatorio al rechazar)
  - `confirmar_cancelacion?`: `boolean` (obligatorio en `true` si se rechaza antes de la primera aprobación)

---

## 3. Contrato OpenAPI de Repuestos (`/repuestos`)

### 3.1 Endpoints disponibles

| Método y Ruta (MS3) | Ruta vía Gateway | Parámetros (Path / Query) | Body (Request) | Respuesta (`200`/`201`/`204`) | Método en `PartService` |
|---|---|---|---|---|---|
| `GET /repuestos` | `GET /api/repuestos` | Query: `proveedor_id?: int`, `q?: string`, `bajo_umbral?: boolean` (def. `false`), `con_stock?: boolean`, `ordenar?: 'nombre' \| 'stock_asc' \| 'stock_desc'` (def. `'nombre'`), `desde?: int` (def. `0`), `limite?: int` (def. `50`) | — | `PaginaRepuestos` | `getPartsPage(params?)` / `getParts(params?)` |
| `GET /repuestos/{repuesto_id}` | `GET /api/repuestos/{repuesto_id}` | Path: `repuesto_id: integer` | — | `RepuestoSalida` | `getPartById(id)` |
| `POST /repuestos` | `POST /api/repuestos` | — | `RepuestoCrear` | `RepuestoSalida` (`201`) | `createPart(data)` |
| `PATCH /repuestos/{repuesto_id}` | `PATCH /api/repuestos/{repuesto_id}` | Path: `repuesto_id: integer` | `RepuestoActualizar` | `RepuestoSalida` (`200`) | `updatePart(id, data)` |
| `DELETE /repuestos/{repuesto_id}` | `DELETE /api/repuestos/{repuesto_id}` | Path: `repuesto_id: integer` | — | `204 No Content` | `deletePart(id)` |

### 3.2 Esquemas principales de Repuestos

- **`RepuestoSalida`** (`PartResponseDto`):
  - `repuesto_id`: `integer`
  - `nombre`: `string`
  - `proveedor_id`: `integer`
  - `proveedor_nombre`: `string`
  - `proveedor_tipo_distribuidor?`: `'oficial' | 'generico'`
  - `stock`: `integer`
  - `umbral_particular`: `integer | null`
  - `umbral_efectivo`: `integer | null`
  - `bajo_umbral`: `boolean`
- **`PaginaRepuestos`** (`PartPageResponseDto`):
  - `total`: `integer`, `desde`: `integer`, `limite`: `integer`, `umbral_general`: `integer | null`, `repuestos`: `RepuestoSalida[]`.

---

## 4. Contrato OpenAPI de Proveedores (`/proveedores`)

### 4.1 Endpoints disponibles

| Método y Ruta (MS3) | Ruta vía Gateway | Parámetros (Path / Query) | Body (Request) | Respuesta (`200`/`201`/`204`) | Método en `ProviderService` |
|---|---|---|---|---|---|
| `GET /proveedores` | `GET /api/proveedores` | Query: `q?: string`, `con_repuestos?: boolean`, `tipo_distribuidor?: 'oficial' \| 'generico'`, `desde?: int` (def. `0`), `limite?: int` (def. `50`) | — | `PaginaProveedores` | `getProvidersPage(params?)` / `getProviders(params?)` |
| `GET /proveedores/{proveedor_id}` | `GET /api/proveedores/{proveedor_id}` | Path: `proveedor_id: integer` | — | `ProveedorDetalle` | `getProviderById(id)` |
| `POST /proveedores` | `POST /api/proveedores` | — | `ProveedorCrear` | `ProveedorSalida` (`201`) | `createProvider(data)` |
| `PATCH /proveedores/{proveedor_id}` | `PATCH /api/proveedores/{proveedor_id}` | Path: `proveedor_id: integer` | `ProveedorActualizar` | `ProveedorSalida` (`200`) | `updateProvider(id, data)` |
| `DELETE /proveedores/{proveedor_id}` | `DELETE /api/proveedores/{proveedor_id}` | Path: `proveedor_id: integer` | — | `204 No Content` | `deleteProvider(id)` |

### 4.2 Esquemas principales de Proveedores

- **`ProveedorSalida`** (`ProviderResponseDto`):
  - `proveedor_id`: `integer`
  - `nombre`: `string`
  - `contacto`: `string`
  - `tipo_distribuidor?`: `'oficial' | 'generico'`
  - `cantidad_repuestos`: `integer`
- **`ProveedorDetalle`** (`ProviderDetailResponseDto`):
  - Extiende `ProveedorSalida` e incluye `repuestos: RepuestoSalida[]`.
- **`PaginaProveedores`** (`ProviderPageResponseDto`):
  - `total`: `integer`, `desde`: `integer`, `limite`: `integer`, `proveedores`: `ProveedorSalida[]`.

