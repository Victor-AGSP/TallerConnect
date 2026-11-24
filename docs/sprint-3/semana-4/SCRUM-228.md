# SCRUM-228 — flujo de navegación del rol Cliente

Fecha: 2026-11-24. Rama `Victor`. Estado inicial: **PENDING**. Resultado: **automatizado PASS tras corregir D-12; ejecución en Android NOT RUN (sin dispositivo)**.

## Rutas reales del Cliente

`(cliente)/_layout` (protegido por `RoleGuard role="cliente"`) → `cliente` (portal) → `mis-vehiculos` → `vehiculos/[id]` → `ordenes/[id]` (detalle, evidencias MS4) → `mis-ordenes/[id]/presupuesto` (MS3, aprobar/rechazar).
Rutas adicionales: `vehiculos` (lista alternativa), `presupuesto` (demo), `mis-ordenes/[id]` (detalle equivalente, **sin enlaces desde ninguna pantalla**; solo enlace directo; duplicación P3, no se elimina sin decisión del equipo).

## Defecto D-12 (corregido)

Al abrir el detalle de vehículo u orden **sin historial** — enlace directo, arranque en frío de Android desde un enlace o recarga en el frontend web — «Volver» / «Volver a vehículos» llamaba a `router.back()` y Expo Router informaba `The action 'GO_BACK' was not handled`: el botón no hacía nada y, en Android, el botón físico cerraría la app.

Corrección (`VehicleDetailScreen.tsx`, `OrderDetailScreen.tsx`): si `router.canGoBack()` es falso, `replace` a la lista de vehículos del rol (`/(cliente)/mis-vehiculos`, `/(mecanico)/vehiculos-asignados`, `/(admin)/vehiculos`) o al inicio del rol (`getRouteByRole`). Con historial, el comportamiento no cambia.

## Matriz de validación

`__tests__/cliente-navigation-flow.test.tsx`: Expo Router en memoria con las rutas de `src/app`; solo se sustituyen `apiClient` y `expo-secure-store`.

| Funcionalidad | Automatizado (Jest) | Android físico |
| --- | --- | --- |
| Inicio de sesión y redirección por rol | PASS en suites existentes (`auth-full-flow`, `services-session-navigation`, `protected-routes`) | NOT RUN |
| Portal → vehículos → vehículo → orden → presupuesto | PASS | NOT RUN |
| Sin herramientas de Mecánico en la orden del Cliente | PASS | NOT RUN |
| Atrás paso a paso (pila) y botones «Volver» | PASS | NOT RUN (botón físico) |
| «Volver» sin historial (D-12) | FAIL → PASS | NOT RUN |
| Cliente abre `/administrador` o `/mecanico` → vuelve a `/cliente` | PASS | NOT RUN |
| Enlace directo sin sesión → `/login` sin llamar a la API | PASS | NOT RUN |
| Cierre de sesión → `/login`, rutas del Cliente inaccesibles | PASS | NOT RUN |
| Persistencia de sesión | PASS en `auth-session`, `auth-storage` (19 PASS) | NOT RUN (reinicio de app) |
| Errores: 404 vehículo, 403 orden sin cerrar sesión, 500 en listas ([SCRUM-224](../semana-3/SCRUM-224.md)) | PASS | NOT RUN |

## Resultados

| Ejecución | Resultado | Evidencia |
| --- | --- | --- |
| Suite nueva antes de corregir D-12 | **8 PASS / 4 FAIL** (los 4 casos sin historial) | [before](evidencias/SCRUM-228-before.json) |
| Después | **12 PASS / 0 FAIL** | [after](evidencias/SCRUM-228.json) |
| Suites que renderizan las pantallas tocadas + rutas protegidas y sesión | **23 suites / 385 PASS / 0 FAIL** | [relacionadas](evidencias/SCRUM-228-relacionadas.json) |

TypeScript y ESLint exit 0.

## Límites

jest-expo ejecuta con `Platform.OS` por defecto; no reproduce el botón atrás físico, gestos, teclado ni `SecureStore` nativo. Pendiente en dispositivo Android con cuenta Cliente autorizada: los mismos pasos de la matriz, más reinicio de la app con sesión guardada y botón atrás físico. Procedimiento de captura en [SCRUM-226](../semana-3/SCRUM-226.md).

Hash: `git log -1 --format=%H -- docs/sprint-3/semana-4/SCRUM-228.md`.
