# SCRUM-157 — incidencias de evidencias MS4 e impacto

Revisión: 11-11-2026 America/Santiago; validación final 12-11-2026 UTC. Registro documental validado; una incidencia externa sigue abierta y la aceptación autenticada real continúa bloqueada. No se creó Issue externo ni se enviaron mensajes al equipo.

## Qué significa MS4 aquí

En este repositorio MS4 identifica el **microservicio de Evidencia Multimedia**, según [integración existente](../integracion-ms4-evidencias.md), DTO/servicio de evidencias y el contrato consultado `https://tallerconect.vercel.app/ms4/openapi.json`, cuyo título es `SGTM — MS4: Evidencia Multimedia`, versión 0.1.0. [Metadatos, rutas y SHA-256 del contrato observado](evidencias/SCRUM-157-ms4-contrato.json). No se encontró respaldo para interpretar MS4 como hito o milestone. GitHub Issues no devolvió tickets del repositorio; no se infieren criterios ni comentarios ausentes.

## MS4-STORAGE-503 — disponibilidad de almacenamiento

| Campo | Hecho / alcance |
| --- | --- |
| Descripción y contexto | El despliegue configurado respondió que el almacenamiento no está disponible. El mismo problema figuraba históricamente el 28-10-2026; se volvió a observar hoy con GET sin token. |
| Reproducción | Ejecutar `curl -sS --connect-timeout 10 --max-time 25 -w '\nHTTP %{http_code}\n' https://tallerconect.vercel.app/ms4/health/storage`; comparar con `/ms4/health` y `/ms4/health/db`. No requiere cuentas ni modifica datos. |
| Esperado | Health de almacenamiento 200, servicio y base 200, como requisito de entorno operativo de pruebas. |
| Observado | Storage 503 con `El almacenamiento de evidencias no está disponible`; health y db 200. No se ejecutó una subida ni descarga autenticada. |
| Severidad | **Alta** para integración/QA: no se puede acreditar disponibilidad del componente que guarda y sirve archivos. No hay evidencia de pérdida de datos ni una causa raíz confirmada. |
| Roles afectados | Mecánico para carga/consulta; Cliente y Administrador para consulta de fotografías. Es impacto potencial en operaciones pendientes, no tres fallos autenticados ejecutados. |
| Impacto sobre MS4 | Bloquea certificar el flujo real multimedia y la disponibilidad del almacenamiento. No demuestra que el listado de metadatos falle: no se consultó con token. |
| Evidencia | [NET-MS4-STORAGE, HEALTH y DB](evidencias/SCRUM-156-http.json), con estado y hash de cuerpo; [registro histórico](../integracion-ms4-evidencias.md). |
| Estado | **Abierta, dependencia backend**. No se alteró el servicio remoto ni su configuración. |
| Acción propuesta | Responsable del backend debe revisar configuración/acceso al almacenamiento y sus logs, restablecer salud 200 y proporcionar entorno QA. Después repetir salud, carga autorizada, lista y descarga con cuentas de los tres roles y archivos no personales. No atribuir el fallo a credenciales, bucket o red específicos sin logs. |

## MS4-BARREL — exportaciones de errores desde módulo incorrecto

| Campo | Hecho / alcance |
| --- | --- |
| Descripción y contexto | `src/services/index.ts` exportaba `getGlobalErrorMessage`, `isConnectivityOrTimeoutError` y `normalizeNotificationServiceError` desde evidence.service, que no los define; las funciones están en service-error. |
| Reproducción antes de corregir | En base `872a862`, leer esas exportaciones y ejecutar `npm run typecheck` y la suite `__tests__/services-public-exports.test.ts`. El fallo de identidad no depende de cuentas ni backend. |
| Esperado | Helpers exportados como funciones con identidad igual a su módulo origen; TypeScript compila. |
| Observado | Tres TS2305 y helper `getGlobalErrorMessage` igual a undefined al importar el barrel. [Herramientas antes de corregir](evidencias/SCRUM-219-herramientas.txt); [suite completa previa](evidencias/SCRUM-156-tests.json): 1258 PASS/1 FAIL. |
| Severidad | **Alta** local: impide completar comprobación de tipos y rompe la API pública de errores. |
| Roles afectados e impacto MS4 | Transversal a los tres roles; importar errores desde el barrel podía entregar valores indefinidos. Afecta la confiabilidad del manejo y pruebas de errores de evidencias, no prueba una denegación backend. |
| Corrección | Reexportar los tres helpers desde `./service-error`, conservando sus nombres públicos. No duplicar implementaciones. |
| Validación | `npm run typecheck` PASS; prueba existente verifica todas las exportaciones y su identidad. Suite completa **1259 PASS/0 FAIL**, regresión **841 PASS/0 FAIL**; [resumen](evidencias/SCRUM-157-tests.json), [regresión](evidencias/SCRUM-157-regresion-tests.json), [herramientas](evidencias/SCRUM-157-herramientas.txt). |
| Estado / acción | **Corregida localmente** en SCRUM-157. Conservar la suite de exportaciones como detección de regresión; no requiere cambios backend. |

## MS4-MATRIX — documentación de endpoints sin respaldo

| Campo | Hecho / alcance |
| --- | --- |
| Descripción y contexto | La matriz previa declaraba alineados GET `/ordenes/{id}/evidencias`, un fallback y DELETE `/evidencias/{id}`, además de métodos/modelos que no corresponden a la implementación actual. |
| Reproducción | Comparar la sección MS4 de la matriz en base `872a862` con `src/services/evidence.service.ts`, DTO/mapper y los paths/métodos del contrato observado. No hay DELETE publicado ni `deleteEvidence` implementado. |
| Esperado | La evidencia de cobertura señala solo endpoints/operaciones implementados y distingue revisión de contrato de prueba real. |
| Observado | La tabla omitía GET `/evidencias/{id}/descarga`, incluía operaciones no respaldadas y un resumen «100 % Alineado». Eso podía orientar QA a rutas incorrectas. |
| Severidad | **Media**: daña trazabilidad y criterios de consulta multimedia, sin demostrar fallo del backend. |
| Roles afectados e impacto MS4 | Cliente, Mecánico y Administrador; listas/descargas y evaluación de cobertura. |
| Corrección y evidencia | Se corrigió únicamente la sección/resumen MS4 en la [matriz existente](../matriz-endpoint-dto-modelo.md); se retuvo DELETE como referencia histórica identificada sin respaldo. [Contrato observado](evidencias/SCRUM-157-ms4-contrato.json), [servicio](../../src/services/evidence.service.ts), [DTO](../../src/dto/evidence.dto.ts), [mapper](../../src/mappers/evidence.mapper.ts). |
| Estado / acción | **Corregida documentalmente**; mantener pendiente la integración autenticada. No se certifican en este ticket las otras secciones de la matriz. |

## QA-REAL-BLOCKED — ausencia de evidencia autenticada por rol

| Campo | Hecho / alcance |
| --- | --- |
| Descripción y contexto | No hay cuentas QA reales ni datasets autorizados suministrados. Las cuentas README y respuestas Jest son demo. No se obtuvo sesión real de ningún rol. |
| Reproducción | Revisar configuración local disponible (solo URL/banderas, sin secretos), README y requisitos de los checklists. Intentar planificar cada escenario exige cuenta/datos y ejecución Expo todavía no disponibles. No se adivinan credenciales ni se usa una cuenta demo para afirmar login backend. |
| Esperado / observado | Esperado: ejecución y evidencia por rol. Observado: **64 casos reales BLOCKED**; las únicas solicitudes reales fueron anónimas, y los flujos funcionales usan mocks. |
| Severidad | **Alta para aceptación del sprint**, distinta de un defecto funcional comprobado. |
| Roles e impacto MS4 | Tres roles: no se certifican visibilidad, propiedad, carga y enlaces temporales de fotografías contra el servidor. |
| Evidencia | [Matriz y fuentes canónicas](SCRUM-156-evidencias-consolidadas.md), [auth](SCRUM-216-checklist-autenticacion.md), [Cliente](SCRUM-217-consultas-cliente.md), [Mecánico](SCRUM-218-checklist-mecanico.md), [Administrador](SCRUM-219-checklist-administrador.md). |
| Estado / acción | **Bloqueada por dependencias**. Proveer acceso local seguro a QA/cuentas, datos propios y ajenos, dispositivo/navegador y controles de red/expiración. No guardar contraseñas, tokens o datos personales en Git. SCRUM-158 conserva borrador/corrección sin commit hasta validar la parte real. |

## Validación del registro

Cada incidencia tiene observación, pasos, esperado, observado, severidad, roles, impacto, evidencia, estado y acción. La salud se observó el 11-11-2026 UTC; las herramientas finales corrieron el 12-11-2026 UTC (11-11 en Santiago). El [snapshot final](evidencias/SCRUM-157-tests.json) reemplaza el fallo local del snapshot SCRUM-156; aquel registro histórico se conserva sin reescribir sus resultados.

Las herramientas finales incluyen la corrección **sin commit** de `test-utils/index.ts` perteneciente a SCRUM-158. Sus resultados corresponden al árbol de trabajo, con mocks, no al checkout limpio de los seis commits independientes. No se presenta el bundle Android como prueba de dispositivo ni los 401 como autorización entre roles. `npm run lint`: 0 errores/46 advertencias previas; exportación Android y TypeScript PASS. [Comandos y resultados](evidencias/SCRUM-157-herramientas.txt).

Control documental: `python3 scripts/validate-sprint3-docs.py` y revisión de diff/secretos; [resultado](evidencias/SCRUM-157-validacion.txt). `git diff --check` y control staged sin errores. Los commits se mantienen locales en Victor; no se hizo push.
