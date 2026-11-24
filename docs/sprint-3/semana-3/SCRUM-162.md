# SCRUM-162 — regresión: error frente a lista vacía

Fecha: 2026-11-24. Rama `Victor`. **PASS controlado (Jest, dobles de `apiClient`)**. No hubo llamadas HTTP reales ni dispositivo.

## Auditoría

Estado inicial: **PENDING** (sin commits con `SCRUM-162`). Se revisaron todos los `return []` / `?? []` de `src/`:

| Ubicación | Comportamiento antes | Clasificación |
| --- | --- | --- |
| `src/mappers/vehicle.mapper.ts` `mapVehiclesResponseList` | cuerpo no arreglo → `[]` | **Defecto D-08** |
| `src/mappers/order.mapper.ts` `mapOrdersResponseList` | cuerpo no arreglo → `[]` | **Defecto D-08** |
| `src/services/orders.service.ts` `getOrderHistory` (adaptador real) | cuerpo no arreglo → `[]` | **Defecto D-08** |
| `mapEvidenceListResponse`, `mapBudgetPageResponse`, `mapSparePartsPage`, `mapSuppliersPage` | esquema zod / `requireArray` → error | Correcto |
| `VehicleListView`, `VehicleDetailScreen`, `OrderEvidenceList` | `errorMessage` se evalúa antes que `length === 0` | Correcto |
| `(mecanico)/ordenes/index.tsx` `return []` | filtro local sin `userId` tras carga válida | No es fallback de error |

**D-08**: una respuesta 200 fuera de contrato (página HTML de un proxy, `{ "detail": ... }`, `null`) se mostraba como «Sin vehículos» / «Sin órdenes». Ejemplo real de riesgo: la Gateway en Vercel puede responder HTML ante errores de enrutamiento. Dos pruebas de `__tests__/services-response-scenarios.test.ts` fijaban este comportamiento («devuelve una lista vacía si la API responde con un cuerpo no iterable»); se invirtieron porque contradicen el objetivo del ticket, no para conseguir PASS.

## Cambio

- Los dos mappers lanzan error (`InvalidOrderResponseError` / `Error('Respuesta de vehículos inválida.')`) y `getOrderHistory` lanza `InvalidOrderResponseError`. Los servicios ya los normalizaban a `ServiceError` (`ORDER_INVALID_RESPONSE`, `VEHICLE_SERVICE_ERROR`), por lo que la UI muestra error con reintento.
- Nueva suite `__tests__/list-error-empty-regression.test.tsx`, agregada a `jest.regression.config.cjs`.

Matriz cubierta para cinco consultas (vehículos cliente, vehículos asignados, órdenes, historial, evidencias MS4): **200 vacío, 200 con datos, 500, 503, timeout, sin conectividad y tres cuerpos inválidos**. Solo el 200 vacío puede resolver `[]`. Las evidencias usan `EvidenceServiceError` (diseño MS4 previo); la prueba reconoce ambas clases por sus campos públicos. En UI se renderiza la ruta real `(cliente)/mis-vehiculos`: vacío → `vehicle-list-empty`; 503, timeout, red e inválido → `vehicle-list-error` + «Reintentar», sin «Sin vehículos». El caso 500 visual se demuestra aparte en [SCRUM-224](SCRUM-224.md).

## Resultados

| Ejecución | Resultado | Evidencia |
| --- | --- | --- |
| Suite nueva antes de corregir | **38 PASS / 13 FAIL** (12 cuerpos inválidos en vehículos, órdenes e historial + 1 UI mostrando vacío) | [before](evidencias/SCRUM-162-before.json) |
| Suite nueva después | **51 PASS / 0 FAIL** | [after](evidencias/SCRUM-162.json) |
| Suites relacionadas (`orders vehicle order- services- mecanico views- cliente list-error`) | **29 suites / 479 PASS / 0 FAIL** | [relacionadas](evidencias/SCRUM-162-relacionadas.json) |

`npx tsc --noEmit` exit 0; `eslint` de los archivos tocados exit 0; `git diff --check` PASS.

Comando: `npx jest __tests__/list-error-empty-regression.test.tsx`.

## Límites

No se verificó qué devuelve realmente la Gateway ante cada fallo (requiere sondas autenticadas autorizadas). La corrección es defensiva y no depende de ello. Hash: `git log -1 --format=%H -- docs/sprint-3/semana-3/SCRUM-162.md`.
