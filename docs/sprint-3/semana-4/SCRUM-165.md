# SCRUM-165 — regresión completa con Expo SDK 58 y Android

Fecha: 2026-11-24. Rama `Victor`, código en `9cb4144`. Estado inicial: **PENDING**. Resultado: **pruebas y exportaciones PASS; compatibilidad SDK con 12 paquetes desactualizados; ejecución Android NOT RUN**.

[Registro completo de herramientas](evidencias/SCRUM-165-validacion.txt).

## Resultados por tipo de validación

| Tipo | Comando | Resultado |
| --- | --- | --- |
| Pruebas unitarias e integración (dobles de HTTP, Expo Router en memoria) | `npm test` (`jest --runInBand`) | **89 suites / 1435 PASS / 0 FAIL / 0 omitidas** — [JSON](evidencias/SCRUM-165-suite-completa.json) |
| Regresión | `npm run test:regression` | **52 suites / 981 PASS / 0 FAIL** — [JSON](evidencias/SCRUM-165-regresion.json) |
| TypeScript | `npx tsc --noEmit` | exit 0 |
| Lint | `npm run lint` | exit 0; 0 errores / 46 advertencias (idénticas a la línea base) |
| Compatibilidad SDK 58 | `npx expo-doctor` | **19/20 checks**; exit 1 por versiones (fila siguiente) |
| Dependencias esperadas por SDK 58 | `npx expo install --check` | exit 1: 11 paquetes con diferencia *patch* y `expo-web-browser` 58.0.7 → ~58.1.0 (*minor*) |
| Exportación Android | `npx expo export --platform android` | exit 0; bundle Hermes, 1569 módulos |
| Exportación web | `npx expo export --platform web` | exit 0; 1120 módulos, páginas estáticas por ruta |
| Ejecución real en Android | — | **NOT RUN**: sin SDK, `adb`, emulador ni dispositivo ([SCRUM-226](../semana-3/SCRUM-226.md)) |
| Validación contra servicios reales | sondas GET anónimas | Gateway vigente y MS1–MS4 `ok`; sin flujos autenticados (**BLOCKED**, sin cuentas) — [SCRUM-164](../semana-3/SCRUM-164.md) |

Línea base del inicio del sprint (HEAD `24bfbbe`): 83 suites / 1321 PASS. Diferencia: **+6 suites y +114 pruebas** de esta semana, sin fallos.

## Compatibilidad con Expo SDK 58

Versiones instaladas vs esperadas por `expo` 58.0.23 (instalado; esperado ~58.0.26): `@expo/ui`, `expo`, `expo-constants`, `expo-font`, `expo-linking`, `expo-router`, `expo-secure-store`, `expo-splash-screen`, `expo-status-bar`, `expo-symbols`, `jest-expo` (*patch*) y `expo-web-browser` (*minor*). Ninguna prueba, exportación ni verificación de tipos falla con las versiones actuales. **No se actualizaron**: instalar dependencias requiere autorización. Recomendación al equipo: `npx expo install --fix` en una rama propia, seguido de esta misma batería.

## Notas

- Las exportaciones de esta batería usan la configuración local (`.env.local`, Gateway Vercel retirada, D-11). Son válidas como prueba de empaquetado; la exportación con la Gateway vigente se comprobó en SCRUM-226.
- Exportar no equivale a instalar ni ejecutar en Android.

Hash: `git log -1 --format=%H -- docs/sprint-3/semana-4/SCRUM-165.md`.
