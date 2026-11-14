# SCRUM-221 — presupuesto aprobado en consulta real

Fecha: 2026-11-14. **BLOCKED: no se ejecutó consulta autenticada de un presupuesto aprobado real.** Se entregan auditoría del contrato, regresión ejecutada y procedimiento de aceptación pendiente. No se aprobó ningún presupuesto ni se enviaron decisiones productivas.

## Evidencia disponible

Contrato ya integrado: `estado_ultima_version: aprobada`, `version_vigente` y una versión con `estado: aprobada`, decisión `aprobado`, fecha e identificador de cliente. La vista muestra «Aprobado», decisión/fecha, versión, ítems e importes; la orden se identifica en el título. Una modificación posterior puede estar enviada mientras existe una versión aprobada vigente: la UI distingue ambos datos, sin afirmar que la última versión está aprobada.

Servicios y rutas revisados en [SCRUM-160](SCRUM-160.md); su corrección impide asociar detalles de otro presupuesto/orden. El test existente «muestra la decisión registrada de una versión aprobada» comprueba visualización y ausencia del formulario de decisión para esa versión. «indica la versión vigente cuando hay una modificación pendiente» comprueba esa distinción. Las pruebas de lectura/refresh/reapertura consultan nuevamente el doble HTTP, y las de servicio verifican 404 y errores de red. Son **fixtures**, sin valor probatorio de aprobación productiva ni persistencia real.

Comando: `npm test -- --runTestsByPath __tests__/budget-views-integration.test.tsx __tests__/budget-service.test.ts __tests__/budget-flow-integration.test.tsx __tests__/budget-read-refresh.test.tsx --json --outputFile=/tmp/tallerconnect-s3s2/SCRUM-221.json`. **4 suites, 81 PASS, 0 FAIL**. [Resultados completos por aserción](evidencias/SCRUM-221.json). La suite incluye decisiones exclusivamente simuladas por regresión; no se usa para afirmar una consulta real aprobada.

La única consulta real a presupuestos de esta ejecución fue GET anónimo `/api/presupuestos`: 401, [evidencia compartida](evidencias/http-anonimo.json). No informa estado, existencia ni aprobación de un presupuesto. No se buscaron IDs al azar ni se enumeraron registros.

## Dataset y ejecución pendientes

Solicitar al área backend MS3/QA una cuenta expresamente autorizada para lectura en este destino, un alias de orden propia y presupuesto ya aprobado, relación documentada entre ambos, versión aprobada y campos esperados. Entregar credenciales mediante mecanismo privado local; nunca en documentos, Git o chat. Para inexistencia se requiere un identificador de control autorizado; para errores/expiración, controles de QA autorizados. La existencia y accesibilidad de ese presupuesto aún se desconocen.

| Caso | Estado real | Procedimiento pendiente |
| --- | --- | --- |
| Presupuesto aprobado existente | BLOCKED | Con sesión autorizada, GET listado por orden y GET detalle; sin POST |
| Estado y relación con orden | BLOCKED | Cotejar orden/presupuesto/versiones/decisión retornados con el dataset |
| Campos y UI | BLOCKED real; PASS controlado | Contrastar estado, importes e ítems contra respuesta saneada |
| Refresh | BLOCKED | Repetir ambos GET, registrar solo alias/estado/versiones; no token |
| Salir y volver / reiniciar | BLOCKED | Nueva lectura y observación en dispositivo; no inferir DB desde UI |
| Inexistente / red | BLOCKED real; PASS controlado | Usar control autorizado y desconexión local, sin alterar producción |

Ningún fallo adicional confirmado en este ticket. Archivos modificados: este registro y su resumen de pruebas; se reutilizan suites existentes para evitar duplicaciones. `git diff --check` y validador documental ejecutados antes del commit. Hash propio: `git log -1 --format=%H -- docs/sprint-3/semana-2/SCRUM-221.md`; consolidado en SCRUM-223/informe final.
