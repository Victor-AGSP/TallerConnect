# SCRUM-225 — cifras estáticas del portal Cliente

Fecha: 2026-11-24. Rama `Victor`. **Corregido y PASS controlado (Jest)**. Estado inicial: **PENDING**.

## Auditoría del portal Cliente

| Pantalla | Cifras | Resultado |
| --- | --- | --- |
| `(cliente)/cliente` real (`RealClienteScreen`) | Ninguna: solo navegación | Correcto; verificado también por [SCRUM-163](SCRUM-163.md) |
| `(cliente)/mis-vehiculos`, `vehiculos/[id]`, `mis-ordenes/[id]`, `mis-ordenes/[id]/presupuesto` | Todas desde servicios | Correcto; error ≠ vacío ([SCRUM-162](SCRUM-162.md), [SCRUM-224](SCRUM-224.md)) |
| `(cliente)/presupuesto` demo | Total calculado de `getBudgetById('OT-00124')` | Correcto (vacío explícito desde SCRUM-222) |
| `(cliente)/cliente` demo (`DemoClienteScreen`) | `$125.000`, «Repuestos 3», «Evidencias 4», «4 archivos disponibles», «Aprobado» escritos a mano | **Defecto D-10** |

**D-10**: la portada demo afirmaba un presupuesto de **$125.000**, pero el botón «Ver detalle del presupuesto» abre el presupuesto demo OT-00124, cuyo total es **$94.000** (15.000 + 4 × 8.500 + 45.000). «Repuestos 3» contaba tres ítems de los cuales uno es mano de obra. «4 evidencias» no tenía ninguna fuente. Salvo una tarjeta, nada indicaba que los datos fueran ficticios. Solo afecta al modo demostración (`USE_DEMO_DATA`), pero ese modo es el que se presenta en la demo.

## Corrección (`src/app/(cliente)/cliente.tsx`)

- Total, estado e ítems se derivan de `getBudgetById('OT-00124')` + `calculateBudgetTotal`, la misma fuente del detalle demo.
- «Repuestos» pasa a «Ítems del presupuesto» (el conteo incluye mano de obra).
- Evidencias: «No disponible» / «Evidencias no disponibles», porque no existe fuente demo para esa orden.
- Si falta el presupuesto demo: «No disponible» en total, presupuesto e ítems, sin monto ni estado.
- Aviso visible `cliente-demo-notice`: «Modo demostración: datos ficticios que no provienen del taller.»
- La vista real no cambia y no llama a la fuente demo.

`__tests__/views-accessibility.test.tsx` comprobaba las etiquetas agrupadas usando el valor defectuoso `$125.000`; se actualizó solo el valor a `$94.000`, manteniendo su objetivo (agrupación accesible).

## Resultados

| Ejecución | Resultado | Evidencia |
| --- | --- | --- |
| `__tests__/cliente-portal-figures.test.tsx` antes | **2 PASS / 5 FAIL** (aviso, total, ítems, evidencias, ausencia) | [before](evidencias/SCRUM-225-before.json) |
| Después | **7 PASS / 0 FAIL** | [after](evidencias/SCRUM-225.json) |
| Relacionadas (`views-accessibility cliente budget- hardcoded order-functional order-flow`) | **14 suites / 269 PASS / 0 FAIL** | [relacionadas](evidencias/SCRUM-225-relacionadas.json) |

TypeScript y ESLint exit 0. Otras cifras demo (`DemoMecanicoScreen`, `DemoInventoryScreen`) no son del portal Cliente y quedan fuera de alcance; siguen protegidas por `USE_DEMO_DATA`.

Hash: `git log -1 --format=%H -- docs/sprint-3/semana-3/SCRUM-225.md`.
