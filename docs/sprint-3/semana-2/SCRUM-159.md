# SCRUM-159 — permisos de órdenes por rol

Fecha: 2026-11-14. Rama Victor, base `a1fd1fef58caae2ad46723d1ec36576aa3338572`, árbol inicial limpio. Objetivo: comprobar barreras visuales, propagación de permisos y aislamiento entre consultas. **Entrega frontend PASS; autorización autenticada real BLOCKED**.

Auditoría: MS2 expone `/ordenes` y `/ordenes/{id}`. `RealOrderAdapter.getOrders` obtiene el listado permitido por el servidor y luego filtra localmente. `creado_por_id` identifica al creador, no al propietario: no se usa como sustituto de propiedad. Los layouts aplican RoleGuard, que controla roles y sesión; la propiedad y asignación deben verificarse en MS2. No se considera un 200 administrativo una vulnerabilidad. Los interceptores invalidan sesión en 401 protegido; 403 mantiene la sesión e informa permisos. No se cambiaron estos contratos.

La búsqueda GitHub `repo:Victor-AGSP/TallerConnect SCRUM` devolvió cero issues. Se usaron los requisitos del encargo. Se revisó la [consolidación de Semana 1](../SCRUM-156-consolidacion-actual.md) sin repetir login ni reconstruir servicios. Configuración inspeccionada mediante lista permitida de claves: producción, API `https://tallerconect.vercel.app/api`, mock auth/services y demo false en `.env` y `.env.local`. No se copiaron secretos. Expo SDK 58, navegación Expo Router, sesión Zustand/SecureStore y servicios REST existentes.

## Defecto y corrección

D-01: al cambiar de orden con una consulta pendiente, `useDataQuery` descartaba la nueva consulta y aceptaba la respuesta anterior. También conservaba el título de la orden anterior al quitar/cambiar ID. Tres pruebas nuevas fallaron antes de corregirlo: [reproducción](evidencias/SCRUM-159-before.json). Se asocia cada petición a su consulta, se invalidan respuestas anteriores y se ocultan datos de otra consulta desde el primer render. La deduplicación y el refresh de la misma consulta se conservan. Esto corrige aislamiento visual; no prueba ni sustituye autorización backend.

Archivos: `src/hooks/useDataQuery.ts`, `__tests__/order-query-isolation.test.tsx` y este registro/evidencias.

## Validación ejecutada

- Base: `npm test -- --json --outputFile=/tmp/tallerconnect-s3s2/baseline.json`: **78 suites, 1295 PASS, 0 FAIL**, [resumen de resultados Jest](evidencias/baseline.json). TypeScript exit 0; lint exit 0, 46 advertencias, 0 errores.
- `npm test -- --runTestsByPath __tests__/order-query-isolation.test.tsx __tests__/order-role-access.test.tsx __tests__/protected-routes.test.tsx __tests__/auth-session.test.tsx __tests__/use-data-query.test.ts __tests__/manual-refresh-retry.test.tsx`: **6 suites, 64 PASS, 0 FAIL**, [resultado](evidencias/SCRUM-159.json). Incluye los tres fallos iniciales corregidos.
- Rutas reales en Jest + adaptador Axios simulado: detalle permitido por los tres roles, seis cruces de rol rechazados antes de HTTP, rutas anónimas a login, hidratación, 401, 403 y 404. Son respuestas controladas, no verificación de permisos efectivos del servidor.
- Dos GET reales anónimos, sin IDs, sin credenciales y sin mutaciones: presupuestos 401; órdenes **504**, autorización no evaluable. [HTTP saneado](evidencias/http-anonimo.json). No se guardaron cuerpos. D-04: disponibilidad de órdenes pendiente de diagnóstico, causa no determinada.
- `npm run typecheck`, `npm run lint`, `git diff --check`: PASS; [salida de herramientas](evidencias/SCRUM-159-herramientas.txt), 0 errores y 46 advertencias preexistentes.

## Casos reales y límites

| Caso | Estado | Requisito para ejecutar |
| --- | --- | --- |
| Cliente propia / ajena | BLOCKED | Dos clientes autorizados y relaciones de órdenes/vehículos QA |
| Mecánico asignada / no autorizada | BLOCKED | Cuenta, asignación y política MS2 confirmadas |
| Administrador según permisos efectivos | BLOCKED | Cuenta y política autorizadas |
| Sin sesión | PASS presupuesto; FAIL disponibilidad órdenes | 401 y 504 observados en listas; detalle sin ID autorizado no ejecutado |
| Token inválido / expirado | BLOCKED real; PASS controlado | Sesión de prueba y controles autorizados; no tokens fabricados contra producción |
| Enlace directo / cambio de ID | PASS controlado; BLOCKED real | IDs del dataset autorizado; sin enumeración |
| Expo Go | BLOCKED | Dispositivo observable y sesión/dataset autorizados; el reporte previo del usuario no cuenta como ejecución actual |

No hay acceso seguro a credenciales ni dataset expresamente autorizado en esta ejecución. No se hicieron solicitudes autenticadas. Hash de este ticket: `git log -1 --format=%H -- docs/sprint-3/semana-2/SCRUM-159.md`; se consolidará el valor en SCRUM-223 y en el informe final.
