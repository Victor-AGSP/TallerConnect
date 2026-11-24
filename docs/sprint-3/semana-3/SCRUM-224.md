# SCRUM-224 — HTTP 500 no se muestra como lista vacía

Fecha: 2026-11-24. Rama `Victor`. **PASS controlado (Jest)**. Estado inicial: **PENDING** (sin commits previos).

## Alcance y diferencia con SCRUM-162

[SCRUM-162](SCRUM-162.md) cubre la matriz general de respuestas por servicio. Este ticket demuestra el **comportamiento observable** del portal Cliente cuando la Gateway responde 500, renderizando las rutas reales con `apiClient` como único doble.

| Pantalla (rol Cliente) | Consulta | Ante 500 | Tras «Reintentar» con 200 vacío |
| --- | --- | --- | --- |
| `(cliente)/mis-vehiculos` | `GET /vehiculos` | `vehicle-list-error` con «Error interno en el servidor…», sin «Sin vehículos» | `vehicle-list-empty`; 2 llamadas |
| `(cliente)/mis-vehiculos` | `GET /vehiculos` | ídem | con datos: tarjeta del vehículo, sin error |
| `(cliente)/vehiculos/[id]` | `GET /vehiculos/1` OK + `GET /ordenes` 500 | «No se pudieron consultar las órdenes.», sin «No hay órdenes asociadas.»; vehículo visible (fallo parcial) | `vehicle-detail-orders-empty`; 2 llamadas a `/ordenes` |
| `OrderEvidenceList` (detalle de orden cliente) | `GET /evidencias?orden_id` (MS4) | `order-evidence-error`, sin «Sin evidencias» | `order-evidence-empty` |
| `(cliente)/mis-ordenes/[id]/presupuesto` | `GET /presupuestos?orden_id` (MS3) | `order-budget-error`, sin vacío | `order-budget-empty` |

El comportamiento correcto ya existía; no se cambió código de producción. El valor del ticket es la prueba que lo fija.

## Sensibilidad de la prueba

Mutación temporal en `VehicleListView` (evaluar lista vacía antes que el error), revertida con `git checkout`: **2 FAIL / 3 PASS** — la suite detecta la regresión. [Evidencia de mutación](evidencias/SCRUM-224-mutacion.json).

## Resultados

`npx jest __tests__/http-500-client-states.test.tsx`: **5 PASS / 0 FAIL**, estable en 4 ejecuciones consecutivas. [Evidencia](evidencias/SCRUM-224.json). TypeScript y ESLint exit 0.

## Observación (no corregida, fuera de alcance)

`ErrorMessage` declara `accessibilityRole="alert"` en un `View` sin `accessible`, por lo que RNTL no lo expone por rol. Puede afectar el anuncio del lector de pantalla; queda registrado como mejora de accesibilidad P3 para revisar en dispositivo, sin evidencia de impacto real todavía.

No se ejecutó en Android ni contra backend real. Hash: `git log -1 --format=%H -- docs/sprint-3/semana-3/SCRUM-224.md`.
