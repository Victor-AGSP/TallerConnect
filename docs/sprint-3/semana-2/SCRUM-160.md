# SCRUM-160 — lectura y refresh de presupuestos

Fecha: 2026-11-14. Objetivo: lectura coherente y nueva consulta al refrescar/reabrir. **Frontend PASS; persistencia real backend BLOCKED** sin sesión y dataset autorizados.

## Contrato y arquitectura

La ruta Cliente `mis-ordenes/[id]/presupuesto` y la administrativa de orden montan `OrderBudgetView`. `getBudgetForOrder` consulta GET `/presupuestos?orden_id={id}` y después GET `/presupuestos/{presupuesto_id}`. La API entrega resumen, versiones, ítems, estado y decisión. El mapper conserva importes decimales y ordena versiones; la vista muestra la última visible. El adaptador administrativo `getBudgetByOrderId` tiene otro modelo con importes numéricos. No se confunden sus contratos.

`useDataQuery` conserva datos de la misma consulta durante refresh y elimina datos al fallar o cambiar consulta (corrección compartida de SCRUM-159). No hay caché persistente ni almacenamiento de presupuestos en SecureStore. Reabrir o remontar consulta nuevamente. Esto no demuestra persistencia en DB ni equivale a reiniciar un dispositivo.

## Defecto confirmado y corrección

D-03: el adaptador administrativo seleccionaba un presupuesto de otra orden si el listado tenía un solo registro; ambos caminos aceptaban un detalle cuyo ID de presupuesto u orden difería del resumen solicitado. Cinco regresiones fallaban antes del cambio: [reproducción](evidencias/SCRUM-160-before.json). Se exige coincidencia del resumen por orden y del detalle por orden/presupuesto. Una incoherencia de detalle genera error explícito; nunca muestra otro presupuesto. Es protección de integridad frontend, no corrección de permisos backend.

Archivos: `src/services/budgets.service.ts`, `__tests__/budget-read-refresh.test.tsx`, fixture de contrato local `__tests__/fixtures/sprint3-budget.ts`, este registro/evidencias. La fixture no se importa desde producción.

## Pruebas ejecutadas

`npm test -- --runTestsByPath __tests__/budget-read-refresh.test.tsx __tests__/budget-service.test.ts __tests__/budget-views-integration.test.tsx __tests__/budget-flow-integration.test.tsx src/__tests__/budgets.service.test.ts`: **5 suites, 92 PASS, 0 FAIL**, [resultado](evidencias/SCRUM-160.json).

Ocho casos nuevos: exclusión de resumen ajeno en ambos adaptadores; rechazo de detalle con orden o presupuesto incorrecto en ambos; lectura → refresh con importe actualizado → desmontaje/reapertura (seis GET, tres listados y tres detalles); fallo de refresh sin datos previos y recuperación. Las suites reutilizadas prueban detalle, estados vacíos, errores HTTP, contratos/versiones y navegación. Ninguna consulta llegó a producción: son dobles del cliente HTTP o adaptador de Axios.

TypeScript exit 0; lint exit 0, 46 advertencias preexistentes; `git diff --check` PASS. [Herramientas](evidencias/SCRUM-160-herramientas.txt). Configuración real mantiene mocks/demo false; las fixtures viven únicamente en tests.

| Validación real | Estado | Evidencia o dependencia |
| --- | --- | --- |
| Lista sin sesión | PASS rechazo 401 | [Sonda real](evidencias/http-anonimo.json) |
| Lectura y detalle disponibles | BLOCKED | Cuenta, orden y presupuesto autorizados |
| Refresh y reapertura contra API | BLOCKED | Repetir GET con esa sesión y cotejar estado/importes/versiones |
| Persistencia en DB | BLOCKED | No hay nueva consulta autenticada; conservación visual local insuficiente |
| Reinicio Expo Go | BLOCKED | Dispositivo observable y dataset autorizado |
| Vacío/error/sin fallback | PASS controlado | Resultado Jest; demo vacío ampliado en SCRUM-222 |

Hash propio: `git log -1 --format=%H -- docs/sprint-3/semana-2/SCRUM-160.md`; valor consolidado en SCRUM-223 e informe final.
