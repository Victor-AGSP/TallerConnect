# SCRUM-167 — acta de defectos y checklist final

Fecha: 2026-11-24. Rama `Victor`. Estado inicial: **PENDING**. Resultado: **acta y checklist consolidados; aprobación del equipo PENDIENTE**.

Este documento **no registra reuniones ni aprobaciones**: no hubo ninguna en esta ejecución. Las casillas de aprobación quedan vacías para que el equipo las complete.

## Acta de defectos

Fuente única: [defectos.csv](defectos.csv) (12 filas; D-01–D-07 heredados de la [semana 2](../semana-2/defectos.csv), D-08–D-12 de esta ejecución). Responsable: solo se indica cuando es verificable (la corrección está en commits de la rama `Victor`); el resto queda «pendiente de asignar por el equipo».

| ID | Severidad / prioridad | Estado | Servicio | Resumen | Commit |
| --- | --- | --- | --- | --- | --- |
| D-08 | Media / P2 | Corregido | MS2 | 200 fuera de contrato → lista vacía | `48c8871` |
| D-09 | Media / P2 | Corregido | MS2 | Métricas Admin «0» ante fallo | `87c0520` |
| D-10 | Baja / P3 | Corregido | — (demo) | Cifras demo del portal Cliente incoherentes | `01cbaf9` |
| D-11 | **Alta / P1** | **Abierto** | Gateway | URL por defecto `DEPLOYMENT_NOT_FOUND` | documentado en `37d8da9` |
| D-12 | Media / P2 | Corregido | — (navegación) | «Volver» sin historial inoperante | `9cb4144` |
| D-04 | Media / P2 | No reproducible | MS2 / Gateway | 504 anónimo en la Gateway Vercel, hoy retirada | — |

Resumen: **12 defectos registrados; 10 corregidos, 1 abierto (D-11), 1 no reproducible por entorno retirado (D-04)**. Ningún defecto se atribuye a un microservicio sin evidencia: D-11 es de configuración del despliegue; D-04 quedó sin causa conocida.

D-11 es P1 porque cualquier ejecución con la configuración versionada falla por completo; está mitigado (variable de entorno en la línea de comandos y despliegue Kubero ya configurado), por eso no bloquea la demo.

## Observaciones (no son defectos demostrados)

| ID | Observación | Riesgo | Acción propuesta |
| --- | --- | --- | --- |
| O-01 | `ErrorMessage` declara `accessibilityRole="alert"` en un `View` no accesible | Lector de pantalla podría no anunciar el error | Verificar con TalkBack en dispositivo |
| O-02 | `INITIAL_ADMIN_DASHBOARD_DATA` (cifras fijas) exportado y sin uso | Reintroducción accidental | Eliminar con acuerdo del equipo; SCRUM-163 impide su import en pantallas |
| O-03 | Listado MS4 sin `limite`/`desde` (máx. 50 por defecto) | Órdenes con >50 evidencias truncadas sin aviso | Paginar si el negocio lo requiere |
| O-04 | `(cliente)/mis-ordenes/[id]` sin enlaces | Duplicación de mantenimiento | Unificar con `ordenes/[id]` |
| O-05 | 12 paquetes Expo por debajo de lo esperado por SDK 58 | Compatibilidad futura | `npx expo install --fix` en rama propia, con autorización |
| O-06 | MS1 reportó `tiempo_agotado` una vez y se recuperó | Login intermitente en la demo | Preflight antes de presentar |
| O-07 | Almacenamiento MS4 no verificable por salud pública | Subida podría fallar | Prueba de subida con datos de QA |

## Checklist técnico final

| Ítem | Estado | Evidencia |
| --- | --- | --- |
| Suite completa sin fallos | ✅ 89 suites / 1435 PASS | [SCRUM-165](SCRUM-165.md) |
| Regresión | ✅ 52 suites / 981 PASS (antes de las suites de SCRUM-166; repetida en la validación final) | SCRUM-165 |
| TypeScript | ✅ exit 0 | SCRUM-165 |
| Lint | ✅ 0 errores (46 advertencias previas) | SCRUM-165 |
| Expo Doctor | ⚠️ 19/20 (versiones) | SCRUM-165 |
| Exportación Android / web | ✅ exit 0 / exit 0 | SCRUM-165 |
| Ejecución real en Android | ❌ NOT RUN (sin SDK/dispositivo) | [SCRUM-226](../semana-3/SCRUM-226.md) |
| Error ≠ lista vacía (servicio y UI) | ✅ | [SCRUM-162](../semana-3/SCRUM-162.md), [SCRUM-224](../semana-3/SCRUM-224.md) |
| Sin cifras ficticias en entorno real | ✅ | [SCRUM-163](../semana-3/SCRUM-163.md), [SCRUM-225](../semana-3/SCRUM-225.md) |
| MS4: contrato y estados | ✅ automatizado; ⛔ autenticado real BLOCKED | [SCRUM-164](../semana-3/SCRUM-164.md) |
| Navegación Cliente | ✅ automatizado; ❌ Android NOT RUN | [SCRUM-228](SCRUM-228.md) |
| Demo reproducible y guion | ✅ preparados; ⛔ ensayo con cuentas BLOCKED | [SCRUM-166](SCRUM-166.md), [SCRUM-229](SCRUM-229.md) |
| Sin secretos ni `.env` en commits | ✅ `.env*` no modificados ni versionados | git log de esta ejecución |
| Commits individuales por ticket, sin push | ✅ | [SCRUM-230](SCRUM-230.md) |

## Aprobaciones pendientes del equipo

| Decisión | Responsable | Aprobado |
| --- | --- | --- |
| Corregir D-11 (URL por defecto) en `src/config/env.ts` y `.env.example` | Pendiente de asignar | ☐ |
| Entregar cuentas de QA por rol y orden de demo con presupuesto enviado | QA (pendiente de asignar) | ☐ |
| Actualizar dependencias Expo (O-05) | Pendiente de asignar | ☐ |
| Validación en dispositivo Android | Pendiente de asignar | ☐ |
| Revisión y push de los commits de la rama `Victor` | Propietario de la rama | ☐ |
| Aceptación de este acta | Equipo | ☐ |

Hash: `git log -1 --format=%H -- docs/sprint-3/semana-4/SCRUM-167.md`.
