# Matriz endpoint → DTO → modelo (Cobertura completa MS1–MS4 y Avisos)

Esta matriz documenta, para cada endpoint publicado por los microservicios a través de la API Gateway (`https://tallerconect.vercel.app/api`) y consumido por la app móvil, toda la cadena de transformación de datos: función del servicio en `src/services/`, DTO de entrada y salida en `src/dto/`, esquema Zod en `src/schemas/`, mapper en `src/mappers/` y modelo de dominio en `src/models/`.

## Estados de cobertura

| Estado | Significado |
|---|---|
| **Alineado** | El endpoint del contrato está cubierto por el servicio, DTO, schema Zod, mapper y modelo de dominio |
| **Fallback / Opcional** | El servicio soporta el contrato dedicado si está publicado y aplica derivación local o respaldo cuando aún no está habilitado |
| **Sin uso en la app** | El endpoint existe en el contrato del microservicio pero no forma parte del flujo móvil actual |

---

## 1. Autenticación y Sesión (MS1 — `/ms1/openapi.json`)

| Método y endpoint | Servicio / Método | DTO de solicitud | DTO de respuesta | Mapper / Schema | Modelo | Estado |
|---|---|---|---|---|---|---|
| `POST /api/auth/login` | `AuthService.login()` (`auth.service.ts`) | `LoginRequestDto` (`email`, `password`) | `LoginResponseDto` | `mapLoginResponse` / `loginResponseDtoSchema` | `AuthResponse` | **Alineado** |
| `GET /api/auth/me` | `AuthService.getCurrentUser()` (`auth.service.ts`) | — | `UserResponseDto` | `mapUserResponse` / `userResponseDtoSchema` | `User` | **Alineado** |
| `POST /api/auth/register` | — | `RegisterRequestDto` | `UserResponseDto` | — | — | Sin uso en la app |

---

## 2. Vehículos y Órdenes de Trabajo (MS2 — `/ms2/openapi.json`)

### Vehículos (`/api/vehiculos`)

| Método y endpoint | Servicio / Método | DTO de solicitud | DTO de respuesta | Mapper / Schema | Modelo | Estado |
|---|---|---|---|---|---|---|
| `GET /api/vehiculos` | `vehiclesService.getVehicles()` / `getMyVehicles()` (`vehicles.service.ts`) | `VehicleQueryParamsDto` | `VehicleResponseDto[]` | `mapVehiclesResponseList` / `vehicleResponseDtoSchema` | `Vehicle[]` | **Alineado** |
| `GET /api/vehiculos/{vehiculo_id}` | `vehiclesService.getVehicleById()` | — | `VehicleResponseDto` | `mapVehicleResponse` / `vehicleResponseDtoSchema` | `Vehicle` | **Alineado** |
| `POST /api/vehiculos` | `vehiclesService.createVehicle()` | `CreateVehicleRequestDto` | `VehicleResponseDto` | `mapVehicleResponse` / `vehicleResponseDtoSchema` | `Vehicle` | **Alineado** |
| `PATCH /api/vehiculos/{vehiculo_id}` | `vehiclesService.updateVehicle()` | `UpdateVehicleRequestDto` (`VehiculoActualizar`) | `VehicleResponseDto` | `mapVehicleResponse` / `vehicleResponseDtoSchema` | `Vehicle` | **Alineado** |
| `GET /api/vehiculos/asignados` | `vehiclesService.getAssignedVehicles()` | `VehicleQueryParamsDto` | `VehicleResponseDto[]` | `mapVehiclesResponseList` | `Vehicle[]` | **Fallback / Opcional** |

### Órdenes de Trabajo (`/api/ordenes`)

| Método y endpoint | Servicio / Método | DTO de solicitud | DTO de respuesta | Mapper / Schema | Modelo | Estado |
|---|---|---|---|---|---|---|
| `GET /api/ordenes` | `ordersService.getOrders()` (`orders.service.ts`) | `OrderQueryParamsDto` | `OrderResponseDto[]` | `mapOrdersResponseList` / `orderResponseDtoSchema` | `WorkOrder[]` | **Alineado** |
| `GET /api/ordenes/{orden_id}` | `ordersService.getOrderById()` | `OrderDetailQueryParamsDto` (`solo_propietario`) | `OrderResponseDto` | `mapOrderResponse` / `orderResponseDtoSchema` | `WorkOrder` | **Alineado** |
| `POST /api/ordenes` | `ordersService.createOrder()` | `CreateOrderRequestDto` (`OrdenCrear`) | `OrderResponseDto` | `mapOrderResponse` / `orderResponseDtoSchema` | `WorkOrder` | **Alineado** |
| `PATCH /api/ordenes/{orden_id}/estado` | `ordersService.updateOrderStatus()` | `UpdateOrderStatusRequestDto` (`CambioEstadoSolicitud`: `estado_destino`, `observacion`) | `OrderResponseDto` | `mapOrderStatusUpdateRequest` + `mapOrderResponse` | `WorkOrder` | **Alineado** |
| `PUT /api/ordenes/{orden_id}/mecanico` | `ordersService.assignMechanic()` | `AssignMechanicRequestDto` (`AsignacionMecanicoActualizar`) | `OrderResponseDto` | `mapOrderResponse` | `WorkOrder` | **Alineado** |
| `GET /api/ordenes/{orden_id}/historial` | `ordersService.getOrderHistory()` | — | `OrderHistoryEntryDto[]` | `orderHistoryEntryDtoSchema` | `OrderHistoryEntryDto[]` | **Alineado** |

---

## 3. Presupuestos, Repuestos y Proveedores (MS3 — `/ms3/openapi.json`)

### Presupuestos (`/api/presupuestos`)

| Método y endpoint | Servicio / Método | DTO de solicitud | DTO de respuesta | Mapper / Schema | Modelo | Estado |
|---|---|---|---|---|---|---|
| `GET /api/presupuestos` | `budgetsService.getBudgets()` (`budgets.service.ts`) | `BudgetQueryParamsDto` (`orden_id`, `estado`, `skip`, `limit`) | `BudgetResponseDto[]` | `mapBudgetsResponseList` / `budgetResponseDtoSchema` | `Budget[]` | **Alineado** |
| `GET /api/presupuestos/{presupuesto_id}` | `budgetsService.getBudgetById()` / `getBudgetByOrderId()` | — | `BudgetResponseDto` | `mapBudgetResponse` / `budgetResponseDtoSchema` | `Budget` | **Alineado** |
| `POST /api/presupuestos` | `budgetsService.createBudget()` | `CreateBudgetRequestDto` (`PresupuestoCreate`) | `BudgetResponseDto` | `mapBudgetResponse` | `Budget` | **Alineado** |
| `PATCH /api/presupuestos/{presupuesto_id}` | `budgetsService.updateBudget()` | `UpdateBudgetRequestDto` (`PresupuestoUpdate`) | `BudgetResponseDto` | `mapBudgetResponse` | `Budget` | **Alineado** |
| `POST /api/presupuestos/{presupuesto_id}/aprobar` | `budgetsService.approveBudget()` / `updateBudgetStatus()` | `BudgetDecisionRequestDto` (`AprobacionRequest`: `aprobado`, `motivo`) | `BudgetDecisionResponseDto` | `mapBudgetResponse` | `Budget` | **Alineado** |

### Repuestos (`/api/repuestos`)

| Método y endpoint | Servicio / Método | DTO de solicitud | DTO de respuesta | Mapper / Schema | Modelo | Estado |
|---|---|---|---|---|---|---|
| `GET /api/repuestos` | `partsService.getParts()` (`parts.service.ts`) | `PartQueryParamsDto` (`solo_activos`, `search`, `providerId`, `lowStockOnly`, `skip`, `limit`) | `PartResponseDto[]` | `mapPartsResponseList` / `partResponseDtoSchema` | `Part[]` | **Alineado** |
| `GET /api/repuestos/{repuesto_id}` | `partsService.getPartById()` | — | `PartResponseDto` | `mapPartResponse` / `partResponseDtoSchema` | `Part` | **Alineado** |
| `POST /api/repuestos` | `partsService.createPart()` | `CreatePartRequestDto` (`RepuestoCreate`) | `PartResponseDto` | `mapPartResponse` | `Part` | **Alineado** |
| `PATCH /api/repuestos/{repuesto_id}` | `partsService.updatePart()` | `UpdatePartRequestDto` (`RepuestoUpdate`) | `PartResponseDto` | `mapPartResponse` | `Part` | **Alineado** |
| `POST /api/repuestos/{repuesto_id}/ajustar-stock` | `partsService.adjustStock()` / `consumePartStock()` | `StockAdjustmentRequestDto` (`AjusteStockRequest`: `cantidad`, `motivo`) | `PartResponseDto` | `mapPartResponse` | `Part` | **Alineado** |

### Proveedores (`/api/proveedores`)

| Método y endpoint | Servicio / Método | DTO de solicitud | DTO de respuesta | Mapper / Schema | Modelo | Estado |
|---|---|---|---|---|---|---|
| `GET /api/proveedores` | `providersService.getProviders()` (`providers.service.ts`) | `ProviderQueryParamsDto` (`solo_activos`, `search`, `skip`, `limit`) | `ProviderResponseDto[]` | `mapProvidersResponseList` / `providerResponseDtoSchema` | `Provider[]` | **Alineado** |
| `GET /api/proveedores/{proveedor_id}` | `providersService.getProviderById()` | — | `ProviderResponseDto` | `mapProviderResponse` / `providerResponseDtoSchema` | `Provider` | **Alineado** |
| `POST /api/proveedores` | `providersService.createProvider()` | `CreateProviderRequestDto` (`ProveedorCreate`) | `ProviderResponseDto` | `mapProviderResponse` | `Provider` | **Alineado** |
| `PATCH /api/proveedores/{proveedor_id}` | `providersService.updateProvider()` | `UpdateProviderRequestDto` (`ProveedorUpdate`) | `ProviderResponseDto` | `mapProviderResponse` | `Provider` | **Alineado** |
| `DELETE /api/proveedores/{proveedor_id}` | `providersService.deleteProvider()` | — | `204 No Content` | — | `void` | **Alineado** |

---

## 4. Evidencia Multimedia (MS4 — `/api/evidencias`)

| Método y endpoint | Servicio / Método | DTO de solicitud | DTO de respuesta | Mapper / Schema | Modelo | Estado |
|---|---|---|---|---|---|---|
| `GET /api/ordenes/{orden_id}/evidencias` (y fallback `GET /api/evidencias`) | `evidenceService.getEvidencesByOrderId()` (`evidence.service.ts`) | `EvidenceQueryParamsDto` | `EvidenceResponseDto[]` | `mapEvidencesResponseList` / `evidenceResponseDtoSchema` | `TechnicalEvidence[]` | **Alineado** |
| `GET /api/evidencias/{evidencia_id}` | `evidenceService.getEvidenceById()` | — | `EvidenceResponseDto` | `mapEvidenceResponse` / `evidenceResponseDtoSchema` | `TechnicalEvidence` | **Alineado** |
| `POST /api/evidencias` (`multipart/form-data`) | `evidenceService.uploadEvidence()` | `UploadEvidenceRequestDto` (`FormData` vía `buildEvidenceFormData`) | `EvidenceResponseDto` | `mapEvidenceResponse` / `evidenceResponseDtoSchema` | `TechnicalEvidence` | **Alineado** |
| `DELETE /api/evidencias/{evidencia_id}` | `evidenceService.deleteEvidence()` | — | `204 No Content` | — | `void` | **Alineado** |

---

## 5. Avisos y Notificaciones (`/api/notificaciones` + Derivación Operativa)

| Método y endpoint | Servicio / Método | DTO de solicitud | DTO de respuesta | Mapper / Schema | Modelo | Estado |
|---|---|---|---|---|---|---|
| `GET /api/notificaciones` (o derivación desde MS2/MS3) | `notificationsService.getNotifications()` / `getUnreadCount()` (`notifications.service.ts`) | `NotificationQueryParamsDto` | `NotificationResponseDto[]` | `mapNotificationsResponseList` + `deriveWorkshopNotificationsFromDomain` / `notificationResponseDtoSchema` | `WorkshopNotification[]` | **Fallback / Opcional** |
| `PATCH /api/notificaciones/{id}/leida` | `notificationsService.markAsRead()` | `{ leida: true }` | `NotificationResponseDto` | `mapNotificationResponse` | `WorkshopNotification` | **Fallback / Opcional** |
| `POST /api/notificaciones/leer-todas` | `notificationsService.markAllAsRead()` | `{}` | `MarkNotificationReadResponseDto` | — | `number` | **Fallback / Opcional** |

---

## Resumen de cobertura

| Microservicio / Dominio | Endpoints cubiertos | Servicios asociados | Estado general |
|---|---|---|---|
| **MS1 — Autenticación** | `POST /auth/login`, `GET /auth/me` | `AuthService` | **100 % Alineado** |
| **MS2 — Vehículos y Órdenes** | `GET/POST/PATCH /vehiculos`, `GET/POST /ordenes`, `PATCH /ordenes/{id}/estado`, `PUT /ordenes/{id}/mecanico`, `GET /ordenes/{id}/historial` | `VehiclesService`, `OrdersService` | **100 % Alineado** |
| **MS3 — Presupuestos, Repuestos y Proveedores** | `GET/POST/PATCH /presupuestos`, `POST /presupuestos/{id}/aprobar`, `GET/POST/PATCH /repuestos`, `POST /repuestos/{id}/ajustar-stock`, `GET/POST/PATCH/DELETE /proveedores` | `BudgetsService`, `PartsService`, `ProvidersService` | **100 % Alineado** |
| **MS4 — Evidencia Multimedia** | `GET /ordenes/{id}/evidencias`, `GET/POST/DELETE /evidencias` (`multipart/form-data`) | `EvidenceService` | **100 % Alineado** |
| **Avisos / Notificaciones** | `GET/PATCH/POST /notificaciones` con fallback derivado de órdenes, presupuestos y stock | `NotificationsService` | **Cubierto con Fallback** |

---

## Nota de validacion de integracion (05-11-2026)

El estado 'Alineado' refleja la matriz de contratos y codigo; no implica que todos los endpoints esten validados contra produccion.

MS4 mantiene una incidencia de almacenamiento (GET /ms4/health/storage: HTTP 503). La consulta real de evidencias requiere validacion posterior.
