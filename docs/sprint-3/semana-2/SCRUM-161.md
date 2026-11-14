# SCRUM-161 — correcciones y coordinación de integración

Fecha: 2026-11-14. **Correcciones frontend PASS; coordinación externa preparada, no enviada.** Se revisaron SCRUM-159/220/160/221/222 y sus resultados. No se afirma haber coordinado con personas sin comunicación verificable; el conector GitHub solo se usó para lectura.

## Corrección adicional

D-06: `OrderBudgetView` conservaba en estado local el resultado de una decisión al cambiar `orderId`. Aunque se consultara correctamente el nuevo presupuesto, podía mostrarse en él el mensaje de aprobación de la orden anterior. [Reproducción](evidencias/SCRUM-161-before.json): 1 FAIL / 1 PASS. Se delimita el montaje interno por orden, reiniciando estado de decisión junto con su consulta. No se modificó ningún endpoint ni decisión remota.

Archivos: `src/components/orders/OrderBudgetView.tsx`, `__tests__/budget-order-transition.test.tsx`, este registro y evidencias. Prueba nueva: decisión local de orden A → consulta aprobada → cambio a B enviada; desaparece el mensaje y reaparece el formulario de B. Segunda prueba: consulta pendiente de A no impide cargar B ni sobrescribe su presupuesto al resolver tarde.

## Acciones propuestas por área

| Hallazgo | Origen confirmado / evidencia | Acción y responsable propuesto | Estado |
| --- | --- | --- | --- |
| D-01: mezcla de consultas/título anterior | Hook frontend; tres regresiones | Frontend: aislamiento implementado en SCRUM-159 | Corregido |
| D-02: error de órdenes como vacío | Vista de vehículo; cuatro regresiones | Frontend: error/reintento y retirada de datos en SCRUM-220 | Corregido |
| D-03: presupuesto asociado incorrectamente | Servicios frontend; cinco regresiones | Frontend: validar resumen y detalle en SCRUM-160 | Corregido |
| D-04: GET anónimo `/ordenes` 504 | HTTP real; origen interno desconocido | Gateway/MS2 + infraestructura: correlacionar hora de sonda, disponibilidad y política de rechazo previo a dependencia; no hay evidencia de exposición | Abierto en diagnóstico |
| D-05: demo ausente con total cero | Vista demo; una regresión | Frontend: vacío explícito en SCRUM-222 | Corregido |
| D-06: decisión anterior en nueva orden | Estado local de presupuesto; una regresión | Frontend: montaje por orden en este ticket | Corregido |

Para D-04 entregar únicamente [estado y hora de sonda](evidencias/http-anonimo.json); no guardar cuerpos ni inventar causa backend. Un 504 aislado no confirma fallo permanente, pérdida de DB ni vulnerabilidad. Investigar en logs del servicio con autorización del propietario. No se reconfiguró producción ni se añadieron fallbacks.

Dependencias de aceptación (no defectos confirmados): QA/propietario del entorno debe entregar dos clientes y dataset autorizado de órdenes propias/ajenas, mecánico asignado/no asignado, administrador con política efectiva, presupuesto ya aprobado y caso inexistente controlado. El acceso a credenciales requiere un mecanismo privado local. QA móvil debe observar Expo Go; MS2/MS3 debe confirmar política de propiedad y relación con versiones. [Procedimiento para presupuesto aprobado](SCRUM-221.md). Estas dependencias mantienen BLOCKED las validaciones reales, aunque las correcciones locales pasen.

## Regresión ejecutada

`npm test -- --runTestsByPath __tests__/budget-order-transition.test.tsx __tests__/budget-read-refresh.test.tsx __tests__/budget-demo-empty.test.tsx __tests__/order-query-isolation.test.tsx __tests__/order-client-scope.test.tsx __tests__/budget-flow-integration.test.tsx __tests__/budget-views-integration.test.tsx`: **7 suites, 52 PASS, 0 FAIL**, [resultado](evidencias/SCRUM-161.json). Todos los datos son dobles locales.

`npm run test:regression -- --json --outputFile=/tmp/tallerconnect-s3s2/SCRUM-161-regression.json`: [resultado del conjunto de regresión](evidencias/SCRUM-161-regression.json); incluye automáticamente las cinco suites nuevas por sus nombres order/budget. TypeScript exit 0; lint exit 0 (46 advertencias previas, sin nuevas); diff check PASS, [herramientas](evidencias/SCRUM-161-herramientas.txt). La suite completa y Android se registran en el cierre SCRUM-223.

D-07 detectado en la primera suite completa: la fixture añadida en SCRUM-160 dentro de `__tests__/fixtures` fue recolectada como suite sin tests. Esa ejecución tuvo 83 suites PASS y 1 FAIL, aunque las 1320 aserciones pasaron: **la ejecución completa fue FAIL**. [Evidencia](evidencias/SCRUM-161-full-before.json). Se movió la fixture a `test-utils/fixtures/sprint3-budget.ts` y se ajustaron sus dos imports; no se deshabilitaron suites ni reglas de descubrimiento. La repetición tras esta corrección dio 83 suites / 1320 PASS / 0 FAIL; regresión 46 suites / 866 PASS / 0 FAIL. Sus resultados se consolidan en SCRUM-223. Responsable frontend/QA, corregido en este ticket; severidad baja, P2 por bloquear CI. Este defecto se introdujo durante esta ejecución y se distingue de los defectos funcionales previos.

Hash propio: `git log -1 --format=%H -- docs/sprint-3/semana-2/SCRUM-161.md`; consolidado en SCRUM-223/informe final. Sin push, mensajes externos ni cambios de backend.
