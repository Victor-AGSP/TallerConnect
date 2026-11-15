# Sprint 3 · Semana 1 — Panel Mi Taller, Detalle de Vehículo y Renderizado de Nulos

## 1. Inventario de textos fijos eliminados del panel `Mi taller` (`S3-AMP-S1-JUAN-01` y `S3-S1`)

Se auditó [`src/app/(cliente)/cliente.tsx`](../src/app/(cliente)/cliente.tsx) y se eliminaron todos los textos y cifras estáticas de demostración, reemplazándolos por consultas reales a `ordersService.getOrders()` y `vehiclesService.getMyVehicles()` mediante `useDataQuery`:

| Elemento en `Mi taller` | Valor fijo anterior (eliminado) | Fuente real conectada (`S3-S1`) |
| :--- | :--- | :--- |
| Subtítulo de tarjeta de vehículo | `"Información de demostración"` | `"Orden OT #<order.id>"` (o estado vacío si no hay órdenes) |
| Estado del vehículo | `"En reparación"` fijo | `getOrderStatusLabel(featuredOrder.status)` con tono dinámico |
| Patente | `"AB-CD-12"` | `featuredVehicle.plate` (o `#<vehicleId>` si no figura en catálogo) |
| Descripción de vehículo/servicio | `"Mantención preventiva"` | `[featuredVehicle.brand, featuredVehicle.model]` reales |
| Métrica 1 | `"$125.000"` (`Presupuesto`) | `stats.totalOrders` (`Órdenes registradas`) |
| Métrica 2 | `"3"` (`Repuestos`) | `stats.activeOrders` (`Órdenes activas`) |
| Métrica 3 | `"4"` (`Evidencias`) | `stats.awaitingApproval` (`Por aprobar`) |
| Métrica 4 | `"1"` (`Orden activa`) | `stats.vehicles` (`Vehículos registrados`) |
| Seguimiento de la orden | Etapas estáticas fijas | `buildOrderTimeline(featuredOrder.status)` según estado real MS2 |
| Tarjeta de presupuesto fijo y multimedia ficticia | `"$125.000"`, `"Aprobado"`, `"4 archivos disponibles"` | Eliminados; reemplazados por listado interactivo `Mis órdenes recientes` con navegación a `/(cliente)/mis-ordenes/[id]` |
| Información de la orden | `"OT-00124"`, `"Normal"`, `"Mecánico asignado"` | `OT #<id>`, `getOrderStatusLabel(status)`, `formatDate(updatedAt)` y `Mecánico #<assignedMechanicId>` |

---

## 2. Diseño del indicador de carga para el resumen del cliente (`S3-AMP-S1-JUAN-02`)

- **Comportamiento inicial (`isLoading && !data`):**
  - El encabezado (`Portal del cliente` / `Mi taller`) y los controles de navegación inferiores (`Ver mis vehículos`, `Cerrar sesión`) permanecen visibles y accesibles en todo momento.
  - La sección central de resumen muestra `<Loading testID="cliente-summary-loading" message="Cargando resumen de tu taller..." />`.
- **Actualización manual (`pull-to-refresh`):**
  - El `ScrollView` incorpora `RefreshControl` vinculado a `isRefreshing` y `refresh()` de `useDataQuery`.

---

## 3. Mensaje específico de error de órdenes y separación de estado vacío en detalle de vehículo (`S3-AMP-S1-JUAN-03` y `S3-S1`)

En [`src/components/vehicles/VehicleDetailScreen.tsx`](../src/components/vehicles/VehicleDetailScreen.tsx):
- **Constante definida (`S3-AMP-S1-JUAN-03`):**
  ```ts
  export const VEHICLE_ORDERS_ERROR_MESSAGE =
    'No fue posible cargar las órdenes de trabajo asociadas a este vehículo.';
  ```
- **Separación de estados (`S3-S1`):**
  - Si `vehiclesService.getVehicleById(vehicleId)` responde correctamente pero `ordersService.getOrders()` falla, se conserva la tarjeta del vehículo y en la sección **Órdenes de trabajo** se renderiza `<ErrorMessage testID="vehicle-detail-orders-error" retryLabel="Reintentar órdenes" ... />` con opción de reintento.
  - Solo cuando `ordersService.getOrders()` responde con éxito y la lista filtrada por `vehicleId` está vacía (`orders.length === 0`), se muestra `<EmptyState testID="vehicle-detail-orders-empty" title="Sin órdenes de trabajo" ... />` junto con el subtítulo `"Este vehículo no registra órdenes de trabajo asociadas."`.

---

## 4. Comprobación de datos nulos en Android y textos extensos (`S3-AMP-S1-JUAN-04` y `S3-S1`)

Se verificó y reforzó el renderizado en [`VehicleDetailScreen.tsx`](../src/components/vehicles/VehicleDetailScreen.tsx), [`VehicleListView.tsx`](../src/components/vehicles/VehicleListView.tsx), [`VehicleListScreen.tsx`](../src/components/vehicles/VehicleListScreen.tsx), [`OrderDetailScreen.tsx`](../src/components/orders/OrderDetailScreen.tsx) y [`formatters.ts`](../src/utils/formatters.ts):
- **Campos nulos o cadenas en blanco (`null`, `undefined`, `'   '`, `NaN`):**
  - `plate`: fallback seguro a `'Sin patente'`.
  - `brand` y `model`: `.trim() || 'Sin información'` (en detalle) y `'Marca y modelo no registrados'` (en `accessibilityLabel` de tarjetas de listado).
  - `year`: validación `year != null && Number.isFinite(year)` con fallback a `'Sin año'` / `'Sin información'`.
  - `mileage`: validación `mileage != null && Number.isFinite(mileage)` con fallback a `'Sin kilometraje'` / `'Sin información'`.
- **Textos extensos en pantallas móviles Android:**
  - Aplicación de `numberOfLines={1}` + `ellipsizeMode="tail"` en patentes e identificadores para impedir que desplacen las insignias (`VEHÍCULO` / estado).
  - Aplicación de `numberOfLines={2..3}` + `ellipsizeMode="tail"` en valores de grillas informativas (`Marca`, `Modelo`, `Estado`) evitando desbordes verticales u horizontales.

