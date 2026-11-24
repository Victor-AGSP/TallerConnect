# SCRUM-164 — reprueba de consulta y visualización MS4

Fecha: 2026-11-24. Rama `Victor`. Estado inicial: **PENDING**. Resultado: **frontend PASS controlado; consulta autenticada real BLOCKED**.

## 1. Disponibilidad real (sondas GET anónimas, sin token ni cookies, sin mutaciones)

[Registro saneado](evidencias/SCRUM-164-http.json): solo estado, cabeceras permitidas, hash del cuerpo y campos de salud.

| Destino | Resultado |
| --- | --- |
| `https://tallerconect.vercel.app` (URL por defecto de `src/config/env.ts` para integración y producción) | **404 `x-vercel-error: DEPLOYMENT_NOT_FOUND`** en `/api/auth/me`, `/ms4/health`, `/ms4/health/storage`. El despliegue ya no existe → **D-11** |
| `https://api-tallerconnect.inf.uct.cl` (Gateway que usa el despliegue Kubero del equipo, rama `deploy/kubero-frontend`, vía `nginx` `proxy_pass`) | `/api/health` 200; `/api/health/servicios` 200 con MS1–MS4 `ok`; `/api/health/servicios/ms4_evidencias` 200 `ok`; `GET /api/evidencias?orden_id=1` sin token **401 «No autenticado»**; `/openapi.json` 200 |
| `https://frontend-movil.inf.uct.cl` (frontend web Kubero) | `/healthz` 200; `/api/evidencias` sin token 401 (proxy correcto) |

Observación puntual previa: `/api/health/servicios` respondió **503 «degradado» con `ms1_auth: tiempo_agotado`** y MS4 `ok`; minutos después todo `ok`. [Registro textual](evidencias/SCRUM-164-observacion-degradada.txt). Indica que el login (MS1) puede fallar de forma transitoria; no es un fallo de MS4.

**MS4**: operativo según la Gateway vigente y exige autenticación. El 503 de almacenamiento registrado en sprints anteriores (`/ms4/health/storage`) ya no puede comprobarse: esa ruta pertenecía al despliegue Vercel retirado y la Gateway nueva no expone salud de almacenamiento. Verificarlo requeriría una subida real, que no se realizó (mutación no autorizada).

## 2. Contrato

El [extracto del contrato vigente](../../../test-utils/fixtures/ms4-gateway-contract.json) (SHA-256 del documento completo `9b8f363b…c4cb`) coincide con la app:

| Aspecto | Contrato | App | Estado |
| --- | --- | --- | --- |
| Listado | `GET /api/evidencias?orden_id` (obligatorio), 200 = arreglo de `EvidenciaRespuesta` | `GET /evidencias` con `{ orden_id: <entero> }`, zod `evidenceListResponseDtoSchema` | OK |
| Campos | 11 requeridos | DTO exige exactamente los 11 | OK |
| Descarga | `GET /{id}/descarga` → `url`, `expira_en` | `evidenceDownloadResponseDtoSchema` | OK |
| Autenticación | Bearer requerido (401) | interceptor adjunta token; 401 → `outcome: 'session'` | OK |
| Códigos | 401, 404, 422, 500, 502, 503, 504 | todos → `EvidenceServiceError` con mensaje; 5xx `retryable` | OK |
| Paginación | `limite` (por defecto 50, máx. 100), `desde` | no se envían | **Riesgo P3**: una orden con más de 50 evidencias mostraría solo las primeras 50 sin aviso. Sin evidencia de órdenes así; no se cambia sin requisito |

## 3. Pruebas automatizadas

Nueva suite `__tests__/evidence-ms4-revalidation.test.tsx` (contrato, códigos y recuperación tras 502/503/504/timeout con «Reintentar» → evidencia visible): **27 PASS / 0 FAIL**, [evidencia](evidencias/SCRUM-164.json).

Reprueba de todo MS4 (`npx jest evidence`): **11 suites / 244 PASS / 0 FAIL**, [evidencia](evidencias/SCRUM-164-suites-ms4.json): roles, 401/403/404, respuestas inválidas, URL prefirmada, cambio de orden, carga y estados. TypeScript y ESLint exit 0.

## 4. Bloqueos

- **Consulta y visualización autenticada real: BLOCKED.** No hay cuentas de prueba autorizadas ni órdenes con evidencias conocidas. No se simuló una respuesta exitosa.
- Almacenamiento MS4: no verificable sin subida real.
- Android: ver [SCRUM-226](SCRUM-226.md).

Hash: `git log -1 --format=%H -- docs/sprint-3/semana-3/SCRUM-164.md`.
