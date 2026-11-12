# SCRUM-158 — revisión de rutas y autenticación

Estado: **BLOCKED para aceptación real**. Revisión y diagnóstico ejecutados el 11-11-2026 en la rama `Victor`, base `872a862`. En la continuación autorizada se registra la corrección técnica del matcher mediante un commit independiente, **sin afirmar autenticación real validada**. El baseline y el diagnóstico se conservan como evidencia histórica; la aceptación real sigue bloqueada.

## Preparación y criterios

Repositorio confirmado: `TallerConnect`, remoto `https://github.com/Victor-AGSP/TallerConnect.git`. Estado inicial limpio en `main`; cambio seguro a `Victor`, sin merges, rebases ni push. No hay AGENTS.md aplicable en el repositorio. GitHub Issues: búsquedas `repo:Victor-AGSP/TallerConnect is:issue` y `repo:Victor-AGSP/TallerConnect SCRUM` devolvieron listas vacías. No hay criterios ni comentarios de los siete tickets recuperables; se usan exclusivamente los criterios del usuario. No se equiparan los números SCRUM a números de Issues.

Instalación: `npm ci`; ejecución: `npm start`, `npm run web`, `npm run android`, `npm run ios`; validaciones existentes: `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:regression`, `npm run export:android`. Node observado v26.12.1, npm 12.2.1. Se usó node_modules ya instalado, sin instalar ni modificar dependencias. Sus versiones pueden diferir del lock de Victor al provenir del workspace previo; no es una instalación limpia de CI. Expo Router como entry, rutas en `src/app`, esquema `tallerconnect`, plugins SecureStore/cámara/selector en `app.json`.

## Mecanismo observado en código

| Área | Implementación y límite |
| --- | --- |
| Login | `src/services/auth.service.ts`: POST `/auth/login`, email normalizado, `access_token`; usa usuario recibido o GET `/auth/me` con Bearer explícito. Mappers y schemas rechazan respuestas malformadas/roles desconocidos. `src/app/(auth)/login.tsx` valida formulario. |
| Persistencia | `src/stores/authStore.ts`: sesión compuesta `tallerconnect.auth.session`, claves legacy `tc_auth_token`, `tc_user_data`, escrituras serializadas y protección frente a carreras. `src/utils/storage.ts`: SecureStore nativo y localStorage web (no limitado por entorno). |
| Arranque | `src/app/_layout.tsx` llama `hydrateSession`, valida estructura local pero no consulta backend ni `exp`. `restoreSession` sí consulta `/auth/me`, aunque no es la acción del arranque. No equivale a validación actual del token. |
| Navegación | `/` usa `getAuthRouteForRole`; cliente → `/cliente`, mecánico → `/mecanico`, administrador → `/administrador`. Cada layout de grupo envuelve sus rutas en `RoleGuard`. Las rutas repetidas como `/vehiculos/[id]` requieren grupo explícito en pruebas de enlaces profundos. |
| Acceso ajeno | RoleGuard espera carga; sin sesión → `/login`; rol incorrecto → su home. Esto protege UI; la propiedad de recursos y los permisos HTTP dependen del backend. |
| Expiración | Interceptor elimina sesión ante 401 protegido; 401 de login no hace logout, 403 informa permisos y conserva sesión. No hay renovación implementada. |
| Logout | Acción local borra memoria y claves persistidas; fallo de borrado genera `sessionIssue`. No se llama endpoint remoto de logout. |
| Errores | Normalización HTTP/red/timeout y banner de conectividad. No se verificó en dispositivo. |

## Configuración real

`src/config/env.ts` resuelve `EXPO_PUBLIC_API_URL` antes del entorno; integración/producción por defecto usa `https://tallerconect.vercel.app/api`. Para una sesión local de QA: definir URL autorizada y `EXPO_PUBLIC_USE_MOCK_AUTH=false`, `EXPO_PUBLIC_USE_MOCK_SERVICES=false`, reiniciar Expo para recompilar variables. Servicios tienen fallback a la bandera de auth si no se define la propia. `EXPO_PUBLIC_ENABLE_NOTIFICATIONS_API` controla HTTP de notificaciones; deshabilitado puede generar avisos derivados de otros dominios. No usar cuentas demo como cuentas backend.

El `.env` local ya apuntaba al despliegue etiquetado producción, ambas banderas mock en false. No se editó ni se agregó a Git. No hay credenciales reales de prueba ni datasets autorizados en la configuración inspeccionada; los usuarios documentados en README son demo. Se solicitó ubicación segura de cuentas/QA, sin pedir secretos en el chat.

## Resultados

| ID | Rol | Escenario / esperado | Observado | Estado | Evidencia |
| --- | --- | --- | --- | --- | --- |
| NET-AUTH-ME | Anónimo | GET `/api/auth/me` sin token → 401 | HTTP 401, sin sesión enviada | PASS real HTTP | [Registro HTTP](evidencias/SCRUM-216-http.json) |
| AUTO-AUTH | Tres roles | Login, sesión, logout, guardas y cambio de rol según suites existentes | 153/153 con mocks, después de corregir utilidad; no login backend | PASS automatizado con mocks | [Resumen](evidencias/SCRUM-216-auth.json) |
| REAL-C | Cliente | Login válido/inválido, home, persistencia, logout y expiración reales | No ejecutado: falta cuenta de QA, datos propios/ajenos y dispositivo/navegador instrumentado | BLOCKED | [Checklist autosuficiente](SCRUM-216-checklist-autenticacion.md) |
| REAL-M | Mecánico | Mismos escenarios con asignación y rutas del rol | No ejecutado: mismas dependencias | BLOCKED | [Checklist](SCRUM-216-checklist-autenticacion.md) |
| REAL-A | Administrador | Mismos escenarios y permisos exclusivos | No ejecutado: mismas dependencias | BLOCKED | [Checklist](SCRUM-216-checklist-autenticacion.md) |

## Validaciones históricas y corrección técnica

Baseline `npm test`: 1117 PASS, 138 FAIL, 1255 total, [73 suites](evidencias/SCRUM-158-baseline.json). El matcher propio importaba `expo-router/build/global-state/router-store`, ausente en Expo instalado. Se eliminó ese override: Expo ya registra `toHavePathname` público. Las suites de navegación existentes validan el cambio (54/54 en primera selección; 153/153 en selección de autenticación final). No se alteró autenticación de producción para este diagnóstico.

`npm run typecheck`: FAIL inicial, `setIsLoading` inexistente en administrador:98 y tres reexportaciones de errores desde evidence.service en services/index:52–54. `CI=1 npm run lint`: FAIL inicial, 2 errores `react-hooks/set-state-in-effect` en administrador:108 y admin/ordenes/index:83, 46 advertencias. Las correcciones de consulta administrativa se realizaron en SCRUM-219 y las del barrel MS4 en SCRUM-157. El registro inicial se conserva como fallo histórico, no como estado actual.

Revisión de diff y `git diff --check`: sin errores de espacios. No se guardaron respuestas con token, contraseñas, cookies, capturas ficticias ni datos de cuentas. La aceptación real permanece bloqueada y este ticket no tiene commit que acredite validación autenticada real.

## Verificación del árbol de trabajo en la primera entrega

Tras los tickets independientes, TypeScript, lint (0 errores/46 advertencias), 1259 pruebas completas, 841 de regresión y exportación Android pasaron. [Registro final](evidencias/SCRUM-157-herramientas.txt). Incluyen la corrección de test-utils de este ticket todavía sin commit. La aceptación real de SCRUM-158 sigue BLOCKED por cuentas QA, dataset y ejecución en dispositivo/navegador; los resultados automatizados no la sustituyen. No se creó el commit que anunciaría autenticación real validada.

## Continuación — corrección técnica aislada (12-11-2026 UTC)

Se inspeccionaron íntegramente los tres archivos pendientes: utilidad, este documento y baseline. El baseline coincide con el JSON bruto conservado de la ejecución inicial: 73 suites, 1117 PASS y 138 FAIL; se mantiene sin alterar sus resultados.

**Dictamen del matcher:** la eliminación del override es correcta y necesaria para Expo Router instalado 58.0.30. `expo-router/testing-library` registra el matcher público y sus tipos. La implementación oficial consulta `screen.getPathname()` y compara la ruta real; el override anterior dependía de `expo-router/build/global-state/router-store`, ausente en esa instalación. No se omiten ni se sustituyen las aserciones por constantes. La versión instalada satisface el rango declarado `~58.0.28`, aunque difiere del lock 58.0.28; no se instaló ni actualizó ninguna dependencia y no se afirma una ejecución limpia mediante `npm ci`.

La prueba existente de utilidades ahora comprueba también la ruta inicial, `.not` para una ruta distinta y que una aserción incorrecta lance error; luego verifica la navegación a `/perfil`. Las suites de rutas protegidas comprueban acceso propio de Cliente/Mecánico/Administrador, seis combinaciones de acceso cruzado, rutas anónimas y cambio de rol. El matcher compara rutas y no decide permisos de negocio.

Validación previa al commit técnico: **153 PASS, 0 FAIL, 16 suites** de autenticación/sesión/rutas/utilidades con mocks; TypeScript exit 0; lint exit 0, 0 errores/46 advertencias. [Comandos, versiones y resultados](evidencias/SCRUM-158-matcher-tecnico.json). `git diff --check` y revisión de secretos sin hallazgos. El commit técnico registra solo la utilidad, sus aserciones de regresión y esta evidencia/diagnóstico; **no cierra SCRUM-158**. Se ejecutarán de nuevo las herramientas sobre el estado ya confirmado, manteniendo separada la revisión posterior de QA/MS4.
