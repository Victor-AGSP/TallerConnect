# SCRUM-163 — detección de cifras hardcodeadas en entorno real

Fecha: 2026-11-24. Rama `Victor`. **PASS controlado (Jest)**. Estado inicial: **PENDING**.

## Auditoría

| Hallazgo | Ubicación | Clasificación |
| --- | --- | --- |
| Cifras fijas (montos, OT, patentes, conteos) | `DemoClienteScreen`, `DemoMecanicoScreen`, `DemoBudgetDetailScreen`, `DemoInventoryScreen` | Aisladas tras `ENV.USE_DEMO_DATA` (exige `EXPO_PUBLIC_USE_MOCK_SERVICES` y `EXPO_PUBLIC_DEMO_WORKFLOW`). Correcto en entorno real; su coherencia interna se corrige en [SCRUM-225](SCRUM-225.md) |
| Imports de `@/mocks` | solo `src/services/*`, tras `USE_MOCKS` | Correcto; ninguna pantalla importa mocks |
| `INITIAL_ADMIN_DASHBOARD_DATA` (12 vehículos, 8 órdenes…) | `src/services/admin-dashboard.service.ts` | Exportado pero **sin uso**. Riesgo latente; la prueba impide que una pantalla lo importe. No se elimina sin autorización |
| Avisos con API deshabilitada | `notificationsService` real | Derivados de datos reales (SCRUM-219); sin mocks |
| **D-09** métricas del panel Administrador | `src/app/(admin)/administrador.tsx` | Si `GET /ordenes` o `/vehiculos` fallaba, las métricas mostraban **0** — un conteo inventado junto al error |

## Detección implementada

`__tests__/hardcoded-figures-detection.test.tsx` (incluida en `jest.regression.config.cjs`):

1. **Estático**: recorre `src/app` y `src/components`; marcadores de negocio (monto CLP `$125.000`, `OT-00124`, patente `AB-CD-12`, `value="5"`, «N archivos disponibles») solo se admiten en archivos que bifurcan con `ENV.USE_DEMO_DATA ?`. Control positivo: el escáner sí detecta `cliente.tsx` y `mecanico.tsx`. Control negativo: tamaños, colores, porcentajes y timeouts no se marcan.
2. **Configuración real**: `USE_DEMO_DATA` es `false` sin banderas; las pantallas de inicio de Cliente, Mecánico y Administrador no muestran marcadores ni la palabra «demostración».
3. **Dinámico**: las métricas del Administrador cambian al cambiar la respuesta del servicio; un fallo muestra «No disponible» y no `0`; una lista válida vacía sí muestra `0` legítimo.

## Corrección D-09

`MetricCard` acepta `null` y muestra «—» con etiqueta accesible «<métrica>: No disponible» cuando la consulta de origen falló. Las métricas de la fuente que sí respondió se conservan.

## Resultados

| Ejecución | Resultado | Evidencia |
| --- | --- | --- |
| Antes de corregir D-09 | **10 PASS / 2 FAIL** (los dos casos de fallo → «0») | [before](evidencias/SCRUM-163-before.json) |
| Después | **12 PASS / 0 FAIL** | [after](evidencias/SCRUM-163.json) |
| Relacionadas (`admin administrador env-config hardcoded views- role-`) | **12 suites / 195 PASS / 0 FAIL** | [relacionadas](evidencias/SCRUM-163-relacionadas.json) |

TypeScript y ESLint exit 0. La detección estática es heurística: un valor inventado con otro formato podría no detectarse; la protección principal sigue siendo la prueba en tiempo de ejecución.

Hash: `git log -1 --format=%H -- docs/sprint-3/semana-3/SCRUM-163.md`.
