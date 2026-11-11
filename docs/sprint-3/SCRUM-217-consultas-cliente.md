# SCRUM-217 — evidencias de consulta del Cliente

Fecha: 11-11-2026. Organización documental validada; **consultas autenticadas reales BLOCKED** por B-ACCOUNTS/B-DEVICE de [SCRUM-216](SCRUM-216-checklist-autenticacion.md). No hay capturas reales nuevas ni respuestas autenticadas. Se preservan los documentos y archivos del equipo.

## Inventario verificado en Victor

Las rutas de esta tabla incluyen el grupo Expo para evitar ambigüedad entre rutas con igual URL. Los endpoints son relativos a `/api`, obtenidos de servicios, no de nombres de pantalla.

| Pantalla / ruta | Servicio y recurso real | Fuente verificable |
| --- | --- | --- |
| `/(cliente)/cliente` | Home estático de demostración; no consulta API | [Home](<../../src/app/(cliente)/cliente.tsx>) |
| `/(cliente)/mis-vehiculos`, `/(cliente)/vehiculos` | `getMyVehicles` → GET `/vehiculos`; alcance decidido por backend, no `/vehiculos/mios` | [Ruta](<../../src/app/(cliente)/mis-vehiculos.tsx>), [adaptador](../../src/services/vehicles.service.ts), [lista alternativa](../../src/components/vehicles/VehicleListScreen.tsx) |
| `/(cliente)/vehiculos/[id]` | GET `/vehiculos/{id}`, luego GET `/ordenes` y filtro por vehículo | [Detalle compartido](../../src/components/vehicles/VehicleDetailScreen.tsx) |
| `/(cliente)/ordenes/[id]` | GET `/ordenes/{id}` y GET `/vehiculos/{vehicleId}`; vista alternativa sin sección MS4 | [Detalle alternativo](../../src/components/orders/OrderDetailScreen.tsx) |
| `/(cliente)/mis-ordenes/[id]` | GET `/ordenes/{id}`; lista MS4 GET `/evidencias?orden_id={id}` | [Ruta con evidencias](<../../src/app/(cliente)/mis-ordenes/[id].tsx>), [lista MS4](../../src/components/evidence/OrderEvidenceList.tsx) |
| `/(cliente)/mis-ordenes/[id]/presupuesto` | GET `/presupuestos?orden_id={id}`, después GET `/presupuestos/{id}`; última versión visible | [Servicio](../../src/services/budgets.service.ts), [vista](../../src/components/orders/OrderBudgetView.tsx) |
| Fotografía bajo `mis-ordenes/[id]` | Solicitud bajo demanda a GET `/evidencias/{uuid}/descarga`; URL temporal, sin almacenarla como evidencia | [Servicio MS4](../../src/services/evidence.service.ts), [vista MS4](../../src/components/evidence/OrderEvidenceList.tsx) |
| `/(cliente)/presupuesto` | `getBudgetById('OT-00124')`, dato demo sin petición real | [Vista demo](../../src/components/budgets/BudgetDetailScreen.tsx) |

Se corrigió únicamente el comentario de `mis-vehiculos.tsx` que anunciaba un endpoint inexistente en el adaptador. No se cambió la URL usada. El home, seguimiento, métricas y presupuesto demo no son evidencia backend aunque las banderas mock estén en false. La lista MS4 filtra además `visibleToClient`; ese filtro UI no prueba autorización de descarga. En VehicleDetailScreen un fallo al listar órdenes se captura y termina como lista vacía; debe distinguirse durante QA de una respuesta vacía exitosa.

## Evidencia existente y nueva

[Registro HTTP real anónimo](evidencias/SCRUM-217-http.json): cuatro 401, sin token. `orden_id=1` procede de la prueba histórica; no confirma orden existente ni propiedad. [Pruebas automatizadas](evidencias/SCRUM-217-tests.json): 85 PASS y 1 FAIL, 5 suites, con servicios/HTTP/nativos simulados y utilidad de rutas pendiente de SCRUM-158. El fallo es una expectativa de llamadas del panel Administrador en vehicle-list-integration; no es una consulta real fallida del Cliente. Se abordará al revisar administración. Los 401 tampoco prueban acceso cruzado entre usuarios autenticados.

Evidencia histórica preservada: [integración MS4](../integracion-ms4-evidencias.md), [contrato de vehículos y órdenes](../contratos-openapi-vehiculos-ordenes.md), [flujo de órdenes](../integracion-cruzada-ordenes.md). Sus fechas y resultados históricos no se reclasifican como pruebas ejecutadas hoy.

## Casos reproducibles pendientes

Precondiciones: configuración QA y cuenta Cliente real; dataset de vehículo/orden propios, ajenos y sin presupuesto/fotografías; identificadores entregados por backend. Registrar solo códigos, pantallas y alias redactados. No ejecutar decisiones de presupuesto para comprobar consultas. Evidencia de soporte en cada fila = código/pruebas disponibles, **no ejecución real del caso**.

| ID | Rol | Procedimiento / recurso | Resultado esperado | Resultado observado | Estado | Evidencia / dependencia |
| --- | --- | --- | --- | --- | --- | --- |
| CQ-01 | Cliente | Login; abrir mis-vehiculos y vehiculos; observar GET `/vehiculos` | Solo vehículos del Cliente autenticado; mismos datos en ambas rutas | No ejecutado: faltan cuenta/dataset QA y ejecución Expo | BLOCKED | [Soporte](evidencias/SCRUM-217-tests.json); [dependencias](SCRUM-216-checklist-autenticacion.md#entorno-y-dependencias) |
| CQ-02 | Cliente | Abrir vehículo propio por ID; revisar detalle y órdenes relacionadas | Datos del vehículo y órdenes de ese vehículo sin mezcla de propietarios | No ejecutado: faltan cuenta/dataset QA y ejecución Expo | BLOCKED | [Soporte](evidencias/SCRUM-217-tests.json); [dependencias](SCRUM-216-checklist-autenticacion.md#entorno-y-dependencias) |
| CQ-03 | Cliente | Abrir orden propia en ambas rutas de detalle | Estado y vehículo coherentes; sección MS4 solo en mis-ordenes | No ejecutado: faltan cuenta/dataset QA y ejecución Expo | BLOCKED | [Soporte](evidencias/SCRUM-217-tests.json); [dependencias](SCRUM-216-checklist-autenticacion.md#entorno-y-dependencias) |
| CQ-04 | Cliente | Abrir presupuesto de la orden propia | Consultas de listado y detalle coherentes, versión visible e importes del backend | No ejecutado: faltan cuenta/dataset QA y ejecución Expo | BLOCKED | [Soporte](evidencias/SCRUM-217-tests.json); [dependencias](SCRUM-216-checklist-autenticacion.md#entorno-y-dependencias) |
| CQ-05 | Cliente | Abrir sección de evidencias de una orden propia | Solo evidencias visibles al Cliente; sin datos de evidencias ocultas | No ejecutado: faltan cuenta/dataset QA y ejecución Expo; almacenamiento MS4 no disponible | BLOCKED | [Soporte](evidencias/SCRUM-217-tests.json); [dependencias](SCRUM-216-checklist-autenticacion.md#entorno-y-dependencias) |
| CQ-06 | Cliente | Solicitar ver fotografía y volver tras caducar enlace QA | Obtener URL temporal bajo demanda; renovar enlace expirado sin exponerlo en logs | No ejecutado: faltan cuenta/dataset QA y ejecución Expo; almacenamiento MS4 no disponible | BLOCKED | [Soporte](evidencias/SCRUM-217-tests.json); [dependencias](SCRUM-216-checklist-autenticacion.md#entorno-y-dependencias) |
| CQ-07 | Cliente | Usar cuenta sin vehículos y orden sin presupuesto/evidencias | Estados vacíos explícitos; sin mostrar datos de demostración como respuesta real | No ejecutado: faltan cuenta/dataset QA y ejecución Expo | BLOCKED | [Soporte](evidencias/SCRUM-217-tests.json); [dependencias](SCRUM-216-checklist-autenticacion.md#entorno-y-dependencias) |
| CQ-08 | Cliente | Limitar red antes de abrir cada consulta conectada | Carga visible antes de datos; al cambiar ID no mostrar datos de orden anterior | No ejecutado: faltan cuenta/dataset QA y ejecución Expo | BLOCKED | [Soporte](evidencias/SCRUM-217-tests.json); [dependencias](SCRUM-216-checklist-autenticacion.md#entorno-y-dependencias) |
| CQ-09 | Cliente | Desconectar red durante lista/detalle/presupuesto/evidencias; reconectar y reintentar | Error y reintento recuperables; distinguir error de órdenes de una lista vacía | No ejecutado: faltan cuenta/dataset QA y ejecución Expo | BLOCKED | [Soporte](evidencias/SCRUM-217-tests.json); [dependencias](SCRUM-216-checklist-autenticacion.md#entorno-y-dependencias) |
| CQ-10 | Cliente | Abrir ID de vehículo/orden/evidencia ajeno aprobado para QA | Backend deniega con 403/404 según contrato; sin información del otro Cliente | No ejecutado: faltan cuenta/dataset QA y ejecución Expo | BLOCKED | [Soporte](evidencias/SCRUM-217-tests.json); [dependencias](SCRUM-216-checklist-autenticacion.md#entorno-y-dependencias) |
| CQ-11 | Cliente | Abrir grupo admin o mecánico con sesión Cliente | Guarda redirige a /cliente y no monta consultas privadas ajenas | No ejecutado: faltan cuenta/dataset QA y ejecución Expo | BLOCKED | [Soporte](evidencias/SCRUM-217-tests.json); [dependencias](SCRUM-216-checklist-autenticacion.md#entorno-y-dependencias) |
| CQ-12 | Cliente | Reabrir una consulta con token QA expirado | 401 protegido invalida sesión; sin conservar contenido privado | No ejecutado: faltan cuenta/dataset QA y ejecución Expo | BLOCKED | [Soporte](evidencias/SCRUM-217-tests.json); [dependencias](SCRUM-216-checklist-autenticacion.md#entorno-y-dependencias) |

## Validación del ticket

Se cotejaron pantallas → servicios → endpoints → casos → evidencia sin duplicar archivos históricos ni crear capturas. `python3 scripts/validate-sprint3-docs.py docs/sprint-3/SCRUM-217-consultas-cliente.md` y `git diff --check`: [resultado](evidencias/SCRUM-217-validacion.txt). El JSON conserva también el fallo automatizado observado; no se declara toda la suite aprobada. TypeScript y lint continúan con fallos previos ajenos al comentario corregido. La integración real del Cliente sigue pendiente.
