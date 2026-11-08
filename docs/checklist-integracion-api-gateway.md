# Checklist de integración móvil con la API Gateway

## Propósito y estado del contrato

Esta lista verifica la integración entre la aplicación móvil **TallerConnect** y la API Gateway (`https://tallerconect.vercel.app/api`), considerando las especificaciones OpenAPI publicadas por los microservicios (`/ms1/openapi.json`, `/ms2/openapi.json`, `/ms3/openapi.json`) y las restricciones del contrato multimedia (`docs/restricciones-evidencia-multimedia.md`).

## Datos compartidos de la Gateway

- [x] Recibir la URL de OpenAPI/Swagger y registrar su versión (`/ms1/openapi.json`, `/ms2/openapi.json`, `/ms3/openapi.json`).
- [x] Recibir las URLs base para desarrollo, pruebas y producción; confirmar HTTPS fuera del entorno local (`isSecureGatewayUrl` en `src/config/env.ts`).
- [x] La app permite configurar `EXPO_PUBLIC_API_URL`; normaliza automáticamente el sufijo `/api` mediante `normalizeGatewayBaseUrl` y `buildGatewayEndpointPath`.
- [x] Confirmar si `/api` forma parte de la URL base y evitar duplicarlo (`normalizeRequestConfig` deduplica `/api/...` en el interceptor de solicitud).
- [x] Confirmar autenticación requerida por operación, formato del encabezado `Authorization: Bearer <token>` y manejo de expiración (`401`/`403`).
- [x] Confirmar la forma común de errores, extracción de arreglos de validación FastAPI (`422` con `loc` y `msg`), códigos HTTP (`400`, `401`, `403`, `404`, `409`, `413`, `415`, `422`, `429`, `502`, `503`, `504`) y mensajes globales (`getGlobalErrorMessage`).
- [x] Confirmar límites de tiempo (`API_TIMEOUT_MS=15000`, `UPLOAD_TIMEOUT_MS=60000`, `PING_TIMEOUT_MS=5000`), paginación (`skip`, `limit`), filtros y formatos ISO 8601.

## Autenticación y usuarios (MS1)

- [x] Por defecto, la app envía correo y contraseña a `POST /auth/login` relativo a la URL base configurada. `EXPO_PUBLIC_USE_MOCK_AUTH=true` habilita cuentas demo.
- [x] La respuesta se transforma mediante DTO, mapper y esquema Zod antes de guardarse en Zustand.
- [x] La sesión móvil se persiste en SecureStore en iOS/Android; el almacenamiento web usa `localStorage`.
- [x] El cliente adjunta el token Bearer desde la sesión guardada; `GET /auth/me` está implementado para completar el login y validar `restoreSession()`.
- [x] Los interceptores notifican cierres de sesión ante `401`/`403` mediante `registerUnauthorizedHandler` y respetan `skipSessionLogoutOn403` cuando un endpoint tiene restricción puntual por rol.

## Vehículos y órdenes de trabajo (MS2)

- [x] Rutas oficiales implementadas en `VehiclesService` (`/vehiculos`, `/vehiculos/{id}`, `/vehiculos/asignados`) y `OrdersService` (`/ordenes`, `/ordenes/{id}`, `/ordenes/{id}/estado`, `/ordenes/{id}/mecanico`, `/ordenes/{id}/historial`).
- [x] DTOs, esquemas Zod (`vehicle-dto.schema.ts`, `order-dto.schema.ts`, `order-status-update.schema.ts`) y mappers (`vehicle.mapper.ts`, `order.mapper.ts`) alineados con `VehiculoRespuesta`, `OrdenRespuesta`, `CambioEstadoSolicitud` y `HistorialEstadoRespuesta`.
- [x] Operaciones cubiertas con manejo de errores de dominio (`normalizeVehicleServiceError`, `normalizeOrderServiceError`).

## Presupuestos, repuestos y proveedores (MS3)

- [x] Endpoints oficiales implementados en `BudgetsService` (`/presupuestos`, `/presupuestos/{id}`, `/presupuestos/{id}/aprobar`), `PartsService` (`/repuestos`, `/repuestos/{id}`, `/repuestos/{id}/ajustar-stock`) y `ProvidersService` (`/proveedores`, `/proveedores/{id}`).
- [x] DTOs, esquemas Zod (`budget-dto.schema.ts`, `part-dto.schema.ts`, `provider-dto.schema.ts`) y mappers (`budget.mapper.ts`, `part.mapper.ts`, `provider.mapper.ts`) alineados con `/ms3/openapi.json`.
- [x] Soporte para parámetros de consulta (`orden_id`, `estado`, `solo_activos`, `search`, `lowStockOnly`, `skip`, `limit`), aprobación/rechazo con motivo y ajuste de stock.

## Evidencia multimedia (MS4)

- [x] Endpoints implementados en `EvidenceService` (`GET /ordenes/{id}/evidencias`, `GET /evidencias/{id}`, `POST /evidencias`, `DELETE /evidencias/{id}`).
- [x] Construcción de solicitudes `multipart/form-data` hacia la API Gateway (`buildEvidenceFormData`), validación de restricciones de tipo MIME, tamaño máximo y campos obligatorios (`validateEvidenceFileConstraints`, `validateUploadEvidenceRequest` en `src/constants/evidence.ts`).
- [x] Manejo de permisos de cámara y galería (`useMediaPermissions`) y reporte de progreso de subida (`onUploadProgress`).

## Avisos y notificaciones

- [x] Servicio `NotificationsService` (`src/services/notifications.service.ts`) implementado con soporte para el contrato `/notificaciones` cuando está habilitado (`EXPO_PUBLIC_ENABLE_NOTIFICATIONS_API=true`) y derivación operativa automática (`deriveWorkshopNotificationsFromDomain`) desde órdenes, presupuestos pendientes y alertas de bajo stock cuando el contrato aún no está publicado (`404`/`501`).

## Cambios requeridos en la app por contrato

- [x] El cliente HTTP (`src/services/api/client.ts`) centraliza la URL base, `httpClient` tipado (`get`, `post`, `put`, `patch`, `delete`, `postMultipart`), encabezados y timeouts diferenciados.
- [x] El interceptor adjunta Bearer a solicitudes protegidas, deduplica el prefijo `/api`, elimina `Content-Type: application/json` en envíos `FormData` y reporta fallos de red/gateway a `useConnectivityStore`.
- [x] Se normalizan errores HTTP, arreglos de validación `422`, timeouts y conectividad global (`src/services/service-error.ts`).
- [x] Existen DTOs, schemas Zod de entrada/salida y mappers por cada dominio (MS1, MS2, MS3, MS4 y Avisos).
- [x] Los adaptadores simulados (`Mock*Adapter`) e integrados (`Real*Adapter`) son intercambiables en todos los servicios (`useMockAdapter()`, `useRealAdapter()`, `resetMocks()`).

## Registro de validación

| Fecha | Versión/commit OpenAPI | Entorno Gateway | Responsable API | Responsable móvil | Resultado/notas |
| --- | --- | --- | --- | --- | --- |
| 2026-11-03 | MS1, MS2, MS3 OpenAPI v1 + MS4 Multimedia | `https://tallerconect.vercel.app/api` | Equipo Backend (MS1–MS4) | Equipo Móvil (Integración Semana 4) | Cobertura completa de servicios, cliente HTTP, interceptores, conectividad y panel administrador verificada con suite Jest. |
