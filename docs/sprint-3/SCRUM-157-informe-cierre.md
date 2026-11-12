# Informe de cierre local — Sprint 3, Victor

Revisión 11-11-2026 America/Santiago; herramientas finales 12-11-2026 UTC. Se prepararon **seis commits independientes**, sin push. SCRUM-158 sigue bloqueado y conserva su trabajo sin commit; no se simula un séptimo cierre real.

| Ticket | Estado | Validaciones | Evidencia | Commit |
| --- | --- | --- | --- | --- |
| SCRUM-158 | BLOCKED real, borrador y corrección sin commit | Revisión de auth/rutas; 153 pruebas seleccionadas con mocks; HTTP auth/me 401 | [Borrador](SCRUM-158-autenticacion.md), [auth](evidencias/SCRUM-216-auth.json) | No creado |
| SCRUM-216 | Checklist validado; 27 casos reales BLOCKED | Coherencia, campos y referencias; soporte automatizado explícito | [Checklist](SCRUM-216-checklist-autenticacion.md), evidencias SCRUM-216-* | 830263c |
| SCRUM-217 | Evidencia organizada; 12 casos reales BLOCKED | Trazabilidad y 4 sondas anónimas; 85 PASS/1 FAIL inicial, fallo corregido en 219 | [Consultas Cliente](SCRUM-217-consultas-cliente.md), evidencias SCRUM-217-* | 1be932a |
| SCRUM-218 | Checklist validado; 12 casos reales BLOCKED | Trazabilidad; 83 PASS con mocks; asignados 401 sin token | [Checklist Mecánico](SCRUM-218-checklist-mecanico.md), evidencias SCRUM-218-* | ffa027e |
| SCRUM-219 | Checklist/correcciones validados; 13 casos reales BLOCKED | 99 PASS con mocks; lint 0 errores; TS restante resuelto en 157 | [Checklist Administrador](SCRUM-219-checklist-administrador.md), evidencias SCRUM-219-* | 65e9548 |
| SCRUM-156 | Consolidación validada; aceptación real pendiente | 149 filas únicas y 64 casos trazables; snapshot 1258 PASS/1 FAIL, resuelto luego | [Índice central](SCRUM-156-evidencias-consolidadas.md), [matriz](evidencias/SCRUM-156-matriz.csv) | b17653e |
| SCRUM-157 | Incidencias registradas; correcciones locales validadas | 1259 PASS, regresión 841 PASS, tipos/lint/export PASS; storage externo abierto | [Incidencias](SCRUM-157-incidencias-ms4.md), [herramientas](evidencias/SCRUM-157-herramientas.txt) | Commit que contiene este informe; ver git log |

## Conteos y límites

- Suite completa final: **1259 PASS, 0 FAIL**, 74 suites. Cuatro casos nuevos verifican carga/reintento administrativos.
- Regresión final: **841 PASS, 0 FAIL**, 41 suites; es subconjunto, no sumar al total anterior.
- Backend real sin token: **10 PASS, 1 FAIL**, 11 sondas únicas; storage MS4 respondió 503. El contrato MS4 también se descargó con 200, pero se registra como metadatos de revisión, fuera de estas 11 sondas.
- Casos autenticados reales: **0 PASS, 0 FAIL ejecutados, 64 BLOCKED**. No son tests Jest omitidos: son checklists pendientes por cuentas/dataset/QA y ejecución Expo.
- Tipos: exit 0. Lint: exit 0, 0 errores/46 advertencias previas. Exportación Android: exit 0; exportar no equivale a usar un dispositivo.
- Las herramientas finales se ejecutaron con node_modules preexistente y la corrección **sin commit** de test-utils de SCRUM-158. Los seis commits sin esa corrección no reproducen las pruebas de navegación aprobadas. Se conserva el archivo modificado y su SHA-256 en los registros.
- Los snapshots antiguos no se reescribieron: baseline 1117 PASS/138 FAIL; consolidación inicial 1252/7 y snapshot final de SCRUM-156 1258/1. El snapshot actual de SCRUM-157 1259/0 refleja las correcciones posteriores.

## Errores y correcciones

1. Matcher de rutas usaba módulo privado ausente de Expo: se usa matcher público; corrección pendiente sin commit en SCRUM-158.
2. Reintento administrativo usaba setter inexistente y no mostraba carga inicial: corregido con cuatro pruebas funcionales en SCRUM-219; también se resolvieron dos errores de lint en efectos de consultas administrativas.
3. Expectativas de navegación/avisos derivados y de mensajes desconocidos/503 desactualizadas: ajustadas en SCRUM-219 y SCRUM-156, manteniendo aserciones sobre rutas, tokens, conteos y rechazo de errores; caso 500 conserva mensaje distinto.
4. Tres helpers de errores exportados desde módulo equivocado: corregidos en SCRUM-157, validados por la suite existente de exportaciones.
5. Matriz MS4 anunciaba rutas/métodos no respaldados y omitía descarga: sección MS4 corregida y referencia histórica DELETE retenida como no respaldada.
6. Storage MS4 503: confirmado, **abierto en backend**; no se atribuye causa raíz ni se afirma haber ejecutado una subida fallida.

## Dependencias pendientes

Faltan cuentas reales seguras de Cliente/Mecánico/Administrador, URL/entorno QA identificado, datasets propios/ajenos y vacíos autorizados, controles de expiración/red y ejecución Expo en dispositivo o navegador instrumentado. Se requiere recuperar storage MS4 para certificar el flujo multimedia. Los usuarios README son demo; no se usaron como cuentas backend. No se enviaron contraseñas/tokens ni se agregaron secretos o datos personales a Git. GitHub Issues no devolvió resultados; no hay criterios/comentarios adicionales recuperados.

## Archivos por ticket

SCRUM-158, conservados sin commit:

- [test-utils/index.ts](../../test-utils/index.ts)
- [Borrador de autenticación](SCRUM-158-autenticacion.md)
- [Baseline automatizado](evidencias/SCRUM-158-baseline.json)

SCRUM-216, `830263c`:

- [docs/sprint-3/SCRUM-216-checklist-autenticacion.md](<SCRUM-216-checklist-autenticacion.md>)
- [docs/sprint-3/evidencias/SCRUM-216-auth.json](<evidencias/SCRUM-216-auth.json>)
- [docs/sprint-3/evidencias/SCRUM-216-http.json](<evidencias/SCRUM-216-http.json>)
- [docs/sprint-3/evidencias/SCRUM-216-validacion.txt](<evidencias/SCRUM-216-validacion.txt>)
- [scripts/validate-sprint3-docs.py](<../../scripts/validate-sprint3-docs.py>)

SCRUM-217, `1be932a`:

- [docs/sprint-3/SCRUM-217-consultas-cliente.md](<SCRUM-217-consultas-cliente.md>)
- [docs/sprint-3/evidencias/SCRUM-217-http.json](<evidencias/SCRUM-217-http.json>)
- [docs/sprint-3/evidencias/SCRUM-217-tests.json](<evidencias/SCRUM-217-tests.json>)
- [docs/sprint-3/evidencias/SCRUM-217-validacion.txt](<evidencias/SCRUM-217-validacion.txt>)
- [scripts/validate-sprint3-docs.py](<../../scripts/validate-sprint3-docs.py>)
- [src/app/(cliente)/mis-vehiculos.tsx](<../../src/app/(cliente)/mis-vehiculos.tsx>)

SCRUM-218, `ffa027e`:

- [docs/sprint-3/SCRUM-218-checklist-mecanico.md](<SCRUM-218-checklist-mecanico.md>)
- [docs/sprint-3/evidencias/SCRUM-218-http.json](<evidencias/SCRUM-218-http.json>)
- [docs/sprint-3/evidencias/SCRUM-218-tests.json](<evidencias/SCRUM-218-tests.json>)
- [docs/sprint-3/evidencias/SCRUM-218-validacion.txt](<evidencias/SCRUM-218-validacion.txt>)

SCRUM-219, `65e9548`:

- [__tests__/admin-notice-validation.test.ts](<../../__tests__/admin-notice-validation.test.ts>)
- [__tests__/admin-query-states.test.tsx](<../../__tests__/admin-query-states.test.tsx>)
- [__tests__/vehicle-list-integration.test.tsx](<../../__tests__/vehicle-list-integration.test.tsx>)
- [docs/sprint-3/SCRUM-219-checklist-administrador.md](<SCRUM-219-checklist-administrador.md>)
- [docs/sprint-3/evidencias/SCRUM-219-herramientas.txt](<evidencias/SCRUM-219-herramientas.txt>)
- [docs/sprint-3/evidencias/SCRUM-219-http.json](<evidencias/SCRUM-219-http.json>)
- [docs/sprint-3/evidencias/SCRUM-219-tests.json](<evidencias/SCRUM-219-tests.json>)
- [docs/sprint-3/evidencias/SCRUM-219-validacion.txt](<evidencias/SCRUM-219-validacion.txt>)
- [src/app/(admin)/administrador.tsx](<../../src/app/(admin)/administrador.tsx>)
- [src/app/(admin)/ordenes/index.tsx](<../../src/app/(admin)/ordenes/index.tsx>)

SCRUM-156, `b17653e`:

- [__tests__/budget-service.test.ts](<../../__tests__/budget-service.test.ts>)
- [__tests__/order-functional.test.tsx](<../../__tests__/order-functional.test.tsx>)
- [__tests__/order-view-states.test.tsx](<../../__tests__/order-view-states.test.tsx>)
- [__tests__/parts-service.test.ts](<../../__tests__/parts-service.test.ts>)
- [docs/sprint-3/SCRUM-156-evidencias-consolidadas.md](<SCRUM-156-evidencias-consolidadas.md>)
- [docs/sprint-3/evidencias/SCRUM-156-http.json](<evidencias/SCRUM-156-http.json>)
- [docs/sprint-3/evidencias/SCRUM-156-inicial-tests.json](<evidencias/SCRUM-156-inicial-tests.json>)
- [docs/sprint-3/evidencias/SCRUM-156-matriz.csv](<evidencias/SCRUM-156-matriz.csv>)
- [docs/sprint-3/evidencias/SCRUM-156-tests.json](<evidencias/SCRUM-156-tests.json>)
- [docs/sprint-3/evidencias/SCRUM-156-validacion.txt](<evidencias/SCRUM-156-validacion.txt>)
- [scripts/validate-sprint3-docs.py](<../../scripts/validate-sprint3-docs.py>)

SCRUM-157, commit que contiene este informe:

- [src/services/index.ts](<../../src/services/index.ts>)
- [docs/matriz-endpoint-dto-modelo.md](<../matriz-endpoint-dto-modelo.md>)
- [docs/sprint-3/SCRUM-157-incidencias-ms4.md](<SCRUM-157-incidencias-ms4.md>)
- [docs/sprint-3/SCRUM-157-informe-cierre.md](<SCRUM-157-informe-cierre.md>)
- [docs/sprint-3/evidencias/SCRUM-157-ms4-contrato.json](<evidencias/SCRUM-157-ms4-contrato.json>)
- [docs/sprint-3/evidencias/SCRUM-157-tests.json](<evidencias/SCRUM-157-tests.json>)
- [docs/sprint-3/evidencias/SCRUM-157-regresion-tests.json](<evidencias/SCRUM-157-regresion-tests.json>)
- [docs/sprint-3/evidencias/SCRUM-157-herramientas.txt](<evidencias/SCRUM-157-herramientas.txt>)
- [docs/sprint-3/evidencias/SCRUM-157-validacion.txt](<evidencias/SCRUM-157-validacion.txt>)

## Estado Git previsto al terminar el commit de SCRUM-157

Rama `Victor`; sin merge, rebase, reset ni modificaciones de main/Develop. Sin push. Deben quedar exclusivamente estos cambios sin confirmar, todos de SCRUM-158: modificación de `test-utils/index.ts`, borrador `docs/sprint-3/SCRUM-158-autenticacion.md` y baseline `docs/sprint-3/evidencias/SCRUM-158-baseline.json`. El informe final de la conversación verifica el estado y hash del último commit después de crearlo.

`git log -7 --oneline` debe mostrar el commit de SCRUM-157, los cinco commits independientes anteriores y `872a862 Merge Develop into Victor - integracion pendiente de QA` como séptima entrada histórica, que no es trabajo de este sprint. No se presenta ese merge preexistente como séptimo commit nuevo.
