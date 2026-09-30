# Discrepancias pendientes de integración

Este documento reúne las diferencias entre la app móvil y la API que siguen sin resolverse. Consolida lo registrado en `docs/revision-nulabilidad-modelos.md`, `docs/comparacion-modelos-contrato.md` y `docs/matriz-endpoint-dto-modelo.md`, contrastado con el contrato verificado contra producción y con el código actual. Son diferencias propias del desarrollo en paralelo de la app y el backend; autenticación, objetivo de este sprint, está alineada con el contrato.

## Criterios

Las discrepancias incluyen tanto diferencias directas entre la app y el contrato como comportamientos que el contrato aún no define y que afectan la integración.

**Responsable:**
- **Integración 2:** se requiere información o funcionalidad del backend que la app no puede resolver por sí sola.
- **Equipo móvil:** la app debe ajustarse al contrato vigente.

**Impacto:**
- **Alto:** la función no puede completarse con la API real.
- **Medio:** la función opera, pero los datos pueden quedar incompletos o no coincidir con el contrato.
- **Bajo:** no afecta el funcionamiento actual.

## Pendientes de Integración 2

| # | Discrepancia | Contrato | App | Impacto |
|---|---|---|---|---|
| I1 | Catálogo de estados de orden | `estado_codigo` es un número sin catálogo publicado | `mapOrderResponse` usa un catálogo propio (`CODE_TO_STATUS`) | Medio |
| I2 | Cliente de una orden | `OrdenRespuesta` no incluye el cliente; solo `creado_por_id` | `WorkOrder.clientId` es obligatorio; el mapper lo toma de `creado_por_id` o usa `'1'` | Medio |
| I3 | Dueño de un vehículo | `VehiculoRespuesta` no incluye el dueño | `Vehicle.ownerId` queda vacío con la API real | Medio |
| I4 | Vehículos para mecánico y administrador | Los endpoints de vehículos no permiten a estos roles realizar las consultas que necesitan; `GET /api/vehiculos` responde 403 para ellos | `getVehicles()` se describe como catálogo del administrador | Alto |
| I5 | Vehículos asignados y cambio de estado | No existen endpoints para listar los vehículos asignados a un mecánico ni para cambiar el estado de una orden | La app los necesita (ver E2 y E3) | Alto |
| I6 | Clientes y mecánicos | No existen endpoints de clientes ni de mecánicos | Sin una lista de mecánicos no se obtiene el `mecanico_id` que exige `PUT /api/ordenes/{orden_id}/mecanico` | Medio |
| I7 | Usuario inactivo | No se indica qué ocurre si `is_active` es `false` | La app no distingue a un usuario inactivo | Bajo |
| I8 | Varios roles | `roles` es un arreglo, sin regla para varios valores | Se usa el primer elemento; si no es válido, se rechaza aunque otro sí lo sea | Bajo |

## Ajustes pendientes en la app

| # | Discrepancia | Contrato | App | Impacto | Depende de |
|---|---|---|---|---|---|
| E1 | Endpoint `GET /api/vehiculos/mios` | No existe; responde 422. Los vehículos del cliente se obtienen con `GET /api/vehiculos` | `getMyVehicles()` lo llama | Alto | — |
| E2 | Endpoint `GET /api/vehiculos/asignados` | No existe | `getAssignedVehicles()` lo llama | Alto | I4, I5 |
| E3 | Endpoint `PATCH /api/ordenes/{id}/status` | No existe | `updateOrderStatus()` lo llama | Alto | I1, I5 |
| E4 | Cuerpo al crear un vehículo | `VehiculoCrear`: `patente`, `marca` y `modelo` obligatorios, `anio` y `kilometraje` opcionales, sin campos adicionales | `createVehicle()` envía `patent`, `brand`, `model`, `year` y `mileage`, y omite `marca` y `modelo` | Alto | — |
| E5 | Cuerpo al crear una orden | `OrdenCrear`: solo `vehiculo_id`, entero, sin campos adicionales; requiere rol administrador | `createOrder()` envía `vehiculo_id` como texto, junto con `vehicle_id`, `cliente_id`, `client_id` y `description` | Alto | — |
| E6 | Cierre de sesión ante 403 | 403 indica falta de permiso por rol | El interceptor cierra la sesión ante 401 y ante 403 | Alto | — |
| E7 | DTO de vehículos y órdenes | Campos definidos y obligatorios en `VehiculoRespuesta` y `OrdenRespuesta` | `VehicleResponseDto` y `OrderResponseDto` declaran todos los campos opcionales y aceptan nombres que el contrato no usa | Medio | — |
| E8 | Valores asignados por el mapper de órdenes | Los campos de `OrdenRespuesta` son obligatorios | `mapOrderResponse` completa los datos faltantes con valores propios (fecha `1970-01-01`, cliente `'1'`) | Medio | I2 |
| E9 | `refreshToken` | La API no entrega refresh token | El campo sigue en `AuthResponse`, en el store, en los mocks y en las pruebas de sesión | Bajo | — |

## Resumen

| Responsable | Alto | Medio | Bajo | Total |
|---|---|---|---|---|
| Integración 2 | 2 | 4 | 2 | 8 |
| Equipo móvil | 6 | 2 | 1 | 9 |

- Las discrepancias de impacto alto del equipo móvil corresponden a vehículos, órdenes y la sesión. Autenticación no tiene discrepancias de impacto alto.
- E1, E4, E5 y E6 no dependen del backend y pueden resolverse con el contrato vigente.
- E2 y E3 podrán resolverse cuando Integración 2 defina los endpoints correspondientes.