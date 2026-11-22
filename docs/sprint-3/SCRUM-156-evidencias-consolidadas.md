# SCRUM-156 — evidencia consolidada de los tres roles

**Estado posterior con cuentas informadas:** [consolidación actual](SCRUM-156-consolidacion-actual.md): 3 PASS de formulario anónimo en Expo Web y 61 casos BLOCKED, sin autenticación backend verificada. Este documento y su matriz de 149 filas conservan el snapshot de la primera entrega; no deben interpretarse como el resultado más reciente de AUTH-*-03.

Fecha de revisión: 11-11-2026, rama `Victor`. **Consolidación documental validada; pruebas reales autenticadas pendientes**. Los siete tickets se interpretan según la solicitud del usuario: las búsquedas de GitHub Issues no devolvieron criterios ni comentarios recuperables. No se inventaron cuentas, respuestas, capturas ni permisos backend.

## Índice central

La [matriz CSV](evidencias/SCRUM-156-matriz.csv) contiene 149 filas: 64 casos reales BLOCKED, 11 sondas HTTP reales anónimas y 74 suites automatizadas. Cada fila registra rol, funcionalidad, ticket, ID, resultado, fecha de ejecución (o «No ejecutada»), entorno, referencia existente, incidencia y tipo. Las 74 suites contienen 1259 pruebas individuales; una fila por suite evita duplicar todos los títulos de Jest. Las consultas por rol y sus pasos completos permanecen en el documento canónico indicado.

| Rol / ámbito | Funcionalidad y ticket | IDs / resultado | Fecha y entorno | Evidencia canónica | Incidencias o límites |
| --- | --- | --- | --- | --- | --- |
| Cliente | Autenticación, SCRUM-158/216 | AUTH-C-01…09, BLOCKED | No ejecutadas; QA pendiente | [Checklist](SCRUM-216-checklist-autenticacion.md) | B-ACCOUNTS, B-DEVICE, B-ERRORS |
| Mecánico | Autenticación, SCRUM-158/216 | AUTH-M-01…09, BLOCKED | No ejecutadas; QA pendiente | [Checklist](SCRUM-216-checklist-autenticacion.md) | Mismas dependencias |
| Administrador | Autenticación, SCRUM-158/216 | AUTH-A-01…09, BLOCKED | No ejecutadas; QA pendiente | [Checklist](SCRUM-216-checklist-autenticacion.md) | Mismas dependencias |
| Cliente | Vehículos, órdenes, presupuesto, fotos, SCRUM-217 | CQ-01…12, BLOCKED | No ejecutadas; QA pendiente | [Inventario y casos](SCRUM-217-consultas-cliente.md) | MS4 storage 503; home/presupuesto demo separados |
| Mecánico | Asignaciones, detalle, bitácora, fotos, SCRUM-218 | MQ-01…12, BLOCKED | No ejecutadas; QA pendiente | [Checklist](SCRUM-218-checklist-mecanico.md) | MS4 storage 503; home/inventario demo separados |
| Administrador y acceso cruzado | Panel, dominios y permisos, SCRUM-219 | AQ-01…13, BLOCKED | No ejecutadas; QA pendiente | [Checklist y correcciones](SCRUM-219-checklist-administrador.md) | Exclusividad HTTP de lectura no siempre documentada |
| Anónimo | Sesión y siete consultas de dominio | NET-* de los registros HTTP: 8 PASS | 11-11-2026 UTC; despliegue configurado, sin token | [Auth](evidencias/SCRUM-216-http.json), [Cliente](evidencias/SCRUM-217-http.json), [asignados](evidencias/SCRUM-218-http.json), [catálogos](evidencias/SCRUM-219-http.json) | Solo rechazo 401; no acredita autorización entre roles |
| Anónimo | Salud MS4 / base / storage | NET-MS4-HEALTH y DB PASS; STORAGE FAIL | 11-11-2026 UTC; despliegue configurado | [Registro de salud](evidencias/SCRUM-156-http.json) | Storage devuelve 503; no se ejecutaron subidas |
| Tres roles, soporte con mocks | Autenticación y rutas, SCRUM-216 | AUTO-AUTH, 153 PASS | 11-11-2026 UTC; Jest | [Resumen](evidencias/SCRUM-216-auth.json) | Corrección pendiente sin commit de SCRUM-158 |
| Cliente, soporte con mocks | Consultas, SCRUM-217 | 85 PASS / 1 FAIL en ese momento | 11-11-2026 UTC; Jest | [Snapshot histórico](evidencias/SCRUM-217-tests.json) | Expectativa de navegación admin corregida en SCRUM-219 |
| Mecánico, soporte con mocks | Flujo, bitácora, evidencias, SCRUM-218 | 83 PASS | 11-11-2026 UTC; Jest | [Resumen](evidencias/SCRUM-218-tests.json) | No prueba permisos nativos ni backend |
| Administrador, soporte con mocks | Consultas, carga/reintento y guardas, SCRUM-219 | 99 PASS | 11-11-2026 UTC; Jest | [Resumen](evidencias/SCRUM-219-tests.json) | Cuatro pruebas nuevas; TypeScript aún bloqueado por barrel MS4 |
| Transversal | Todas las pruebas, SCRUM-156 | AUTO156-001…074; **1258 PASS / 1 FAIL** | 11-11-2026 UTC; Jest, Node v26.12.1 | [Snapshot final de este ticket](evidencias/SCRUM-156-tests.json) | MS4-BARREL pendiente de SCRUM-157 |

## Interpretación y procedencia

Las ejecuciones automatizadas usan respuestas construidas o adaptadores mock. Aunque una suite use el cliente Axios y componentes reales, no se considera integración con un servidor real. Sus resultados **no se suman** entre tickets: hay suites compartidas y ejecuciones repetidas. El snapshot completo de SCRUM-156 es la referencia del estado automatizado en este punto; los resúmenes anteriores conservan lo que se observó entonces, incluidos fallos corregidos después.

Las sondas usan GET sin credenciales, cookies ni cambios de datos; sus JSON contienen códigos y metadatos mínimos, con hashes de cuerpo cuando se conservaron. Los cuerpos transitorios quedaron fuera de Git. La URL local inspeccionada estaba etiquetada producción; no se cambió `.env` ni se usaron cuentas demo contra ella. El ID de orden de la sonda MS4 procede de documentación histórica y no prueba que exista una orden consultable por usuario. La imposibilidad DNS dentro del sandbox se resolvió con red autorizada del host.

Las pruebas se ejecutaron con node_modules ya instalado en el workspace, sin `npm ci`; puede diferir del lock de Victor. Incluyen la corrección de `test-utils/index.ts` de SCRUM-158 **todavía sin commit**, que elimina un matcher privado ausente y usa el público de Expo. El SHA-256 de esa versión consta en [AUTO-AUTH](evidencias/SCRUM-216-auth.json). Los resultados describen ese árbol de trabajo; no garantizan el árbol limpio de un checkout de estos commits sin ese cambio pendiente. SCRUM-158 permanece sin commit ni aceptación real.

Documentos históricos preservados: [integración MS4](../integracion-ms4-evidencias.md), [JWT](../jwt-y-sesion.md), [matriz de contratos](../matriz-endpoint-dto-modelo.md), [integración de órdenes](../integracion-cruzada-ordenes.md). Los datos históricos no se presentan como observaciones actuales. No hay material multimedia real nuevo que ordenar; se enlazan las fuentes existentes, sin borrar ni duplicar archivos del equipo.

## Incidencias observadas y coherencia temporal

MS4-STORAGE-503: `/ms4/health/storage` respondió 503 frente a 200 esperado; salud y base de datos respondieron 200. No demuestra por sí solo una subida fallida ni pérdida de archivos. Impide afirmar disponibilidad del almacenamiento y mantiene pendientes las fotos reales.

MS4-BARREL: `src/services/index.ts` reexporta tres helpers desde evidence.service aunque pertenecen a service-error. TypeScript falla y la prueba de exportaciones públicas encuentra `undefined`. Corrección y registro de incidencia corresponden al siguiente ticket, SCRUM-157.

La primera ejecución completa de consolidación dio [1252 PASS / 7 FAIL](evidencias/SCRUM-156-inicial-tests.json). Se corrigieron seis expectativas desactualizadas en cuatro suites: dos recorridos administrativos ahora verifican también las consultas de avisos derivados; cuatro casos HTTP 503 esperan el mensaje específico de indisponibilidad. El caso 500 conserva su mensaje distinto; no se eliminaron aserciones sobre rutas, token, rechazo o conteos. Tras esas correcciones, la suite completa da 1258 PASS / 1 FAIL, únicamente el barrel pendiente. Son ajustes de pruebas de integración para que la evidencia represente el comportamiento implementado; no cambian backend ni código de aplicación.

## Validación de SCRUM-156

`npm test -- --watchman=false --json --outputFile=/tmp/tallerconnect-sprint3/consolidated-final.json`: exit 1 por MS4-BARREL; resultado exacto conservado, no presentado como éxito global. TypeScript seguía con los tres errores del mismo barrel y lint había terminado con 0 errores/46 advertencias en SCRUM-219; no se modificó código de aplicación desde esa comprobación. Integración autenticada, navegación Expo y permisos nativos continúan BLOCKED.

`python3 scripts/validate-sprint3-docs.py docs/sprint-3/SCRUM-216-checklist-autenticacion.md docs/sprint-3/SCRUM-217-consultas-cliente.md docs/sprint-3/SCRUM-218-checklist-mecanico.md docs/sprint-3/SCRUM-219-checklist-administrador.md docs/sprint-3/SCRUM-156-evidencias-consolidadas.md`: verifica campos de casos, links existentes, IDs únicos, correspondencia CSV/checklist, conteos JSON y estados HTTP. Revisión de secretos y `git diff --check` sin hallazgos; [salida documental](evidencias/SCRUM-156-validacion.txt). La consolidación es verificable aun cuando documenta pruebas fallidas y bloqueadas.
