# Integración con el MS3 (presupuestos, repuestos y proveedores)

Contrato de referencia: `https://tallerconect.vercel.app/ms3/openapi.json` ("SGTM — MS3: Presupuestos, Repuestos y Proveedores", versión 0.1.0, OpenAPI 3.1.0), consultado el 14-10-2026. La app lo consume a través de la API Gateway (`/api/...`), el mismo `apiClient` que usa para el MS2.

## Comprobaciones reales (solo lectura, sin token)

| Solicitud | Resultado |
|---|---|
| `GET /ms3/openapi.json` | 200, contrato completo |
| `GET /ms3/health`, `GET /ms3/health/db` | 200, servicio y base de datos operativos |
| `GET /api/repuestos`, `/api/proveedores`, `/api/presupuestos` | 401 `No se proporcionó un token de acceso`: la Gateway enruta al MS3 y exige JWT |

No se hicieron solicitudes autenticadas ni de escritura. El comportamiento con datos reales se verificó solo contra el contrato, mediante pruebas con el cliente HTTP simulado.

## Repuestos y proveedores

| Capa | Elemento |
|---|---|
| DTO | `src/dto/parts.dto.ts`: `RepuestoSalida`, `PaginaRepuestos`, `ProveedorSalida`, `ProveedorDetalle`, `PaginaProveedores` |
| Modelo | `src/models/parts.model.ts`: `SparePart`, `Supplier`, `SupplierDetail`, `PagedList` |
| Mapper | `src/mappers/parts.mapper.ts`: exige los identificadores enteros y rechaza respuestas que no cumplen el contrato (`null`, `{}`, listas ausentes) |
| Servicio | `PartsService`: `GET /repuestos`, `GET /proveedores`, `GET /proveedores/{proveedor_id}` |
| Vistas | `SparePartListView`, `SupplierListView`, `SupplierDetailView`: carga, vacío, error con reintento y actualización manual |
| Rutas | `(admin)/repuestos`, `(admin)/proveedores`, `(admin)/proveedores/[id]`, con acceso desde el panel del administrador |

Relación representada: cada repuesto pertenece a un proveedor (`proveedor_id`, `proveedor_nombre`), y el detalle del proveedor incluye sus repuestos. Se muestran el stock y el umbral efectivo, indicando si es propio o general, junto con la marca `bajo_umbral`.

Fuera de alcance, por decisión: alta, edición y eliminación de repuestos y proveedores, movimientos de inventario, alertas y umbral general. Son operaciones de administración de inventario que la integración de las interfaces no requiere.

### Paginación

El contrato pagina con `desde` y `limite` (valor por defecto 50, máximo 200). La app pide la primera página y muestra "Mostrando N de total" cuando el servidor tiene más registros. No hay navegación entre páginas.

### Roles

Los GET de repuestos y proveedores declaran `403 Rol no permitido`, pero el contrato no indica qué roles se admiten. Como el interceptor de la app cierra la sesión ante cualquier 403, las vistas se publican solo para el Administrador (`RoleGuard`). Hay que pedir al responsable del MS3 que confirme si el Mecánico puede consultar repuestos, antes de exponerlos en su panel.
