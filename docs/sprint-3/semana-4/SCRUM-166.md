# SCRUM-166 — demo reproducible y contingencia MS4

Fecha: 2026-11-24. Rama `Victor`. Estado inicial: **PENDING**. Resultado: **procedimiento preparado y comprobado hasta donde es posible sin cuentas**; ejecución autenticada pendiente de QA.

Este documento es el procedimiento técnico. El guion de presentación está en [SCRUM-229](SCRUM-229.md).

## 1. Requisitos

| Requisito | Valor |
| --- | --- |
| Node.js | `^22.13.0 \|\| >=24.3.0` (`package.json`); verificado con v26.13.1 |
| npm | incluido con Node |
| Expo | SDK 58 (`expo` ^58.0.21; CLI 58.1.19 verificado) |
| Navegador | cualquiera moderno (demo web) |
| Teléfono (opcional) | Android con Expo Go para SDK 58, en la misma Wi-Fi |
| Cuentas | Una por rol (Cliente, Mecánico, Administrador) **autorizadas por QA** para la Gateway vigente, y una orden del Cliente con presupuesto enviado. No hay cuentas versionadas; no se escriben en documentos |

## 2. Instalación

```bash
git clone https://github.com/Victor-AGSP/TallerConnect.git && cd TallerConnect
git checkout Victor
npm ci
```

## 3. Configuración del entorno (sin editar `.env`)

La URL por defecto `https://tallerconect.vercel.app/api` ya no existe (**D-11**, `DEPLOYMENT_NOT_FOUND`). Se pasa la Gateway vigente en la línea de comandos; Expo no sobrescribe variables ya definidas en el shell, por lo que `.env` / `.env.local` no se tocan.

```bash
export EXPO_PUBLIC_API_URL=https://api-tallerconnect.inf.uct.cl/api
export EXPO_PUBLIC_APP_ENV=integration
export EXPO_PUBLIC_USE_MOCK_AUTH=false
export EXPO_PUBLIC_USE_MOCK_SERVICES=false
export EXPO_PUBLIC_DEMO_WORKFLOW=false
export EXPO_PUBLIC_HTTP_TRACE=true   # opcional: método, ruta y estado en consola; sin cuerpos ni tokens
```

Alternativa sin servidor local: frontend web desplegado en Kubero `https://frontend-movil.inf.uct.cl` (su `/api` hace proxy a la misma Gateway).

## 4. Verificación de conectividad y estado de MS4

```bash
scripts/demo-preflight.sh                       # Gateway vigente por defecto
```

Solo GET anónimos. Comprueba Gateway, salud de MS1–MS4 y que `/api/evidencias` y `/api/auth/me` exijan autenticación (401). Resultado registrado el 2026-11-24: [Gateway vigente: 7/7 OK, exit 0](evidencias/SCRUM-166-preflight.txt); contra la URL Vercel por defecto, 7/7 FALLA (404), exit 1, lo que confirma D-11.

Repetirlo **15 minutos antes** y **justo antes** de la demo: el 2026-11-24 se observó una vez `ms1_auth: tiempo_agotado` que se recuperó en minutos ([SCRUM-164](../semana-3/SCRUM-164.md)).

## 5. Arranque

```bash
npm run web                                     # navegador: http://localhost:8081
npx expo start --clear --lan --go --port 8081   # teléfono: escanear el QR con Expo Go
```

## 6. Roles y flujos disponibles

| Rol | Ruta inicial | Flujos demostrables |
| --- | --- | --- |
| Cliente | `/cliente` | Mis vehículos → detalle → orden → presupuesto (aprobar/rechazar versión enviada) → evidencias visibles |
| Mecánico | `/mecanico` | Vehículos y órdenes asignadas, avances (bitácora MS2), captura de evidencias (MS4), inventario |
| Administrador | `/administrador` | Panel con métricas reales, órdenes, vehículos, repuestos, proveedores, presupuestos |

Cada rol queda confinado a su grupo de rutas (`RoleGuard`); un enlace a otro grupo redirige al inicio propio ([SCRUM-228](SCRUM-228.md)).

## 7. Contingencia

**Principio:** nunca presentar datos simulados como reales ni ocultar un error del backend.

| Situación (según preflight o en vivo) | Acción |
| --- | --- |
| Todo OK | Demo real completa |
| Solo `ms4_evidencias` caído o MS4 responde 5xx | Seguir la demo real con MS1–MS3. Al abrir evidencias, **mostrar el error real** y «Reintentar» (comportamiento verificado en SCRUM-164/224). Explicar que es una dependencia externa. Mostrar luego MS4 con su suite automatizada (ver abajo) |
| `ms1_auth` caído (no hay login) | Repetir preflight tras 2–3 min (se observó recuperación). Si persiste: modo demostración identificado (abajo) para navegación y UI, y suites automatizadas para la integración |
| Gateway caída / sin red | Modo demostración identificado + suites automatizadas |

**MS4 no tiene modo simulado en la interfaz.** La lista de evidencias (`evidenceService.listEvidence`) siempre consulta la API real, y con los IDs mock (`ot-00124`) rechaza el identificador. Esto evita mostrar evidencias inventadas; por eso la contingencia de MS4 es el error real + pruebas automatizadas, no un mock.

Demostración automatizada de MS4 (sin backend, resultados reales de Jest):

```bash
npx jest evidence --verbose          # 11 suites: contrato, roles, errores, reintento, URL prefirmada
```

Modo demostración identificado (solo si MS1/Gateway no están disponibles). Usar **otro puerto** para no confundirlo con la instancia real:

```bash
EXPO_PUBLIC_USE_MOCK_AUTH=true EXPO_PUBLIC_USE_MOCK_SERVICES=true EXPO_PUBLIC_DEMO_WORKFLOW=true \
  npx expo start --web --port 8082
```

Cuentas demo del README (`cliente@demo.local`, `mecanico@demo.local`, `admin@demo.local`, contraseña `123456`) solo existen en este modo. En él la app muestra una franja **«Modo demostración: datos simulados, no provienen del taller»** en todas las pantallas y la portada del Cliente lo repite. Anunciarlo verbalmente al cambiar.

## 8. Cambios y pruebas de este ticket

- `scripts/demo-preflight.sh`: preflight de solo lectura (sección 4).
- `src/components/common/DemoModeBanner.tsx` montado en `src/app/_layout.tsx`: franja visible en todas las pantallas cuando `USE_MOCK_SERVICES` o `USE_MOCK_AUTH` están activos; con la configuración real no se renderiza.
- `__tests__/demo-mode-banner.test.tsx`: franja con cada bandera, ausencia en configuración real, presencia sobre cualquier pantalla vía layout raíz, y MS4 sin camino simulado (la lista consulta la API y propaga el 503; un ID mock `ot-00124` se rechaza sin llamar a la API). **6 PASS / 0 FAIL** — [JSON](evidencias/SCRUM-166.json). Suites de layout, sesión, rutas, componentes comunes, conectividad y exportaciones públicas: **7 suites / 74 PASS** — [JSON](evidencias/SCRUM-166-relacionadas.json). TypeScript y ESLint exit 0.

## 9. Lo que no está verificado

- Ejecución con cuentas reales (no hay cuentas autorizadas en esta máquina): **BLOCKED**.
- Teléfono Android: sin SDK/dispositivo ([SCRUM-226](../semana-3/SCRUM-226.md)).
- Estado de almacenamiento MS4: la Gateway informa MS4 `ok`, pero no expone salud del almacenamiento; solo una subida real lo confirmaría.

Hash: `git log -1 --format=%H -- docs/sprint-3/semana-4/SCRUM-166.md`.
