# SCRUM-230 — resumen de pendientes para la revisión del Sprint 3

Fecha: 2026-11-24. Rama `Victor`. Estado inicial: **PENDING**.

## Resumen ejecutivo

Los 14 tickets de las semanas 3 y 4 tienen trabajo verificable y un commit individual en `Victor`, **sin push**. Se corrigieron **5 defectos de frontend** (D-08, D-09, D-10, D-12 y la falta de identificación del modo demostración). La suite pasó de 83 suites / 1321 pruebas a **90 suites / 1441 pruebas, 0 fallos**. Quedan abiertos un problema de configuración P1 (**D-11**: la URL por defecto apunta a un despliegue Vercel eliminado), la validación con **cuentas reales** (no entregadas) y la ejecución en **Android** (sin SDK ni dispositivo).

## Estado de las tareas

| Ticket | Estado | Qué falta | Commit |
| --- | --- | --- | --- |
| SCRUM-162 | Completado (corrigió D-08) | — | `48c8871` |
| SCRUM-224 | Completado | — | `3a4edfb` |
| SCRUM-163 | Completado (corrigió D-09) | — | `87c0520` |
| SCRUM-225 | Completado (corrigió D-10) | — | `01cbaf9` |
| SCRUM-164 | Parcial: automatizado y disponibilidad PASS | Consulta MS4 autenticada real (BLOCKED, cuentas) | `37d8da9` |
| SCRUM-226 | Bloqueado: diagnóstico y procedimiento listos | Ejecución y capturas en Android | `3b8bfc9` |
| SCRUM-227 | Completado | — | `383bd03` |
| SCRUM-228 | Parcial: automatizado PASS (corrigió D-12) | Pasos en dispositivo Android | `9cb4144` |
| SCRUM-165 | Parcial: pruebas y exportaciones PASS | Ejecución Android; 12 paquetes Expo desactualizados | `ecc8413` |
| SCRUM-166 | Completado (procedimiento); ensayo con cuentas pendiente | Cuentas de QA | `77a1a81` |
| SCRUM-229 | Completado (guion); ensayo pendiente | Cuentas de QA | `efb2c6a` |
| SCRUM-167 | Completado; aprobación del equipo pendiente | Aprobaciones | `4e773ac` |
| SCRUM-230 | Este documento | — | `git log -1 --format=%h -- docs/sprint-3/semana-4/SCRUM-230.md` |
| SCRUM-231 | Matriz registrada: 22 PASS, 4 BLOCKED, 2 NOT RUN | Cuentas y dispositivo | `git log -1 --format=%h -- docs/sprint-3/semana-4/SCRUM-231.md` |

## Problemas del frontend (corregidos en esta rama)

| ID | Problema | Ticket |
| --- | --- | --- |
| D-08 | Una respuesta 200 fuera de contrato se mostraba como «sin vehículos/órdenes» | SCRUM-162 |
| D-09 | El panel de Administrador mostraba «0» cuando fallaba una consulta | SCRUM-163 |
| D-10 | La portada demo del Cliente mostraba $125.000; el detalle que abre suma $94.000 | SCRUM-225 |
| D-12 | «Volver» no hacía nada sin historial (enlace directo, arranque en frío, recarga web) | SCRUM-228 |
| — | El modo demostración no se identificaba fuera de la portada del Cliente | SCRUM-166 |

## Problemas fuera del frontend (solo con evidencia)

| ID | Problema | Evidencia | Clasificación |
| --- | --- | --- | --- |
| D-11 | `tallerconect.vercel.app` responde `DEPLOYMENT_NOT_FOUND`; es el valor por defecto en `src/config/env.ts` y en los `.env` locales | [sondas](../semana-3/evidencias/SCRUM-164-http.json) | Configuración / despliegue. **No** es un fallo de microservicio |
| O-06 | MS1 reportó `tiempo_agotado` una vez y se recuperó en minutos | [registro](../semana-3/evidencias/SCRUM-164-observacion-degradada.txt) | Dependencia externa intermitente; causa desconocida |
| D-04 | 504 anónimo en órdenes (semana 2) | semana 2 | No reproducible: el entorno fue retirado |

No hay evidencia de defectos en MS2, MS3 ni MS4: en la Gateway vigente todos responden `ok` y exigen autenticación.

## Estado de integración, Android y MS4

- **Integración:** Gateway vigente `https://api-tallerconnect.inf.uct.cl` operativa (MS1–MS4 `ok`, contrato publicado). El frontend web Kubero (`frontend-movil.inf.uct.cl`) ya apunta a ella. Flujos autenticados: **0 ejecutados** (sin cuentas).
- **Android:** exportación OK (bundle Hermes); **ejecución real no realizada** (sin SDK, `adb`, emulador ni dispositivo).
- **MS4:** contrato de la Gateway vigente = DTO de la app; los 7 códigos de error del listado manejados; recuperación tras 502/503/504/timeout verificada. La salud del almacenamiento no es observable desde fuera; el 503 de almacenamiento de sprints anteriores pertenecía al entorno Vercel retirado.

## Riesgos

| Riesgo | Impacto | Mitigación actual |
| --- | --- | --- |
| D-11 sin corregir | Cualquier ejecución con la configuración versionada falla por completo | `EXPO_PUBLIC_API_URL` en la línea de comandos; preflight lo detecta |
| Sin cuentas de QA | Separación por propietario y rol no verificada en la API | Separación verificada en la interfaz y rechazo anónimo en la API |
| Sin prueba en Android | Botón atrás físico, `SecureStore` nativo y teclado sin verificar | Procedimiento de captura listo (SCRUM-226) |
| MS1 intermitente | Login fallido en la demo | Preflight y escenario C del guion |
| Dependencias Expo desactualizadas | Compatibilidad futura | Sin fallos actuales; actualización pendiente de autorización |

## Próximas acciones (requieren al equipo)

1. Decidir y aplicar D-11 (cambio propuesto en [SCRUM-227](../semana-3/SCRUM-227.md)).
2. QA: entregar cuentas por rol, dos clientes y órdenes asignada/no asignada; luego ejecutar las filas BLOCKED de [SCRUM-231](SCRUM-231.md).
3. Conseguir un dispositivo o emulador Android y seguir [SCRUM-226](../semana-3/SCRUM-226.md).
4. Autorizar `npx expo install --fix` en una rama propia.
5. Revisar y hacer push de los commits de `Victor`; aprobar el [acta](SCRUM-167.md).

## Validación final

[Registro](evidencias/validacion-final.txt) en `4e773ac`: Jest **90 suites / 1441 PASS / 0 FAIL** ([JSON](evidencias/final-suite.json)); regresión **53 / 987 PASS** ([JSON](evidencias/final-regresion.json)); TypeScript exit 0; lint 0 errores / 46 advertencias previas; expo-doctor 19/20; exportaciones Android y web exit 0; validador de documentos PASS.

Hash: `git log -1 --format=%H -- docs/sprint-3/semana-4/SCRUM-230.md`.
