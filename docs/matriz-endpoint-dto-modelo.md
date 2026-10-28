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
| `GET /api/vehiculos` | `getVehicles()` y `getMyVehicles()` (`vehicles.service.ts`) | — | `VehicleResponseDto[]` | `mapVehiclesResponseList` | `Vehicle[]` | Alineado |
| `GET /api/vehiculos/{vehiculo_id}` | `getVehicleById()` | — | `VehicleResponseDto` | `mapVehicleResponse` | `Vehicle` | Alineado |
| `POST /api/vehiculos` | `createVehicle()` | `CreateVehicleRequestDto` → `VehicleCreatePayloadDto` | `VehicleResponseDto` | `mapVehicleResponse` | `Vehicle` | Alineado |
| `PATCH /api/vehiculos/{vehiculo_id}` | `updateVehicle()` (sin pantalla) | `UpdateVehicleRequestDto` | `VehicleResponseDto` | `mapVehicleResponse` | `Vehicle` | Alineado |
| `GET /api/vehiculos/asignados` | `getAssignedVehicles()` | — | `VehicleResponseDto[]` | `mapVehiclesResponseList` | `Vehicle[]` | Alineado (rol Mecánico) |

**Observaciones:**
- `VehicleResponseDto` declara los campos obligatorios de `VehiculoRespuesta`. `mapVehicleResponse` sigue aceptando, solo como compatibilidad de lectura, nombres anteriores (`patent`, `brand`, etc.) y rechaza respuestas incompletas.
- `createVehicle()` acepta alias internos (`plate`, `brand`, `model`, `year`, `mileage`), pero `buildCreateVehiclePayload()` envía exactamente `VehiculoCrear`: `patente`, `marca` y `modelo` obligatorios y `anio` y `kilometraje` opcionales, sin campos adicionales ni `owner_id` (MS2 lo toma del JWT).
- `GET /api/vehiculos` solo responde al rol cliente; mecánico y administrador reciben 403.

## Órdenes de trabajo (MS2)

| Método y endpoint | Función de la app | DTO de solicitud | DTO de respuesta | Mapper | Modelo | Estado |
|---|---|---|---|---|---|---|
| `GET /api/ordenes` | `getOrders()` (`orders.service.ts`) | — | `OrderResponseDto[]` | `mapOrdersResponseList` | `WorkOrder[]` | Alineado |
| `GET /api/ordenes/{orden_id}` | `getOrderById()` | — | `OrderResponseDto` | `mapOrderResponse` | `WorkOrder` | Alineado |
| `POST /api/ordenes` | `createOrder()` (sin pantalla) | `CreateOrderRequestDto` → `{ vehiculo_id }` | `OrderResponseDto` | `mapOrderResponse` | `WorkOrder` | Alineado |
| `PUT /api/ordenes/{orden_id}/mecanico` | `assignMechanic()` (sin pantalla) | `AssignMechanicRequestDto` | `OrderResponseDto` | `mapOrderResponse` | `WorkOrder` | Sin uso en pantallas |
| `PATCH /api/ordenes/{orden_id}/estado` | `updateOrderStatus()` (sin pantalla) | `UpdateOrderStatusRequestDto` (`CambioEstadoSolicitud`) | `OrderResponseDto` | `mapOrderResponse` | `WorkOrder` | Alineado |

**Observaciones:**
- `OrderResponseDto` declara los ocho campos obligatorios de `OrdenRespuesta`, y `mapOrderResponse` los valida con `orderResponseDtoSchema` (SCRUM-103).
- `mapOrderResponse` convierte `estado_codigo` con `CODE_TO_STATUS`, alineado con el catálogo 1–8 publicado en `OrdenRespuesta.estado_codigo` (SCRUM-104).
- `mapOrderResponse` ya no completa datos faltantes: una respuesta incompleta se rechaza con `ORDER_INVALID_RESPONSE`. `OrdenRespuesta` no incluye cliente, por lo que `clientId` queda sin valor ("Cliente: No disponible").
- `createOrder()` envía solo `{ vehiculo_id }` entero positivo, como exige `OrdenCrear` (rol administrador).

## Resumen

| Estado | Cantidad | Endpoints |
|---|---|---|
| Alineado | 11 | Login, `/auth/me`, cinco de vehículos y cuatro de órdenes |
| Desalineado | 0 | — |
| Sin uso en pantallas | 2 | Registro y asignación de mecánico |

Actualizado el 28-10-2026 (SCRUM-105) contra `/ms2/openapi.json`. Los endpoints de vehículos y órdenes quedaron alineados con el merge `f25ae44` y las correcciones de SCRUM-103, SCRUM-104 y SCRUM-105.