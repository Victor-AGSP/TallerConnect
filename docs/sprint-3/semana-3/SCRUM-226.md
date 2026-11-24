# SCRUM-226 — evidencia de error MS4 en Android

Fecha: 2026-11-24. Rama `Victor`. Estado inicial: **PENDING**. Resultado: **BLOCKED para ejecución en Android**; preparación y diagnóstico completados.

## Entorno verificado

[Registro de herramientas](evidencias/SCRUM-226-herramientas.txt):

| Requisito | Estado en esta máquina |
| --- | --- |
| Android SDK (`ANDROID_HOME`, `~/Android/Sdk`) | No instalado |
| `adb`, `emulator`, `sdkmanager`, `avdmanager`, `scrcpy` | No encontrados |
| Dispositivo físico USB | `lsusb` no reconoce dispositivos Android |
| Expo CLI / Node | 58.1.19 / v26.13.1 |
| Java | `/usr/bin/java` |

**No hubo ejecución en Android, ni capturas, ni logcat.** No se inventan. Instalar el SDK requiere `pacman`/`sudo`, que exigen autorización explícita y no se ejecutaron.

## Diagnóstico sin dispositivo

1. **D-11 (bloqueante para cualquier prueba móvil con la configuración actual):** `.env` y `.env.local` (no versionados, no modificados) y los valores por defecto de `src/config/env.ts` usan `https://tallerconect.vercel.app/api`, que responde **404 `DEPLOYMENT_NOT_FOUND`** ([sondas](evidencias/SCRUM-164-http.json)). En Android, cualquier pantalla mostraría el error genérico de servidor (404 «El recurso solicitado no fue encontrado.»), no un error de MS4.
2. La Gateway vigente `https://api-tallerconnect.inf.uct.cl/api` informa MS4 `ok` y rechaza el listado anónimo con 401 ([SCRUM-164](SCRUM-164.md)). El 503 de almacenamiento de sprints anteriores no se reproduce con las rutas disponibles.
3. **Exportación Android con la Gateway vigente: exit 0.** Pasando `EXPO_PUBLIC_API_URL` en el comando (Expo no sobrescribe variables ya definidas en el shell), el bundle Hermes incluye `api-tallerconnect.inf.uct.cl`. Esto valida empaquetado y configuración, **no la ejecución en Android**.

## Procedimiento reproducible para capturar la evidencia

Requiere un teléfono Android con Expo Go para SDK 58 en la misma red, o un emulador, y una cuenta Cliente o Mecánico autorizada por QA con una orden que tenga evidencias.

```bash
# 1. Herramientas (con autorización del responsable de la máquina)
sudo pacman -S android-tools            # provee adb
adb devices                             # el dispositivo debe aparecer como "device"

# 2. Metro con la Gateway vigente y traza HTTP segura (método, ruta sin query, estado)
EXPO_PUBLIC_API_URL=https://api-tallerconnect.inf.uct.cl/api \
EXPO_PUBLIC_APP_ENV=integration EXPO_PUBLIC_HTTP_TRACE=true \
npx expo start --clear --lan --go --port 8081

# 3. Logs del dispositivo (terminal aparte)
adb logcat -c && adb logcat -v time ReactNativeJS:V '*:S' | tee scrum-226-logcat.txt

# 4. Captura de pantalla en cada paso
adb exec-out screencap -p > scrum-226-paso-N.png
```

Flujo: iniciar sesión → «Ver mis vehículos» → vehículo → orden → «Ver evidencias» → «Ver fotografía». Para el caso de error sin alterar el backend: activar el modo avión tras abrir la orden y pulsar «Ver evidencias» (error de red → «Reintentar»); desactivarlo y reintentar.

Registrar por paso, sin tokens ni datos personales:

| Campo | Valor a registrar |
| --- | --- |
| Fecha/hora (UTC) y zona del dispositivo | |
| Dispositivo, versión Android, Expo Go | |
| Versión de app (`app.json` 1.0.0) y commit | |
| Gateway y entorno | `api-tallerconnect.inf.uct.cl`, integration |
| Ruta consultada | `GET /api/evidencias` (sin query en la traza) |
| Código HTTP (línea `[HTTP] GET …/evidencias <estado>`) | |
| Pantalla y mensaje visible | captura |
| Líneas de logcat relevantes | extracto |

Antes de guardar logcat, revisar que no contenga `Authorization`, tokens ni correos; la traza de la app no los registra, pero otras bibliotecas podrían hacerlo.

## Pendiente

Ejecución real en Android: **BLOCKED** (sin SDK/dispositivo, sin cuentas autorizadas). Decisión de corregir D-11 en `src/config/env.ts` y en los `.env` locales: pendiente del equipo (se documenta en [SCRUM-227](SCRUM-227.md)).

Hash: `git log -1 --format=%H -- docs/sprint-3/semana-3/SCRUM-226.md`.
