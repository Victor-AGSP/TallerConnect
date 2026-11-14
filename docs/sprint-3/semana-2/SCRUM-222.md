# SCRUM-222 — presupuesto vacío en demo

Fecha: 2026-11-14. **PASS controlado, exclusivamente demo/Jest.** No representa consulta autenticada ni observación de Expo Go.

## Escenario reproducible y defecto

La demostración histórica está en `BudgetDetailScreen`, habilitada solo con `ENV.USE_DEMO_DATA` (requiere mock services y demo workflow explícitos). Usa el helper síncrono `getBudgetById('OT-00124')`. La ausencia se representa con `undefined`; en el servicio conectado, la ausencia de presupuesto se representa con `null` después de un listado válido vacío. Son dos contratos distintos.

Para reproducir sin cambiar configuración de ejecución: `__tests__/budget-demo-empty.test.tsx` sustituye el objeto de configuración **dentro de Jest** y devuelve `undefined` del helper demo. No modifica `.env`, `.env.local` ni el singleton real de otra suite. Se verifica que no se llame a la API. Esto habilita únicamente la rama visual demo para ese test, sin mocks globales en la app.

D-05 confirmado: al faltar el registro demo se mostraban «Sin orden», «Sin estado» y un total de cero, sin un estado de ausencia claro. [Antes de corregir](evidencias/SCRUM-222-before.json): 1 FAIL / 3 PASS. Se añadió `EmptyState` explícito «Sin presupuesto», sin total ni registros ficticios; su acción vuelve al inicio incluso si se abrió por enlace directo. No se confunde presupuesto inexistente con presupuesto existente sin ítems.

Archivos: `src/components/budgets/BudgetDetailScreen.tsx`, `__tests__/budget-demo-empty.test.tsx`, este registro y evidencias. La corrección afecta el escenario demo ausente; la consulta real sigue pasando por `OrderBudgetView` y `getBudgetForOrder`.

## Validación

`npm test -- --runTestsByPath __tests__/budget-demo-empty.test.tsx __tests__/cliente-real.test.tsx __tests__/views-accessibility.test.tsx __tests__/budget-views-integration.test.tsx --json --outputFile=/tmp/tallerconnect-s3s2/SCRUM-222.json`: **4 suites, 47 PASS, 0 FAIL**, resultado y aserciones en [evidencia](evidencias/SCRUM-222.json). TypeScript exit 0 y `git diff --check` PASS.

| Situación | Representación y resultado observado |
| --- | --- |
| Demo sin registro | `undefined` → «Sin presupuesto», sin total ficticio; navegación al inicio PASS |
| Lista real vacía controlada | servicio `null` → vacío de la vista conectada; helper demo nunca llamado PASS |
| Error HTTP controlado | rechazo 503 → error y reintento, sin estado vacío ni fallback demo PASS |
| Carga pendiente controlada | promesa pendiente → loading; solo al resolver `null` aparece vacío PASS |

Los cuatro casos nuevos se ejecutaron y pasaron; se reutilizan accesibilidad y flujos de presupuesto. Las banderas de producción permanecen false. HTTP real, render nativo de dispositivo y persistencia de base de datos no se probaron en este escenario. No hay nuevos bloqueos para la entrega demo solicitada; la aceptación móvil sigue pendiente si se requiere dispositivo.

Hash propio: `git log -1 --format=%H -- docs/sprint-3/semana-2/SCRUM-222.md`; consolidado en SCRUM-223 y cierre.
