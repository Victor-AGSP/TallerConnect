# Comparación de modelos móviles con el contrato del backend

Este documento compara, campo por campo, los modelos de la app (`src/models/`) con el contrato verificado contra producción, y clasifica cada diferencia según cómo debe resolverse. Complementa `docs/revision-nulabilidad-modelos.md`, que profundiza en los campos opcionales y nulos.

## Criterios de clasificación

| Categoría | Significado | Solución |
|---|---|---|
| **Coincide** | Mismo nombre, tipo y nulabilidad | Ninguna |
| **Mapper** | Distinto nombre o tipo, pero con una conversión directa | Un mapper DTO → modelo, sin cambiar el modelo |
| **Corregir modelo** | Falta o sobra un campo, o la nulabilidad no refleja la API | Ajustar el modelo |
| **Bloqueado** | No se puede resolver sin información del backend | Requiere información de Integración 2 |
| **Intencional** | La diferencia es a propósito | Ninguna; se documenta |

## Autenticación

### `LoginCredentials` ↔ `LoginSolicitud`

| Modelo | Contrato | Categoría |
|---|---|---|
| `email: string` | `email: string` | Coincide |
| `password: string` | `password: string` | Coincide |

### `User` ↔ `UsuarioRespuesta`

| Modelo | Contrato | Categoría | Detalle |
|---|---|---|---|
| `id: string` | `id: number` | Mapper | `String(id)` |
| `name: string` | `full_name: string` | Mapper | Renombrar |
| `email: string` | `email: string` | Coincide | |
| `role: UserRole` | `roles: NombreRol[]` (`cliente`, `mecanico` o `administrador`) | Mapper | El modelo admite un solo rol; actualmente el mapper utiliza el primer elemento del arreglo. El contrato no define una regla para múltiples roles. |
| `phone?: string` | (no existe) | Intencional | Solo lo usan los usuarios demo |
| `createdAt?: string` | (no existe) | Corregir modelo | Nunca llega desde la API |
| (no existe) | `is_active: boolean` | Bloqueado | No se sabe qué hacer si llega en `false` |

### `AuthResponse` ↔ `TokenRespuesta`

| Modelo | Contrato | Categoría | Detalle |
|---|---|---|---|
| `user: User` | `user: UsuarioRespuesta` | Mapper | Mismo mapper de `User` |
| `token: string` | `access_token: string` | Mapper | Renombrar |
| `refreshToken?: string` | (no existe) | Corregir modelo | La API no entrega este campo, por lo que corresponde eliminarlo del modelo. La eliminación queda pendiente porque actualmente `authStore`, mocks y pruebas de sesión lo utilizan; requiere coordinación antes de realizar el cambio. |
| (no existe) | `token_type?: string` (opcional, por defecto `bearer`) | Intencional | La app no lo necesita |

### `AuthSession`

No tiene equivalente en el contrato. Representa estado interno de la app y no se usa en ninguna parte: el store define su propio `AuthState`. Categoría: **corregir modelo**.

## Vehículos

### `Vehicle` ↔ `VehiculoRespuesta`

| Modelo | Contrato | Categoría | Detalle |
|---|---|---|---|
| `id: string` | `vehiculo_id: number` | Mapper | Renombrar y convertir a texto |
| `plate: string` | `patente: string` | Mapper | Renombrar. El backend no valida el formato |
| `brand?: string` | `marca: string` | Mapper + Corregir modelo | Renombrar. La API siempre lo entrega; el modelo no debería ser opcional |
| `model?: string` | `modelo: string` | Mapper + Corregir modelo | Igual que el anterior |
| `year?: number` | `anio: number \| null` | Mapper + Corregir modelo | Renombrar. Definir cómo se representa el `null` |
| (no existe) | `kilometraje: number \| null` | Corregir modelo | Falta en el modelo |
| `ownerId?: string` | (no existe) | Bloqueado | La API no entrega el dueño del vehículo |

## Órdenes de trabajo

### `WorkOrder` ↔ `OrdenRespuesta`

| Modelo | Contrato | Categoría | Detalle |
|---|---|---|---|
| `id: string` | `orden_id: number` | Mapper | Renombrar y convertir a texto |
| `vehicleId: string` | `vehiculo_id: number` | Mapper | Renombrar y convertir a texto |
| `status: WorkOrderStatus` | `estado_codigo: number` | Bloqueado | No hay catálogo publicado que relacione cada número con un estado |
| `assignedMechanicId?: string` | `mecanico_actual_id: number \| null` | Mapper + Corregir modelo | Renombrar, convertir y definir cómo se representa el `null` |
| `clientId: string` | (no existe) | Bloqueado | Es obligatorio en el modelo, pero la API no entrega el cliente |
| `description?: string` | (no existe) | Corregir modelo | Nunca llega desde la API |
| `createdAt?: string` | `creado_en: string` | Mapper + Corregir modelo | Renombrar. La API siempre lo entrega |
| `updatedAt?: string` | `actualizado_en: string` | Mapper + Corregir modelo | Igual que el anterior |
| (no existe) | `ingreso_id: number` | Corregir modelo | Falta en el modelo |
| (no existe) | `creado_por_id: number` | Corregir modelo | Falta en el modelo |

### `WorkOrderStatus` ↔ `estado_codigo`

La app define 10 estados de texto (`recibido`, `esperando_diagnostico`, `en_reparacion`, etc.). La API entrega un número sin catálogo publicado, así que no es posible relacionar ambos.

## Resumen

| Modelo | Coincide | Mapper | Corregir modelo | Bloqueado | Intencional |
|---|---|---|---|---|---|
| `LoginCredentials` | 2 | 0 | 0 | 0 | 0 |
| `User` | 1 | 3 | 1 | 1 | 1 |
| `AuthResponse` | 0 | 2 | 1 | 0 | 1 |
| `Vehicle` | 0 | 5 | 4 | 1 | 0 |
| `WorkOrder` | 0 | 5 | 6 | 2 | 0 |

Un mismo campo puede sumar en dos categorías (por ejemplo, "Mapper + Corregir modelo"). `AuthSession` no se incluye en la tabla porque no tiene equivalente en el contrato.

**Conclusiones:**
- **Autenticación:** la mayoría de las diferencias son de nombre o tipo, del tipo que resuelve un mapper. Sobran `createdAt`, `refreshToken` y `AuthSession`, y `is_active` queda bloqueado.
- **Vehículos:** todas las diferencias de nombre y tipo tienen conversión directa. Hay 4 campos por corregir en el modelo y `ownerId` queda bloqueado.
- **Órdenes:** es el modelo con más diferencias. `status` y `clientId` quedan bloqueados.