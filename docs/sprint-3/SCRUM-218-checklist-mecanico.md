# SCRUM-218 — checklist de consulta real del Mecánico

Fecha: 11-11-2026. Checklist documental validado; **ejecución autenticada real BLOCKED**. Aplican [dependencias QA de SCRUM-216](SCRUM-216-checklist-autenticacion.md#entorno-y-dependencias): cuentas por rol, dataset propio/ajeno y Expo instrumentado. Sin capturas nuevas ni respuestas de usuarios reales. No se realizan altas, cambios de estado, registros de bitácora ni subidas para validar consultas.

## Funcionalidades implementadas

| Ruta / sección | Consulta efectiva | Fuente |
| --- | --- | --- |
| `/(mecanico)/mecanico` | Panel estático; cifras y orden demo, sin consultas reales | [Home](<../../src/app/(mecanico)/mecanico.tsx>) |
| `/(mecanico)/ordenes` | `ordersService.getOrders()` → GET `/ordenes`; filtro UI por `assignedMechanicId === user.id` | [Listado](<../../src/app/(mecanico)/ordenes/index.tsx>), [servicio](../../src/services/orders.service.ts) |
| `/(mecanico)/vehiculos-asignados`, `/(mecanico)/vehiculos` | `getAssignedVehicles()` → GET `/vehiculos/asignados` | [Ruta](<../../src/app/(mecanico)/vehiculos-asignados.tsx>), [lista alternativa](../../src/components/vehicles/VehicleListScreen.tsx), [adaptador](../../src/services/vehicles.service.ts) |
| `/(mecanico)/vehiculos/[id]` | GET `/vehiculos/{id}`, luego GET `/ordenes` y filtro por vehículo | [Detalle](../../src/components/vehicles/VehicleDetailScreen.tsx) |
| `/(mecanico)/ordenes/[id]` | GET `/ordenes/{id}`, GET `/vehiculos/{vehicleId}`; variante sin MS4 ni bitácora | [Detalle alternativo](../../src/components/orders/OrderDetailScreen.tsx) |
| `/(mecanico)/ordenes-asignadas/[id]` | GET `/ordenes/{id}` y lista GET `/evidencias?orden_id={id}` | [Ruta con MS4](<../../src/app/(mecanico)/ordenes-asignadas/[id].tsx>), [lista](../../src/components/evidence/OrderEvidenceList.tsx) |
| Historial bajo ordenes-asignadas | GET `/ordenes/{id}/bitacora` bajo demanda | [Panel](../../src/components/orders/MechanicUpdatePanel.tsx), [servicio](../../src/services/order-log.service.ts) |
| Fotografía bajo ordenes-asignadas | GET `/evidencias/{uuid}/descarga` bajo demanda | [Servicio MS4](../../src/services/evidence.service.ts) |
| `/(mecanico)/inventario` | `getParts/getProviders` demo, sin HTTP | [Inventario](../../src/components/inventory/InventoryScreen.tsx) |

No hay ruta de presupuesto implementada en el grupo Mecánico. No se agrega al checklist una consulta inexistente. La ruta `ordenes` enlaza al detalle alternativo, que no tiene las mismas secciones que `ordenes-asignadas/[id]`; probar ambas por sus rutas de grupo. Un filtro del frontend por usuario no sustituye autorización HTTP. MS4 permite consultar evidencias de órdenes asignadas según el [contrato histórico](../integracion-ms4-evidencias.md); su cumplimiento real sigue pendiente.

## Casos reales reproducibles

Precondición: cuenta Mecánico QA con orden/vehículo asignado, otra orden no asignada y dataset vacío conocido. Confirmar mocks deshabilitados. Para errores y expiración, usar controles del entorno QA; no cambiar datos productivos. Evidencia referenciada en cada fila es soporte automatizado y dependencias, no prueba real ejecutada.

| ID | Rol | Procedimiento / recurso | Resultado esperado | Resultado observado | Estado | Evidencia / dependencia |
| --- | --- | --- | --- | --- | --- | --- |
| MQ-01 | Mecánico | Login; abrir ordenes y revisar GET `/ordenes` | Mostrar solo órdenes asignadas al ID del mecánico autenticado | No ejecutado: faltan cuenta/dataset QA y Expo | BLOCKED | [Pruebas de soporte](evidencias/SCRUM-218-tests.json); [dependencias](SCRUM-216-checklist-autenticacion.md#entorno-y-dependencias) |
| MQ-02 | Mecánico | Abrir vehiculos-asignados y vehiculos; revisar GET `/vehiculos/asignados` | Datos del usuario autenticado, sin vehículos ajenos | No ejecutado: faltan cuenta/dataset QA y Expo | BLOCKED | [Pruebas de soporte](evidencias/SCRUM-218-tests.json); [dependencias](SCRUM-216-checklist-autenticacion.md#entorno-y-dependencias) |
| MQ-03 | Mecánico | Abrir vehículo asignado y sus órdenes | Detalle coherente y órdenes del vehículo; sin datos de otras asignaciones | No ejecutado: faltan cuenta/dataset QA y Expo | BLOCKED | [Pruebas de soporte](evidencias/SCRUM-218-tests.json); [dependencias](SCRUM-216-checklist-autenticacion.md#entorno-y-dependencias) |
| MQ-04 | Mecánico | Abrir orden asignada en ambas variantes de detalle | Detalle/estado coinciden; solo variante ordenes-asignadas incluye bitácora/MS4 | No ejecutado: faltan cuenta/dataset QA y Expo | BLOCKED | [Pruebas de soporte](evidencias/SCRUM-218-tests.json); [dependencias](SCRUM-216-checklist-autenticacion.md#entorno-y-dependencias) |
| MQ-05 | Mecánico | Solicitar historial de orden asignada | GET bitácora bajo demanda; entradas de esa orden con autor/fecha del servidor | No ejecutado: faltan cuenta/dataset QA y Expo | BLOCKED | [Pruebas de soporte](evidencias/SCRUM-218-tests.json); [dependencias](SCRUM-216-checklist-autenticacion.md#entorno-y-dependencias) |
| MQ-06 | Mecánico | Consultar lista MS4 y solicitar fotografía | Solo orden asignada; URL temporal y renovación al vencer | No ejecutado: faltan cuenta/dataset QA y Expo; MS4 storage 503 | BLOCKED | [Pruebas de soporte](evidencias/SCRUM-218-tests.json); [dependencias](SCRUM-216-checklist-autenticacion.md#entorno-y-dependencias) |
| MQ-07 | Mecánico | Usar mecánico sin asignaciones y orden sin bitácora/fotografías | Listas vacías diferenciadas de fallos; sin datos demo en consultas reales | No ejecutado: faltan cuenta/dataset QA y Expo | BLOCKED | [Pruebas de soporte](evidencias/SCRUM-218-tests.json); [dependencias](SCRUM-216-checklist-autenticacion.md#entorno-y-dependencias) |
| MQ-08 | Mecánico | Limitar red; abrir cada consulta; navegar entre dos IDs | Carga visible; resultado tardío de otra orden no se mezcla | No ejecutado: faltan cuenta/dataset QA y Expo | BLOCKED | [Pruebas de soporte](evidencias/SCRUM-218-tests.json); [dependencias](SCRUM-216-checklist-autenticacion.md#entorno-y-dependencias) |
| MQ-09 | Mecánico | Provocar error de red/timeout/503 en cada consulta; restablecer y reintentar | Error comprensible, reintento recuperable y sin creación de datos | No ejecutado: faltan cuenta/dataset QA y Expo | BLOCKED | [Pruebas de soporte](evidencias/SCRUM-218-tests.json); [dependencias](SCRUM-216-checklist-autenticacion.md#entorno-y-dependencias) |
| MQ-10 | Mecánico | Abrir IDs de vehículo/orden/bitácora/evidencia no asignados de QA | 403/404 según contrato; sin información ajena, incluso si se omite filtro UI | No ejecutado: faltan cuenta/dataset QA y Expo | BLOCKED | [Pruebas de soporte](evidencias/SCRUM-218-tests.json); [dependencias](SCRUM-216-checklist-autenticacion.md#entorno-y-dependencias) |
| MQ-11 | Mecánico | Abrir grupos Cliente y Administrador con sesión Mecánico | Redirección a /mecanico; sin montar consultas del otro rol | No ejecutado: faltan cuenta/dataset QA y Expo | BLOCKED | [Pruebas de soporte](evidencias/SCRUM-218-tests.json); [dependencias](SCRUM-216-checklist-autenticacion.md#entorno-y-dependencias) |
| MQ-12 | Mecánico | Consultar con JWT QA expirado; repetir con recurso prohibido pero sesión válida | 401 invalida sesión; 403 conserva sesión y muestra error | No ejecutado: faltan cuenta/dataset QA y Expo | BLOCKED | [Pruebas de soporte](evidencias/SCRUM-218-tests.json); [dependencias](SCRUM-216-checklist-autenticacion.md#entorno-y-dependencias) |

## Validación y evidencia

[Resumen de pruebas](evidencias/SCRUM-218-tests.json): se ejecutaron las suites existentes de flujo MS4, avances del mecánico, visibilidad y autorización de órdenes, con mocks de HTTP, auth, almacenamiento y selector. Incluyen denegación por rol, listas, errores, sesión y asociación a la orden; no validan permisos nativos ni backend real. Usan la utilidad de rutas corregida sin commit en SCRUM-158. [Consulta HTTP anónima](evidencias/SCRUM-218-http.json) es solo rechazo sin token, nunca aceptación de asignación.

Se cotejaron las 12 filas con funcionalidades presentes en esta rama y con las suites ejecutadas, sin incluir el inventario demo como consulta real. `python3 scripts/validate-sprint3-docs.py docs/sprint-3/SCRUM-218-checklist-mecanico.md`, revisión de secretos y `git diff --check`: [resultado](evidencias/SCRUM-218-validacion.txt). Este ticket no cambia código; TypeScript/lint mantienen los problemas previos registrados, pendientes en administración y barrel de servicios.
