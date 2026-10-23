# Contratos OpenAPI de Vehículos y Órdenes de Trabajo (MS2)

Este documento estudia el contrato OpenAPI 3.1 publicado por el microservicio **SGTM — MS2: Vehículos y Órdenes de Trabajo** (`/ms2/openapi.json`) y define su correspondencia con los DTOs, parámetros de consulta y métodos tipados de `VehicleService` y `OrderService` en la aplicación móvil.

---

## 1. Seguridad y Autenticación en MS2

Todos los endpoints de negocio de MS2 exigen el esquema de seguridad `HTTPBearer` (`Authorization: Bearer <access_token>`). El backend resuelve la identidad y el rol del usuario autenticado (`cliente`, `mecanico`, `administrador`) directamente desde los claims del JWT.

| Código HTTP | Significado en el contrato MS2 |
|---|---|
| `200` / `201` | Operación exitosa (`201` en creaciones `POST`) |
| `401` | JWT ausente, inválido o expirado (`{"detail": "No autenticado"}`) |
| `403` | El rol del usuario autenticado no tiene permiso para la operación |
| `404` | Recurso inexistente o ajeno a la visibilidad del usuario |
| `409` | Conflicto de negocio (patente duplicada, transición inválida, cupo agotado o estado terminal) |
| `422` | Error de validación de esquema o parámetros (`HTTPValidationError`) |
| `500` / `503` | Error de persistencia local (`500`) o de comunicación con otro microservicio (`503`) |

---

## 2. Contrato OpenAPI de Vehículos

### 2.1 Endpoints disponibles

| Método y Ruta (MS2) | Ruta vía Gateway | Rol requerido | Parámetros (Path / Query) | Body (Request) | Respuesta (`200`/`201`) | Método en `VehiclesService` |
|---|---|---|---|---|---|---|
| `GET /vehiculos` | `GET /api/vehiculos` | Cliente o Administrador | Filtros opcionales (`VehicleQueryParamsDto`) | — | `VehiculoRespuesta[]` | `getVehicles(params?)` / `getMyVehicles(params?)` |
| `GET /vehiculos/asignados` | `GET /api/vehiculos/asignados` | Mecánico | Filtros opcionales (`VehicleQueryParamsDto`) | — | `VehiculoRespuesta[]` | `getAssignedVehicles(params?)` |
| `GET /vehiculos/{vehiculo_id}` | `GET /api/vehiculos/{vehiculo_id}` | Autenticado (según visibilidad) | Path: `vehiculo_id: integer` | — | `VehiculoRespuesta` | `getVehicleById(id)` |
| `POST /vehiculos` | `POST /api/vehiculos` | Cliente | — | `VehiculoCrear` | `VehiculoRespuesta` (`201`) | `createVehicle(data)` |
| `PATCH /vehiculos/{vehiculo_id}` | `PATCH /api/vehiculos/{vehiculo_id}` | Cliente | Path: `vehiculo_id: integer` | `VehiculoActualizar` | `VehiculoRespuesta` | `updateVehicle(id, data)` |

### 2.2 Esquemas de Vehículos en OpenAPI

#### `VehiculoRespuesta` (Respuesta)
Todos los campos están declarados como `required` en el contrato:
- `vehiculo_id`: `integer`
- `cliente_id`: `integer`
- `patente`: `string`
- `marca`: `string`
- `modelo`: `string`
- `anio`: `integer | null`
- `kilometraje`: `integer | null`

#### `VehiculoCrear` (`POST /vehiculos`, `additionalProperties: false`)
- `patente`: `string` (`minLength: 1`, obligatorio)
- `marca`: `string` (`minLength: 1`, `maxLength: 60`, obligatorio)
- `modelo`: `string` (`minLength: 1`, `maxLength: 60`, obligatorio)
- `anio`: `integer | null` (opcional)
- `kilometraje`: `integer | null` (opcional)

> **Nota del contrato:** La identidad del propietario (`cliente_id`) no se envía en el body; MS2 la resuelve desde el JWT del cliente autenticado.

#### `VehiculoActualizar` (`PATCH /vehiculos/{vehiculo_id}`, `additionalProperties: false`)
- `marca`: `string | null` (`minLength: 1`, `maxLength: 60`, opcional)
- `modelo`: `string | null` (`minLength: 1`, `maxLength: 60`, opcional)
- `anio`: `integer | null` (opcional)
- `kilometraje`: `integer | null` (opcional)

---

## 3. Contrato OpenAPI de Órdenes de Trabajo

### 3.1 Endpoints principales consumidos por la app móvil

| Método y Ruta (MS2) | Ruta vía Gateway | Rol requerido | Parámetros (Path / Query) | Body (Request) | Respuesta (`200`/`201`) | Método en `OrdersService` |
|---|---|---|---|---|---|---|
| `GET /ordenes` | `GET /api/ordenes` | Cliente, Mecánico o Admin (según alcance) | Filtros opcionales (`OrderQueryParamsDto`) | — | `OrdenRespuesta[]` | `getOrders(params?)` |
| `GET /ordenes/{orden_id}` | `GET /api/ordenes/{orden_id}` | Autenticado (según visibilidad) | Path: `orden_id: integer`<br>Query: `solo_propietario?: boolean` | — | `OrdenRespuesta` | `getOrderById(id, params?)` |
| `POST /ordenes` | `POST /api/ordenes` | Administrador | — | `OrdenCrear` | `OrdenRespuesta` (`201`) | `createOrder(data)` |
| `PATCH /ordenes/{orden_id}/estado` | `PATCH /api/ordenes/{orden_id}/estado` | Administrador o Mecánico asignado | Path: `orden_id: integer` | `CambioEstadoSolicitud` | `OrdenRespuesta` | `updateOrderStatus(id, status, options?)` |
| `PUT /ordenes/{orden_id}/mecanico` | `PUT /api/ordenes/{orden_id}/mecanico` | Administrador | Path: `orden_id: integer` | `AsignacionMecanicoActualizar` | `OrdenRespuesta` | `assignMechanic(id, data)` |
| `GET /ordenes/{orden_id}/historial` | `GET /api/ordenes/{orden_id}/historial` | Autenticado (según visibilidad) | Path: `orden_id: integer` | — | `HistorialEstadoRespuesta[]` | `getOrderHistory(id)` |

### 3.2 Esquemas de Órdenes en OpenAPI

#### `OrdenRespuesta` (Respuesta)
Todos los campos son `required`:
- `orden_id`: `integer`
- `vehiculo_id`: `integer`
- `ingreso_id`: `integer`
- `estado_codigo`: `integer` (ver catálogo oficial abajo)
- `mecanico_actual_id`: `integer | null`
- `creado_por_id`: `integer`
- `creado_en`: `string` (`date-time`)
- `actualizado_en`: `string` (`date-time`)

#### Catálogo oficial de `estado_codigo` en MS2
El esquema `OrdenRespuesta` documenta la correspondencia oficial de `estado_codigo`:

| `estado_codigo` (MS2) | Significado en el contrato MS2 | `WorkOrderStatus` en la app móvil |
|---|---|---|
| `1` | Recibido | `recibido` |
| `2` | Esperando diagnóstico | `esperando_diagnostico` |
| `3` | Esperando aprobación de presupuesto | `esperando_aprobacion_presupuesto` |
| `4` | Esperando repuestos | `esperando_repuestos` |
| `5` | En reparación | `en_reparacion` |
| `6` | Listo | `listo_para_entrega` |
| `7` | Entregado | `entregado` |
| `8` | Cancelado | `cancelado` |

#### `OrdenCrear` (`POST /ordenes`, `additionalProperties: false`)
- `vehiculo_id`: `integer` (`exclusiveMinimum: 0`, obligatorio)

#### `CambioEstadoSolicitud` (`PATCH /ordenes/{orden_id}/estado`, `additionalProperties: false`)
- `estado_destino`: `integer` (`exclusiveMinimum: 0`, obligatorio)
- `observacion`: `string | null` (opcional; obligatorio al pasar a Cancelado)

#### `AsignacionMecanicoActualizar` (`PUT /ordenes/{orden_id}/mecanico`, `additionalProperties: false`)
- `mecanico_id`: `integer` (`exclusiveMinimum: 0`, obligatorio)
- `observacion`: `string | null` (opcional)

#### `HistorialEstadoRespuesta` (`GET /ordenes/{orden_id}/historial`)
- `historial_id`: `integer`
- `orden_id`: `integer`
- `estado_anterior`: `integer | null`
- `estado_nuevo`: `integer`
- `actor_usuario_id`: `integer | null`
- `origen`: `'usuario' | 'sistema'`
- `fecha_hora`: `string` (`date-time`)
- `observacion`: `string | null`

---

## 4. Parámetros de consulta tipados en la capa de servicios

Para ofrecer filtrado consistente tanto con el adaptador HTTP real como con el adaptador simulado (mock), se definen los siguientes tipos de parámetros de consulta:

- **`VehicleQueryParamsDto`** (`src/dto/vehicle.dto.ts`):
  - `cliente_id?: number | string` / `ownerId?: string` (filtrar por propietario)
  - `patente?: string` / `plate?: string` (búsqueda exacta o parcial por patente)
  - `marca?: string` / `brand?: string` (filtrar por marca)
  - `modelo?: string` / `model?: string` (filtrar por modelo)
  - `skip?: number` y `limit?: number` (paginación)
- **`OrderQueryParamsDto`** (`src/dto/order.dto.ts`):
  - `vehiculo_id?: number | string` / `vehicleId?: string` (filtrar por vehículo)
  - `cliente_id?: number | string` / `clientId?: string` (filtrar por cliente)
  - `mecanico_actual_id?: number | string` / `assignedMechanicId?: string` (filtrar por mecánico asignado)
  - `estado_codigo?: number` / `status?: WorkOrderStatus` (filtrar por estado)
  - `solo_propietario?: boolean` (parámetro oficial de `GET /ordenes/{orden_id}`)
  - `skip?: number` y `limit?: number` (paginación)
- **`OrderDetailQueryParamsDto`** (`src/dto/order.dto.ts`):
  - `solo_propietario?: boolean` (verifica propiedad del cliente en `GET /ordenes/{orden_id}`)
