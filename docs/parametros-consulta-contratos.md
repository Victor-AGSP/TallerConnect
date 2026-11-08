# Parámetros de consulta, filtrado y paginación en los contratos de TallerConnect

Este documento revisa qué parámetros de consulta, filtrado y paginación definen los contratos publicados de la API (`/ms1/openapi.json` y `/ms2/openapi.json`) y qué implica para la forma en que la app consulta vehículos y órdenes.

## Conceptos

| Concepto | Qué es | Ejemplo |
|---|---|---|
| **Parámetro de ruta** | Parte de la URL que identifica un recurso. Es obligatorio | `/ordenes/{orden_id}` → `/ordenes/5` |
| **Parámetro de consulta** | Va después de `?` y modifica la consulta. Suele ser opcional | `/ordenes/5?solo_propietario=true` |
| **Filtrado** | Pedir solo los elementos que cumplen una condición | `?estado=5` |
| **Paginación** | Pedir la lista por partes. Las formas habituales son `limit`/`offset`, `page`/`size` o un cursor | `?limit=20&offset=40` |
| **Ordenamiento** | Pedir la lista en un orden determinado | `?sort=creado_en&order=desc` |

En OpenAPI, cada parámetro se declara en la operación con su ubicación (`in: path` o `in: query`), su tipo y si es obligatorio. Si un parámetro no está declarado, el contrato no garantiza que el backend lo considere.

## Qué definen los contratos

### Vehículos y órdenes (MS2)

| Endpoint | Parámetros | Respuesta |
|---|---|---|
| `GET /api/vehiculos` | Ninguno | Arreglo de `VehiculoRespuesta` |
| `GET /api/vehiculos/asignados` | Ninguno | Arreglo de `VehiculoRespuesta` |
| `GET /api/vehiculos/{vehiculo_id}` | `vehiculo_id` (ruta, entero) | `VehiculoRespuesta` |
| `GET /api/ordenes` | Ninguno | Arreglo de `OrdenRespuesta` |
| `GET /api/ordenes/{orden_id}` | `orden_id` (ruta, entero); `solo_propietario` (consulta, booleano, opcional, por defecto `false`) | `OrdenRespuesta` |
| `GET /api/ordenes/{orden_id}/historial` | `orden_id` (ruta, entero) | Arreglo de `HistorialEstadoRespuesta` |

### Autenticación y usuarios (MS1)

`GET /api/auth/usuarios` no define parámetros y responde un arreglo de `UsuarioRespuesta`. Los demás endpoints solo usan parámetros de ruta.

### Conclusión

- `solo_propietario` es el único parámetro de consulta de ambos contratos.
- Ningún endpoint define paginación, filtrado ni ordenamiento.
- Las listas son arreglos simples, sin un objeto envolvente con datos como `items`, `total` o `page`.
- El único endpoint que declara un orden es el historial de una orden: "Devuelve todos los registros por fecha/hora e identificador ascendente" y, sin registros, devuelve `[]`.

## El parámetro `solo_propietario`

Su descripción en el contrato es: "Verificar propiedad del cliente, incluso con otros roles." Cuando vale `true`, el backend comprueba que la orden pertenezca al usuario autenticado como cliente, aunque ese usuario tenga además otro rol que le permitiría ver la orden. Si se omite, vale `false`.

Con Axios, los parámetros de consulta se pasan en `params`, sin escribirlos a mano en la URL:

```ts
const response = await apiClient.get<OrderResponseDto>(`/ordenes/${id}`, {
  params: { solo_propietario: true },
});
// Solicitud: GET /api/ordenes/5?solo_propietario=true
```

## Filtrado según el usuario

El filtrado que existe lo hace el backend a partir del usuario del token, no a partir de parámetros:

- `GET /api/ordenes` se describe como "Listar órdenes visibles": cada usuario recibe las órdenes que puede ver.
- El historial "aplica la misma visibilidad del detalle".
- Los vehículos asignados a un mecánico se consultan en un endpoint propio (`/vehiculos/asignados`), no con un filtro sobre `/vehiculos`.

Por lo tanto, la app no envía el identificador del usuario para obtener sus datos.

## Implicancias para la app

- **Las listas llegan completas.** Cualquier filtro (por estado o por vehículo), búsqueda u ordenamiento se hace en la app sobre el arreglo recibido:

```ts
const ordenesDelVehiculo = orders
  .filter((order) => order.vehicleId === vehicle.id)
  .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
```

- **No es posible pedir páginas.** La app recibe la lista entera en cada consulta; si las listas crecen, solo puede limitar cuántos elementos muestra en pantalla.
- **Las respuestas de lista se tipan como arreglos** (por ejemplo, `OrderResponseDto[]`). El tipo genérico `ApiResponse<T>` de `src/types/api.types.ts`, que envuelve los datos en `data`, no corresponde a estos endpoints.
- **El historial ya viene ordenado** del más antiguo al más reciente. Para mostrar primero el último cambio, basta con invertir el arreglo.
- **Parámetros no declarados:** enviar, por ejemplo, `?estado=5` o `?limit=20` no tiene un efecto garantizado, porque el contrato no los define.

## Comprobación práctica

Una prueba con `apiClient.getUri` confirmó cómo Axios construye las URL a partir de `params`:

| Configuración | URL resultante |
|---|---|
| `{ url: '/ordenes/5', params: { solo_propietario: true } }` | `.../api/ordenes/5?solo_propietario=true` |
| `{ url: '/ordenes' }` | `.../api/ordenes` |

## Referencias

- [OpenAPI 3.1: Parameter Object](https://spec.openapis.org/oas/v3.1.0#parameter-object)
- [Axios: configuración de la solicitud (`params`)](https://axios-http.com/docs/req_config)
- [Contrato MS1](https://tallerconect.vercel.app/ms1/openapi.json)
- [Contrato MS2](https://tallerconect.vercel.app/ms2/openapi.json)