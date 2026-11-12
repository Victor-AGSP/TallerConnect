# SCRUM-156 — consolidación actual con cuentas informadas

Actualización 12-11-2026 UTC. **Las tres identidades de prueba fueron proporcionadas; su existencia/activación backend todavía no se verificó.** El bloqueo principal ya no es identificar cuentas: hay que confirmar el destino QA y disponer de acceso efectivo a las contraseñas mediante configuración segura local. No se enviaron credenciales a producción.

## Resultado de los 64 casos

[Matriz actual de 64 IDs](evidencias/SCRUM-156-matriz-actual.csv): **3 PASS de UI local y 61 BLOCKED; 0 FAIL funcionales observados en los casos ejecutados**. Ningún PASS corresponde a login/consulta backend autenticada. [Ejecución de Firefox](evidencias/SCRUM-158-formulario-web.json) y [actualización de checklist](SCRUM-216-ejecucion-web.md).

| Ticket / familia | Casos del conjunto original | PASS | BLOCKED | Alcance |
| --- | --- | --- | --- | --- |
| SCRUM-158 / SCRUM-216, AUTH-* | 27 | 3 | 24 | AUTH-C-03, AUTH-M-03 y AUTH-A-03: tres repeticiones del formulario anónimo común |
| SCRUM-217, CQ-* | 12 | 0 | 12 | Consulta Cliente no ejecutada con sesión real |
| SCRUM-218, MQ-* | 12 | 0 | 12 | Consulta Mecánico no ejecutada con sesión real |
| SCRUM-219, AQ-* | 13 | 0 | 13 | Consulta Administrador/acceso cruzado no ejecutados con sesión real |
| Total | 64 | 3 | 61 | No añadir los tres controles adicionales de rutas como casos del conjunto original |

La matriz identifica rol esperado, funcionalidad, ticket, ID, resultado, fecha real o «No ejecutada», entorno, evidencia, incidencia, tipo y observación de alcance. Los tres PASS son **validación de campos antes de autenticarse**, repetida en una UI compartida. No representan actividad real de cuentas Cliente/Mecánico/Administrador ni sustituyen restricciones entre usuarios autenticados.

## Evidencia ejecutada, sin mezclar categorías

| Categoría | Resultado de esta continuación | Fuente |
| --- | --- | --- |
| UI Expo Web real sin mocks/sesión | Tres repeticiones de validación de formulario PASS; cero POST login observados | [Resultado y comandos](evidencias/SCRUM-158-formulario-web.json), [captura real única](evidencias/SCRUM-158-formulario-web-vacio.png) |
| UI Expo Web real sin sesión | `/cliente`, `/mecanico`, `/administrador` redirigen a `/login`; sin sesión persistida ni consultas privadas observadas | Mismo JSON, sección `anonymous_routes`; soporte adicional de SCRUM-158 |
| HTTP real anónimo | `/api/auth/me` 401, contrato `/ms1/openapi.json` 200 | [Preflight](evidencias/SCRUM-158-preflight-cuentas.json); no verifica las cuentas |
| Disponibilidad local | Backend `localhost:8000` no disponible | Mismo preflight; conexión rechazada, no respuesta HTTP |
| HTTP autenticado real | **0 intentos ejecutados** | QA y mecanismo seguro de contraseñas pendientes; sin contraseñas adivinadas |
| Jest con mocks | 1259 PASS / 0 FAIL, 74 suites | [Resumen SCRUM-158](evidencias/SCRUM-158-cuentas-validaciones.json); no sumar al total de casos reales |

Las tres capturas iguales se deduplicaron por SHA-256; no se editó ni se fabricó la imagen. Los campos se encontraban vacíos; los puntos son placeholder. Los resultados antiguos de [la primera matriz](evidencias/SCRUM-156-matriz.csv) y los [requisitos anteriores](evidencias/SCRUM-158-requisitos-qa.csv) se conservan como snapshots históricos, no como el estado más reciente de los tres casos ejecutados. El conteo de filas Markdown puede incluir ejecuciones de fechas distintas; **hay 64 IDs únicos en el conjunto actual**, no 67 casos.

## Tickets y dependencias actuales

| Ticket | Estado actual | Commit de esta continuación |
| --- | --- | --- |
| SCRUM-158 | Avance parcial verificable de UI anónima; **BLOCKED autenticación real** | `b15f364` |
| SCRUM-216 | Tres resultados UI registrados; 24 casos BLOCKED | `3ef891a` |
| SCRUM-217 | BLOCKED consulta real; no nuevo resultado autenticado | Sin nuevo commit de ejecución |
| SCRUM-218 | BLOCKED consulta real; no nuevo resultado autenticado | Sin nuevo commit de ejecución |
| SCRUM-219 | BLOCKED consulta real; no nuevo resultado autenticado | Sin nuevo commit de ejecución |
| SCRUM-156 | Consolidación actual verificable; aceptación autenticada pendiente | Commit que contiene este documento |

Las dependencias concretas de los 61 casos se mantienen en la [matriz de requisitos](evidencias/SCRUM-158-requisitos-qa.csv), con diagnóstico de acceso actualizado en [SCRUM-158](SCRUM-158-cuentas-y-ejecucion-web.md). Para empezar los logins: URL QA confirmada, contraseñas accesibles por mecanismo seguro local y verificación de la respuesta real de cada cuenta; luego usar sus IDs/relaciones para consultas y autorización. Necesidades posteriores: datos propios/ajenos/vacíos, política de exclusividad HTTP y controles QA para expiración, red y errores. No se presupone que un GET de catálogo sea exclusivo de Administrador.

MS4 conserva una incidencia de almacenamiento documentada históricamente, sin causa raíz confirmada; no se usa como impedimento para login y no se afirma una nueva comprobación de almacenamiento en esta continuación. El entorno web local fue temporal, sin cargar `.env`, y no se modificaron endpoints, banderas de otros desarrolladores ni datos productivos.

## Validación de SCRUM-156

Se cotejó la matriz nueva con los 64 IDs históricos y con los tres resultados observados. Se verifican estados, fechas, rutas existentes y hash del runner/captura; [salida documental](evidencias/SCRUM-156-actual-validacion.txt). TypeScript, lint y pruebas automatizadas se comprueban después de los cambios en [registro actual de herramientas](evidencias/SCRUM-156-actual-herramientas.json). Los informes de ejecución real, mocks y bloqueo se mantienen separados. No se realizó push y solo se trabajó en Victor.
