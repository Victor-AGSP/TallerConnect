# Contratos reales de la Gateway: vehículos y órdenes

Este documento contrasta las respuestas que entrega la API Gateway (`https://tallerconect.vercel.app/api`) con el contrato OpenAPI de MS2 (`/ms2/openapi.json`) y con los tipos de la app. Las respuestas se obtuvieron con las cuentas de prueba de cada rol, usando solo consultas de lectura.

## Campos de respuesta de vehículos

`GET /api/vehiculos` devuelve una lista de `VehiculoRespuesta` para los roles cliente y administrador. El mecánico consulta `GET /api/vehiculos/asignados`, que según el contrato devuelve el mismo esquema. Se revisaron las respuestas de los tres roles. Cada vehículo tiene estos campos:

| Campo | Tipo en el contrato | Obligatorio | Admite `null` | Respuesta real | `VehicleResponseDto` |
|---|---|---|---|---|---|
| `vehiculo_id` | `integer` | Sí | No | Entero | `number` |
| `cliente_id` | `integer` | Sí | No | Entero | `number` |
| `patente` | `string` | Sí | No | Texto; con letras y dígitos o solo con dígitos | `string` |
| `marca` | `string` | Sí | No | Texto libre, sin mayúsculas normalizadas | `string` |
| `modelo` | `string` | Sí | No | Texto libre, sin mayúsculas normalizadas | `string` |
| `anio` | `integer \| null` | Sí | Sí | Entero en todos los vehículos revisados | `number \| null` |
| `kilometraje` | `integer \| null` | Sí | Sí | Entero en todos los vehículos revisados | `number \| null` |

- El contrato declara los siete campos como `required`: ninguno es opcional. Un campo ausente significa una respuesta fuera de contrato, no un dato desconocido.
- Solo `anio` y `kilometraje` admiten `null`.
- Las respuestas revisadas de los tres roles coinciden con el contrato y con `VehicleResponseDto`: cada vehículo trae los siete campos y ninguno adicional.
- Ninguna respuesta revisada contiene `null`. Ese caso se cubre con las fixtures de contrato de `src/mocks/payloads/vehicle.payload.ts`.

### Ejemplo anonimizado

Respuesta de `GET /api/vehiculos` con la cuenta del rol cliente, disponible como fixture en `src/mocks/gateway/vehicles.gateway.ts`. Las patentes y los identificadores se reemplazaron por valores ficticios que conservan su formato y las relaciones entre registros; marca, modelo, año y kilometraje se conservan.

```json
[
  {
    "vehiculo_id": 101,
    "cliente_id": 501,
    "patente": "XYZW10",
    "marca": "Toyota",
    "modelo": "Corolla",
    "anio": 2019,
    "kilometraje": 65000
  },
  {
    "vehiculo_id": 102,
    "cliente_id": 501,
    "patente": "XYZW20",
    "marca": "Hyundai",
    "modelo": "Accent",
    "anio": 2017,
    "kilometraje": 98000
  },
  {
    "vehiculo_id": 103,
    "cliente_id": 501,
    "patente": "900001",
    "marca": "nissan",
    "modelo": "pathfinder",
    "anio": 2007,
    "kilometraje": 8425
  }
]
```

La prueba `__tests__/vehicle-gateway-response.test.ts` comprueba que el ejemplo trae exactamente los campos del contrato y que cumple el esquema `vehicleResponseDtoSchema`.