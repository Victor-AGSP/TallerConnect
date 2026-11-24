# SCRUM-231 — acta de verificación final por rol

Fecha: 2026-11-24. Rama `Victor`, código en `4e773ac`. Estado inicial: **PENDING**. Resultado: **matriz registrada**; verificaciones automatizadas PASS; verificaciones autenticadas reales BLOCKED; Android NOT RUN.

## Roles definidos en el sistema

`src/constants/roles.ts`: `cliente`, `mecanico`, `administrador`. Cada uno tiene su grupo de rutas (`(cliente)`, `(mecanico)`, `(admin)`) protegido por `RoleGuard`; `(auth)/login` es la única ruta pública. No existen otros roles.

## Tipos de prueba y entornos

| Código | Tipo | Entorno |
| --- | --- | --- |
| JEST | Jest con rutas y servicios reales, `apiClient` sustituido | Local, sin red; ejecución final `4e773ac` (90 suites / 1441 PASS — [JSON](evidencias/final-suite.json)) |
| HTTP-ANON | GET sin token | Gateway vigente `api-tallerconnect.inf.uct.cl` ([sondas](../semana-3/evidencias/SCRUM-164-http.json)) |
| REAL-AUTH | Sesión real por rol | Gateway vigente — **sin cuentas autorizadas** |
| ANDROID | Dispositivo o emulador | **No disponible** |

Ninguna validación autenticada real se declara aprobada: no se recibieron cuentas de prueba autorizadas.

## Matriz

Conteos «n PASS» = pruebas de la suite en la ejecución final; las suites cubren más de una fila y no se suman.

| ID | Rol | Funcionalidad | Resultado esperado | Resultado observado | Tipo | Entorno | Estado | Evidencia | Commit |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RV-01 | Todos | Acceso anónimo a rutas protegidas | Redirección a `/login`, sin llamadas a la API | Redirige; 0 llamadas | JEST | Local | PASS | `protected-routes` 16 PASS; `cliente-navigation-flow` 12 PASS | `869b226`, `9cb4144` |
| RV-02 | Todos | API rechaza peticiones sin token | 401 en MS1 y MS4 | 401 «No autenticado» | HTTP-ANON | Gateway vigente | PASS | [sondas](../semana-3/evidencias/SCRUM-164-http.json) | `37d8da9` |
| RV-03 | Todos | Login → ruta del rol; logout → `/login` | Destino por rol; sesión eliminada | Correcto | JEST | Local | PASS | `auth-full-flow` 9 PASS; `services-session-navigation` 5 PASS | `869b226` |
| RV-04 | Todos | Login real y persistencia de sesión | Sesión válida tras reinicio | No ejecutado: sin cuentas | REAL-AUTH | Gateway vigente | BLOCKED | Cuentas de QA pendientes | — |
| RV-05 | Cliente | Confinamiento de rutas | `/administrador` y `/mecanico` → `/cliente` | Redirige | JEST | Local | PASS | `cliente-navigation-flow` 12 PASS; `role-access-restrictions` 15 PASS | `9cb4144`, `869b226` |
| RV-06 | Cliente | Mis vehículos: datos, vacío y error distinguidos | Tarjetas / «Sin vehículos» / error con reintento | Correcto, incl. 500/503/timeout/red/inválido | JEST | Local | PASS | `list-error-empty-regression` 51 PASS; `http-500-client-states` 5 PASS | `48c8871`, `3a4edfb` |
| RV-07 | Cliente | Solo órdenes de su vehículo | No muestra órdenes ajenas | Correcto | JEST | Local | PASS | `order-client-scope` 8 PASS | `d37ddaa` |
| RV-08 | Cliente | Presupuesto: ver y decidir; sin acciones de personal | Aprobar/rechazar solo Cliente | Correcto | JEST | Local | PASS | `budget-views-integration` 23 PASS; `budget-flow-integration` 4 PASS | `869b226` |
| RV-09 | Cliente | Evidencias: solo visibles, sin datos internos; ajena → 404 | Alcance MS4 respetado | Correcto | JEST | Local | PASS | `evidence-role-visibility` 27 PASS | `869b226` |
| RV-10 | Cliente | Sin herramientas del Mecánico en la orden | Sin avances ni captura | Correcto | JEST | Local | PASS | `cliente-navigation-flow` 12 PASS | `9cb4144` |
| RV-11 | Cliente | Portal sin cifras ficticias; demo identificada | Real sin cifras; demo derivada de su fuente | Correcto | JEST | Local | PASS | `cliente-portal-figures` 7 PASS; `hardcoded-figures-detection` 12 PASS | `01cbaf9`, `87c0520` |
| RV-12 | Cliente | Flujo completo con datos reales propios y ajenos | Solo recursos propios | No ejecutado: sin cuentas ni dataset | REAL-AUTH | Gateway vigente | BLOCKED | Cuentas de QA pendientes | — |
| RV-13 | Cliente | Navegación en Android (atrás físico, reinicio) | Igual que JEST | No ejecutado: sin dispositivo | ANDROID | — | NOT RUN | [SCRUM-226](../semana-3/SCRUM-226.md) | — |
| RV-14 | Mecánico | Confinamiento de rutas y acceso a su grupo | Solo `(mecanico)` | Correcto | JEST | Local | PASS | `protected-routes` 16 PASS; `role-access-restrictions` 15 PASS | `869b226` |
| RV-15 | Mecánico | Vehículos/órdenes asignados e inventario sin actividad inventada | Datos de servicio; error ≠ vacío | Correcto | JEST | Local | PASS | `mecanico-real` 4 PASS; `vehicle-list-integration` 16 PASS | `b158d36`, `65e9548` |
| RV-16 | Mecánico | Sin acceso a presupuesto desde la orden | Botón ausente | Correcto | JEST | Local | PASS | `budget-views-integration` 23 PASS | `869b226` |
| RV-17 | Mecánico | Avances (bitácora) y captura de evidencias | Solo Mecánico; estados de carga | Correcto | JEST | Local | PASS | `evidence-mechanic-updates` 22 PASS; `evidence-capture` 15 PASS | `cfc24de` |
| RV-18 | Mecánico | Evidencias de orden no asignada | 404 informado, sin datos | Correcto | JEST | Local | PASS | `evidence-role-visibility` 27 PASS | `869b226` |
| RV-19 | Mecánico | Flujo real con orden asignada y no asignada | Alcance MS2/MS4 | No ejecutado: sin cuentas | REAL-AUTH | Gateway vigente | BLOCKED | Cuentas de QA pendientes | — |
| RV-20 | Administrador | Confinamiento de rutas | Solo `(admin)` | Correcto | JEST | Local | PASS | `protected-routes` 16 PASS | `869b226` |
| RV-21 | Administrador | Métricas reales; fallo → «No disponible» | Sin «0» inventado | Correcto | JEST | Local | PASS | `hardcoded-figures-detection` 12 PASS; `admin-query-states` 4 PASS | `87c0520`, `65e9548` |
| RV-22 | Administrador | Agregación de servicios y avisos | Datos de 6 servicios; errores visibles | Correcto | JEST | Local | PASS | `admin-services-integration` 6 PASS; `admin-notice-validation` 15 PASS | `bbf7dd8`, `65e9548` |
| RV-23 | Administrador | Presupuesto visible sin decisión | No puede aprobar/rechazar | Correcto | JEST | Local | PASS | `budget-views-integration` 23 PASS | `869b226` |
| RV-24 | Administrador | Evidencias incluidas eliminadas | Ve todas con estado | Correcto | JEST | Local | PASS | `evidence-role-visibility` 27 PASS | `869b226` |
| RV-25 | Administrador | Repuestos y proveedores con paginación | Listas, vacío y error | Correcto | JEST | Local | PASS | `parts-views-integration` 29 PASS | `bbf7dd8` |
| RV-26 | Administrador | Flujo real de gestión | Datos de todos los clientes | No ejecutado: sin cuentas | REAL-AUTH | Gateway vigente | BLOCKED | Cuentas de QA pendientes | — |
| RV-27 | Mecánico / Administrador | Navegación en Android | Igual que JEST | No ejecutado: sin dispositivo | ANDROID | — | NOT RUN | SCRUM-226 | — |
| RV-28 | Todos (modo demo) | Datos simulados identificados | Franja visible; MS4 sin simulación | Correcto | JEST | Local | PASS | `demo-mode-banner` 6 PASS | `77a1a81` |

## Resumen

| Estado | Filas |
| --- | --- |
| PASS | 22 (21 JEST, 1 HTTP-ANON) |
| FAIL | 0 |
| BLOCKED | 4 (REAL-AUTH: RV-04, RV-12, RV-19, RV-26) |
| NOT RUN | 2 (ANDROID: RV-13, RV-27) |

La separación de permisos está verificada en la **interfaz** y en el rechazo anónimo de la **API**. Que la API limite cada recurso al rol y al propietario correctos solo se puede afirmar con sesiones reales (BLOCKED). Para cerrar las filas BLOCKED se necesitan cuentas autorizadas de los tres roles, dos clientes (propietario y ajeno) y una orden asignada y otra no asignada, como se solicitó en [SCRUM-167](SCRUM-167.md).

Hash: `git log -1 --format=%H -- docs/sprint-3/semana-4/SCRUM-231.md`.
