# SCRUM-227 — regresión focalizada tras ajustes de integración

Fecha: 2026-11-24. Rama `Victor`. Estado inicial: **PENDING**. Resultado: **PASS (Jest, TypeScript, lint)**; sin regresiones atribuibles a la semana 3.

## Cambios de código de la semana 3 sujetos a regresión

| Archivo | Ticket | Cambio |
| --- | --- | --- |
| `src/mappers/vehicle.mapper.ts`, `src/mappers/order.mapper.ts`, `src/services/orders.service.ts` | [SCRUM-162](SCRUM-162.md) | Cuerpo no arreglo → error (antes `[]`) |
| `src/app/(admin)/administrador.tsx` | [SCRUM-163](SCRUM-163.md) | Métrica sin fuente → «No disponible» (antes `0`) |
| `src/app/(cliente)/cliente.tsx` | [SCRUM-225](SCRUM-225.md) | Cifras demo derivadas de su fuente |

SCRUM-224 y SCRUM-164 solo agregaron pruebas; SCRUM-226 solo documentación. Durante la semana se actualizaron tres expectativas antiguas que fijaban los defectos corregidos (dos en `services-response-scenarios`, una en `views-accessibility`); cada una está justificada en su ticket.

## Ejecuciones

[Registro de validación](evidencias/SCRUM-227-validacion.txt).

| Área priorizada | Comando / suites | Resultado |
| --- | --- | --- |
| Regresión oficial (auth, rutas, órdenes, presupuestos, repuestos, MS4 y las 4 suites nuevas de la semana) | `npm run test:regression` | **51 suites / 969 PASS / 0 FAIL** — [JSON](evidencias/SCRUM-227-regresion.json) |
| Servicios HTTP, errores, reintentos, entorno, DTO/mappers/esquemas, navegación y roles, portal Cliente, panel Admin/Mecánico, vehículos | `npx jest env-config environment services- http-client interceptors retry-policy use-data-query protected-routes services-session-navigation role-access mapper schema cliente admin mecanico vehicle` | **33 suites / 579 PASS / 0 FAIL** — [JSON](evidencias/SCRUM-227-focalizada.json) |
| MS4 | `npx jest evidence` (en SCRUM-164) | 11 suites / 244 PASS / 0 FAIL |
| TypeScript | `npx tsc --noEmit` | exit 0 |
| Lint | `npm run lint` | exit 0; 0 errores / 46 advertencias, **idénticas** a la línea base |

Línea base antes de la semana 3 (HEAD `24bfbbe`): 83 suites / 1321 PASS / 0 FAIL. Los conjuntos se solapan; no se suman.

## Configuración de entornos

- Tests: `USE_DEMO_DATA` y mocks desactivados sin banderas explícitas (SCRUM-163).
- **D-11 (no corregido, decisión del equipo):** la URL por defecto de integración/producción en `src/config/env.ts` y los `.env` locales apuntan a `https://tallerconect.vercel.app/api`, hoy `DEPLOYMENT_NOT_FOUND`. El despliegue Kubero ya usa `EXPO_PUBLIC_API_URL=https://frontend-movil.inf.uct.cl/api` (proxy a `https://api-tallerconnect.inf.uct.cl`). Cambiar el valor por defecto altera producción y no es una regresión de estas tareas; se propone al equipo con el cambio exacto: `API_GATEWAY_URLS.INTEGRATION`/`PRODUCTION` → `https://api-tallerconnect.inf.uct.cl/api`, y actualizar `.env.example`. Mientras tanto se usa la variable en línea de comandos ([SCRUM-226](SCRUM-226.md)).

> **Actualización 2026-11-24 (D-11):** integración corregida y entornos separados en `src/config/env.ts`; producción y `.env` privados siguen pendientes. Detalle en [D-11](../semana-4/D-11.md).

## No cubierto

Navegación en dispositivo Android y flujos autenticados reales (BLOCKED, ver SCRUM-226 y SCRUM-164). La suite completa, `expo-doctor` y exportaciones se ejecutan en SCRUM-165.

Hash: `git log -1 --format=%H -- docs/sprint-3/semana-3/SCRUM-227.md`.
