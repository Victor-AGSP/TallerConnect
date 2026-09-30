# Revisión de nulabilidad, campos opcionales y valores inesperados

Este documento revisa cómo los modelos de la app representan los datos que pueden faltar o llegar vacíos, y cómo reacciona el código ante valores inesperados de la API. Se basa en el contrato verificado contra producción y en el código actual.

**Alcance:**
- **Autenticación:** se revisa en detalle, porque ya se integra con la API real.
- **Vehículos y órdenes:** solo se documentan, porque su API está incompleta. Las correcciones corresponden a la tarea "Corregir modelos/DTO según diferencias encontradas".

## Conceptos

| Notación | Significado | Ejemplo |
|---|---|---|
| `campo?: T` | El campo puede no existir (`undefined`) | `phone?: string` |
| `campo: T \| null` | El campo existe, pero puede no tener valor | `anio: number \| null` en la API |
| `campo: T` | El campo siempre existe y tiene valor | `email: string` |

La API usa `null` para indicar "sin valor". Los modelos de la app usan mayoritariamente `?`.

## Autenticación

### Modelo `User`

| Campo | Modelo | API | Observación |
|---|---|---|---|
| `id` | `string` | `number` | El mapper lo convierte a texto |
| `name` | `string` | `full_name: string` | Correcto |
| `email` | `string` | `string` | Correcto |
| `role` | `UserRole` | `roles: string[]` | El mapper toma el primer rol |
| `phone` | `string?` | No existe | Solo lo usan los usuarios demo. Es correcto que sea opcional |
| `createdAt` | `string?` | No existe | Nunca llega desde la API |
| (no existe) | | `is_active: boolean` | Se descarta. Ver "Valores inesperados" |

### Modelo `AuthResponse`

| Campo | Modelo | API | Observación |
|---|---|---|---|
| `user` | `User` | `user` | Correcto |
| `token` | `string` | `access_token: string` | Correcto |
| `refreshToken` | `string?` | No existe | La API no entrega refresh token |

`refreshToken` también está en el estado del store (`string | null`), en `setAuth`, en los mocks (`mockAuthResponses`) y en las pruebas de sesión. Con la API real siempre será `null`. No se elimina ahora porque forma parte de código y pruebas en uso. Se registra como discrepancia pendiente.

### Modelo `AuthSession`

No se usa en ninguna parte del proyecto: el store define su propio estado (`AuthState`). Es candidato a eliminarse al corregir los modelos.

### Valores inesperados

| Caso | Comportamiento actual | Riesgo | Recomendación |
|---|---|---|---|
| `roles` vacío o con un rol desconocido | Se rechaza con "El usuario no tiene un rol válido" | Ninguno | Correcto |
| Varios roles | Se usa el primero. Si el primero no es válido, se rechaza aunque otro sí lo sea | Un usuario válido podría quedar fuera según el orden de `roles` | Consultar a Integración 2 si un usuario puede tener varios roles y en qué orden llegan |
| `is_active: false` | Se acepta igual | Un usuario inactivo podría entrar si el backend lo permitiera | Consultar a Integración 2 si el login ya bloquea a los usuarios inactivos |
| `/auth/me` sin `full_name` | El login funciona, con `name` indefinido | Al reabrir la app, la sesión guardada no pasa `authResponseSchema` y se descarta sin aviso | Validar la respuesta con `userResponseDtoSchema` antes de convertirla |
| `/auth/me` con `id` en `null` | Se convierte en el texto `"null"` | Un id falso que pasa todas las validaciones del modelo | Igual que el caso anterior |
| Sesión guardada con datos corruptos | `authResponseSchema` la descarta al restaurar | Ninguno | Correcto |
| Token vencido al restaurar | Se restaura igual | Ver `docs/jwt-y-sesion.md` | Ver ese documento |

Los dos casos de riesgo de `/auth/me` ocurren porque el servicio convierte la respuesta con su propia función, sin validación en tiempo de ejecución. El proyecto ya tiene los componentes para evitarlo: `userResponseDtoSchema` en `src/schemas/auth-dto.schema.ts` y `mapUserResponse` en `src/mappers/auth.mapper.ts`.

### Mocks frente al contrato

- `mockAuthResponses` incluye `refreshToken`, un dato que la API real nunca entrega.
- Los usuarios demo incluyen `phone`, que la API tampoco entrega.

Las pruebas que usan estos mocks validan situaciones que no ocurren con el backend real. Los payloads de `src/mocks/payloads/auth.payload.ts` reflejan el contrato con fidelidad.

## Vehículos y órdenes (solo documentado)

### Modelo `Vehicle`

| Modelo | API | Diferencia |
|---|---|---|
| `id: string` | `vehiculo_id: number` | Tipo distinto |
| `plate: string` | `patente: string` | Correcto en nulabilidad |
| `brand?: string` | `marca: string` | La API siempre lo entrega; el modelo lo trata como opcional |
| `model?: string` | `modelo: string` | Igual que el anterior |
| `year?: number` | `anio: number \| null` | La API usa `null`; el modelo usa `?` |
| (no existe) | `kilometraje: number \| null` | Falta en el modelo |
| `ownerId?: string` | (no existe) | La API no entrega el dueño |

### Modelo `WorkOrder`

| Modelo | API | Diferencia |
|---|---|---|
| `id: string` | `orden_id: number` | Tipo distinto |
| `vehicleId: string` | `vehiculo_id: number` | Tipo distinto |
| `status: WorkOrderStatus` (texto) | `estado_codigo: number` | No hay catálogo de códigos publicado |
| `assignedMechanicId?: string` | `mecanico_actual_id: number \| null` | La API usa `null`; el modelo usa `?` |
| `clientId: string` (obligatorio) | (no existe) | La API no entrega el cliente. Solo `creado_por_id` |
| `description?: string` | (no existe) | Nunca llega desde la API |
| `createdAt?: string` | `creado_en: string` | La API siempre lo entrega; el modelo lo trata como opcional |
| `updatedAt?: string` | `actualizado_en: string` | Igual que el anterior |
| (no existe) | `ingreso_id: number` | Falta en el modelo |

Al corregir estos modelos habrá que decidir una convención: reflejar el `null` de la API en el modelo (`year: number | null`), o convertirlo a `undefined` en el mapper y mantener `?`. Lo importante es aplicar el mismo criterio en todos los modelos.

## Resumen de acciones

**Corregir en la tarea de semana 4 "Corregir modelos/DTO según diferencias encontradas":**
- Eliminar `AuthSession`, o alinearlo con el estado real del store.
- Definir qué hacer con `refreshToken` en el modelo, el store y los mocks, en coordinación con el equipo.
- Ajustar la nulabilidad de `Vehicle` y `WorkOrder` con una convención común.

**Consultar a Integración 2:**
- Si un usuario puede tener varios roles, y en qué orden llegan.
- Si el login bloquea a los usuarios con `is_active: false`.

**Integración en el servicio de autenticación:** validar la respuesta de `/auth/me` con `userResponseDtoSchema` y convertirla con `mapUserResponse`, para evitar los riesgos de `full_name` faltante e `id` nulo.