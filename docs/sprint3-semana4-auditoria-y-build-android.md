# Sprint 3 · Semana 4 — Auditoría de Variables, Permisos, Orientación y Build Android

## 1. Unificación de estados vacíos y retiro de textos demostrativos (`S3-AMP-S4-JUAN-01`, `S3-AMP-S4-JUAN-04`)

- Se centralizó el catálogo de estados vacíos en [`src/constants/emptyStates.ts`](../src/constants/emptyStates.ts) (`EMPTY_STATE_COPY`) y se ocultó el glifo decorativo de [`EmptyState.tsx`](../src/components/common/EmptyState.tsx) a lectores de pantalla.
- Se retiraron todos los textos de demostración residuales del flujo real:
  - [`src/app/(cliente)/cliente.tsx`](../src/app/(cliente)/cliente.tsx) (Semana 1)
  - [`src/components/budgets/BudgetDetailScreen.tsx`](../src/components/budgets/BudgetDetailScreen.tsx) (Semana 2)
  - [`src/components/inventory/InventoryScreen.tsx`](../src/components/inventory/InventoryScreen.tsx) (Semana 4: retirado aviso *"Datos simulados para desarrollo..."*)

---

## 2. Auditoría de variables públicas, URL de integración y permisos (`S3-S4`, `S3-AMP-S4-JUAN-03`)

### Variables públicas (`.env.example` y `src/config/env.ts`)
- **URL oficial de integración/producción (Kubero UCT):** `https://api-tallerconnect.inf.uct.cl/api`
- **Flags activos en integración:**
  - `EXPO_PUBLIC_API_URL=https://api-tallerconnect.inf.uct.cl/api`
  - `EXPO_PUBLIC_USE_MOCK_AUTH=false`
  - `EXPO_PUBLIC_USE_MOCK_SERVICES=false`
  - `EXPO_PUBLIC_DEMO_WORKFLOW=false`
  - `EXPO_PUBLIC_ENABLE_NOTIFICATIONS_API=false`
- **Validación de seguridad:** `src/config/env.ts` exige HTTPS, origen oficial `https://api-tallerconnect.inf.uct.cl` y ruta exacta `/api` en `integration`/`production`. Ningún secreto ni contraseña vive en variables `EXPO_PUBLIC_*` ni en el repositorio.

### Permisos Android y orientación (`app.json`)
- **Orientación:** `"orientation": "portrait"` (vertical fija).
- **Permisos declarados (mínimos necesarios):**
  - `expo-secure-store`: almacenamiento seguro de sesión JWT.
  - `expo-camera`: captura de fotografías/videos de evidencia técnica.
  - `expo-image-picker`: selección de evidencias desde galería.

---

## 3. Build Android candidato y Smoke Test (`S3-S4`, `S3-AMP-S4-JUAN-02`)

### Exportación Android verificada
- `expo export --platform android` compiló el bundle Hermes `.hbc` (`1578 modules`, `4.6 MB`) sin errores de compilación ni de TypeScript (`tsc --noEmit`: 0 errores).
- *(Nota técnica del escaneo binario de `scripts/verify-integration-build.mjs`: `src/` tiene 0 referencias a `localhost`; la coincidencia detectada en `.hbc` proviene de dependencias internas de React Native/Expo en `node_modules`).*

### Comandos para generar e instalar la versión candidata Android
```bash
# 1. Validar tipos y smoke test de la Gateway Kubero
npm run typecheck
node scripts/smoke-api.mjs

# 2. Exportar bundle Android de producción/integración
npm run export:android

# 3. Levantar en dispositivo físico Android con Expo Go (puerto libre 8089)
npx expo start -c --port 8089
```

### Smoke test ejecutado contra Kubero UCT (`https://api-tallerconnect.inf.uct.cl/api`)
- `GET /api/health` → `200 OK`
- `GET /api/health/servicios` → `200 OK` (`ms1_auth`, `ms2_taller`, `ms3_presupuestos`, `ms4_evidencias` todos en `ok`)
- `GET /api/ordenes` (token inválido) → `401 Unauthorized`
- Login y paneles reales validados para los 3 roles:
  - **Cliente** (`cliente@pruebas.cl`): `200 OK` → `/cliente` (6 vehículos, 7 órdenes)
  - **Mecánico** (`mecanico@pruebas.cl`): `200 OK` → `/mecanico` (5 órdenes asignadas, 5 vehículos)
  - **Administrador** (`administrador@pruebas.cl`): `200 OK` → `/administrador` (7 vehículos, 8 órdenes, 2 alertas)

### Capturas finales en orientación vertical (`390×844`)
Guardadas en `docs/evidencias-s3/`:
- `login-portrait.png`
- `cliente-portrait.png`
- `mecanico-portrait.png`
- `administrador-portrait.png`
