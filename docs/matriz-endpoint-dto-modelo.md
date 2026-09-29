# Matriz endpoint → DTO → modelo

Esta matriz muestra, para cada endpoint del contrato y para cada endpoint que llama la app, la cadena que recorre el dato: la función de la app que lo llama, el DTO de solicitud y de respuesta, el mapper y el modelo resultante. El estado indica si esa cadena coincide con el contrato verificado contra producción (`/ms1/openapi.json` y `/ms2/openapi.json`).

## Estados

| Estado | Significado |
|---|---|
| **Alineado** | El endpoint existe, y el DTO y el mapper reflejan el contrato |
| **Desalineado** | El endpoint existe, pero el DTO, el cuerpo enviado o el mapper no coinciden con el contrato |
| **No existe en el contrato** | La app llama a un endpoint que el contrato no define |
| **Sin uso en la app** | El endpoint existe en el contrato, pero la app no lo llama |

## Autenticación (MS1)

| Método y endpoint | Función de la app | DTO de solicitud | DTO de respuesta | Mapper | Modelo | Estado |
|---|---|---|---|---|---|---|
| `POST /api/auth/login` | `login()` (`auth.service.ts`) | Objeto con `email` y `password` (forma de `LoginRequestDto`) | `LoginResponseDto` | `mapLoginResponse` | `AuthResponse` | Alineado |
| `GET /api/auth/me` | `getCurrentUser()`, y como respaldo dentro de `login()` | — | `UserResponseDto` | `mapUserResponse` | `User` | Alineado |
| `POST /api/auth/register` | — | `RegisterRequestDto` | `UserResponseDto` | — | — | Sin uso en la app |

## Vehículos (MS2)

| Método y endpoint | Función de la app | DTO de solicitud | DTO de respuesta | Mapper | Modelo | Estado |
|---|---|---|---|---|---|---|
| `GET /api/vehiculos` | `getVehicles()` (`vehicles.service.ts`) | — | `VehicleResponseDto[]` | `mapVehiclesResponseList` | `Vehicle[]` | Desalineado |
| `GET /api/vehiculos/{vehiculo_id}` | `getVehicleById()` | — | `VehicleResponseDto` | `mapVehicleResponse` | `Vehicle` | Desalineado |
| `POST /api/vehiculos` | `createVehicle()` | `CreateVehicleRequestDto` | `VehicleResponseDto` | `mapVehicleResponse` | `Vehicle` | Desalineado |
| `PATCH /api/vehiculos/{vehiculo_id}` | — | — | — | — | — | Sin uso en la app |
| `GET /api/vehiculos/mios` | `getMyVehicles()` | — | `VehicleResponseDto[]` | `mapVehiclesResponseList` | `Vehicle[]` | No existe en el contrato |
| `GET /api/vehiculos/asignados` | `getAssignedVehicles()` | — | `VehicleResponseDto[]` | `mapVehiclesResponseList` | `Vehicle[]` | No existe en el contrato |

**Observaciones:**
- `VehicleResponseDto` declara todos sus campos como opcionales y acepta nombres que el contrato no usa (`id`, `patent`, `license_plate`, `plate`, `brand`, `model`, `year`, `mileage`, `client_id`, `owner_id`). El contrato (`VehiculoRespuesta`) define `vehiculo_id`, `patente`, `marca`, `modelo`, `anio` y `kilometraje`, todos obligatorios.
- `createVehicle()` envía `patent`, `patente`, `brand`, `model`, `year` y `mileage`. El contrato (`VehiculoCrear`) admite `patente`, `marca` y `modelo` como obligatorios y `anio` y `kilometraje` como opcionales, y no admite campos adicionales.
- `GET /api/vehiculos` solo responde al rol cliente; mecánico y administrador reciben 403.
- `GET /api/vehiculos/mios` responde 422, porque el backend interpreta `mios` como `vehiculo_id`.

## Órdenes de trabajo (MS2)

| Método y endpoint | Función de la app | DTO de solicitud | DTO de respuesta | Mapper | Modelo | Estado |
|---|---|---|---|---|---|---|
| `GET /api/ordenes` | `getOrders()` (`orders.service.ts`) | — | `OrderResponseDto[]` | `mapOrdersResponseList` | `WorkOrder[]` | Desalineado |
| `GET /api/ordenes/{orden_id}` | `getOrderById()` | — | `OrderResponseDto` | `mapOrderResponse` | `WorkOrder` | Desalineado |
| `POST /api/ordenes` | `createOrder()` | `CreateOrderRequestDto` | `OrderResponseDto` | `mapOrderResponse` | `WorkOrder` | Desalineado |
| `PUT /api/ordenes/{orden_id}/mecanico` | — | — | — | — | — | Sin uso en la app |
| `PATCH /api/ordenes/{id}/status` | `updateOrderStatus()` | `UpdateOrderStatusRequestDto` | `OrderResponseDto` | `mapOrderResponse` | `WorkOrder` | No existe en el contrato |

**Observaciones:**
- `OrderResponseDto` declara todos sus campos como opcionales y acepta nombres que el contrato no usa (`id`, `vehicle_id`, `client_id`, `status`, `description`, etc.). El contrato (`OrdenRespuesta`) define `orden_id`, `vehiculo_id`, `ingreso_id`, `estado_codigo`, `mecanico_actual_id`, `creado_por_id`, `creado_en` y `actualizado_en`, todos obligatorios.
- `mapOrderResponse` convierte `estado_codigo` con un catálogo propio (`CODE_TO_STATUS`). El contrato no publica qué estado representa cada código.
- Cuando la respuesta no trae un dato, `mapOrderResponse` asigna valores propios: `clientId` se toma de `creado_por_id` o queda como `'1'`, y las fechas faltantes quedan como `1970-01-01T00:00:00.000Z`.
- `createOrder()` envía `vehiculo_id` como texto, junto con `vehicle_id`, `cliente_id`, `client_id` y `description`. El contrato (`OrdenCrear`) solo admite `vehiculo_id`, como entero, y exige el rol administrador.

## Resumen

| Estado | Cantidad | Endpoints |
|---|---|---|
| Alineado | 2 | Login y `/auth/me` |
| Desalineado | 6 | Consulta y creación de vehículos y órdenes |
| No existe en el contrato | 3 | `/vehiculos/mios`, `/vehiculos/asignados` y `PATCH /ordenes/{id}/status` |
| Sin uso en la app | 3 | Registro, edición de vehículo y asignación de mecánico |