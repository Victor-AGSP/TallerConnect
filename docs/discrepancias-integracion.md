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
| E1 | Endpoint `GET /api/vehiculos/mios` | No existe; responde 422. Los vehículos del cliente se obtienen con `GET /api/vehiculos` | Corregido (merge `f25ae44`): `getMyVehicles()` usa `GET /api/vehiculos` | — | — |
| E2 | Endpoint `GET /api/vehiculos/asignados` | Publicado en MS2 (rol Mecánico) | Corregido: `getAssignedVehicles()` coincide con el contrato | — | — |
| E3 | Cambio de estado de una orden | `PATCH /api/ordenes/{orden_id}/estado` con `CambioEstadoSolicitud` | Corregido: `updateOrderStatus()` usa la ruta y el cuerpo del contrato (verificado en SCRUM-104) | — | — |
| E4 | Cuerpo al crear un vehículo | `VehiculoCrear`: `patente`, `marca` y `modelo` obligatorios, `anio` y `kilometraje` opcionales, sin campos adicionales | Corregido (SCRUM-105): `buildCreateVehiclePayload()` envía solo `patente`, `marca`, `modelo`, `anio` y `kilometraje`, y valida obligatorios, tipos y longitudes antes de llamar a MS2 | — | — |
| E5 | Cuerpo al crear una orden | `OrdenCrear`: solo `vehiculo_id`, entero, sin campos adicionales; requiere rol administrador | Corregido (merge `f25ae44`): `createOrder()` envía solo `{ vehiculo_id }` entero | — | — |
| E6 | Cierre de sesión ante 403 | 403 indica falta de permiso por rol | Corregido (SCRUM-102): el interceptor solo cierra la sesión ante 401; un 403 se informa como falta de permisos | — | — |
| E7 | DTO de vehículos y órdenes | Campos definidos y obligatorios en `VehiculoRespuesta` y `OrdenRespuesta` | Corregido: ambos DTO declaran los campos obligatorios; `mapOrderResponse` valida `OrdenRespuesta` (SCRUM-103) | — | — |
| E8 | Valores asignados por el mapper de órdenes | Los campos de `OrdenRespuesta` son obligatorios | Corregido (SCRUM-103): una respuesta incompleta se rechaza; sin cliente en el contrato, `clientId` queda sin valor | — | I2 |
| E9 | `refreshToken` | La API no entrega refresh token | El campo sigue en `AuthResponse`, en el store, en los mocks y en las pruebas de sesión | Bajo | — |

## Resumen

| Responsable | Alto | Medio | Bajo | Total |
|---|---|---|---|---|
| Integración 2 | 2 | 4 | 2 | 8 |
| Equipo móvil | 6 | 2 | 1 | 9 |

- Las discrepancias de impacto alto del equipo móvil corresponden a vehículos, órdenes y la sesión. Autenticación no tiene discrepancias de impacto alto.
- Estado al 28-10-2026 (SCRUM-105): E1–E8 están corregidas en la rama `Victor` (E1, E2, E5 y E7 con el merge `f25ae44`; E3 verificada en SCRUM-104; E4 en SCRUM-105; E6 en SCRUM-102; E8 en SCRUM-103). Sigue pendiente E9 (`refreshToken`, impacto bajo). Los conteos de la tabla anterior corresponden a la revisión original.