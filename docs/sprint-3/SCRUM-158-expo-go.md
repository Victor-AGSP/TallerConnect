# SCRUM-158 — ejecución local con Expo Go y API desplegada

12-11-2026. Preparación técnica comprobada; **autenticación real BLOCKED**. Esta evidencia actualiza la configuración de ejecución, sin cambiar los 64 casos originales: 3 PASS de formulario UI y 61 BLOCKED.

La base HTTP es `https://tallerconect.vercel.app/api`; los servicios añaden `/auth/login`, `/auth/me`, `/vehiculos`, etc. El destino sigue siendo **producción**. No se necesita levantar otro backend para abrir el frontend. Los inicios de sesión y lecturas con las cuentas aportadas requieren autorización explícita para ese destino; todavía no se hicieron solicitudes autenticadas. Las contraseñas pueden introducirse directamente en el formulario del teléfono.

## Configuración local reproducible

`.env.local` está excluido por `.gitignore` (`.env.*`) y tiene permisos 0600. Contiene solo configuración pública, sin contraseñas:

```dotenv
EXPO_PUBLIC_API_URL=https://tallerconect.vercel.app/api
EXPO_PUBLIC_APP_ENV=production
EXPO_PUBLIC_USE_MOCK_AUTH=false
EXPO_PUBLIC_USE_MOCK_SERVICES=false
EXPO_PUBLIC_DEMO_WORKFLOW=false
EXPO_PUBLIC_ENABLE_NOTIFICATIONS_API=true
EXPO_PUBLIC_HTTP_TRACE=true
```

Los siete servicios de dominio respetan ahora la bandera específica de servicios, con el mismo criterio central de precedencia. La autenticación conserva su bandera independiente. Se añadió `ENV.USE_DEMO_DATA`, que solo autoriza demostraciones cuando están habilitados explícitamente demo **y** servicios mock; su aplicación a las vistas se valida en los tickets de consulta. La traza es optativa y registra únicamente método, destino sin query/credenciales y estado; no registra cuerpos, cabeceras ni tokens. Sus pruebas verifican respuestas 200/401/503 y fallo de red con datos ficticios de prueba, nunca cuentas reales.

```bash
npx expo start --clear --lan --go --max-workers 2 --port 8081
```

Abrir el QR de Metro desde Expo Go compatible con SDK 58, con teléfono y equipo en la misma Wi-Fi. La dirección LAN depende del equipo; usar la que imprime Metro. Si falla, comprobar aislamiento de clientes Wi-Fi/VPN/firewall antes de usar `npx expo start --clear --tunnel --go`. No se instaló ni se probó un túnel porque no se observó todavía un fallo de LAN desde teléfono.

## Validaciones observadas

[Resultado estructurado](evidencias/SCRUM-158-expo-go.json). Node 26.12.1, Expo 58.0.23; manifiesto Android y bundle JavaScript dev servidos por Metro con HTTP 200. Eso valida compilación y entrega local, **no ejecución física ni navegación autenticada**. `npx expo install --check` recomienda 11 actualizaciones patch de Expo; exit 1, sin instalar ni modificar dependencias.

TypeScript exit 0; suite completa 76 suites / 1278 PASS / 0 FAIL; lint 0 errores / 46 advertencias preexistentes; `git diff --check` sin errores. Las 19 pruebas añadidas verifican precedencia de adaptadores y privacidad de la traza, con dobles de prueba. No sustituyen integración real.

Salud pública: Gateway 200; agregación de servicios 503 con timeout reportado para MS1–MS4. El agregado no acredita una causa raíz del almacenamiento MS4. No se hicieron escrituras, creación de cuentas, carga de archivos ni cambios sobre datos de producción.

Pendiente: autorización de login/lectura en este destino, apertura observada en teléfono, acceso seguro a contraseñas si ejecuta el agente, confirmar existencia/activación/roles de las cuentas mediante login, y datasets propios/ajenos para consultas y separación de roles. SCRUM-158/216/217/218/219/156 conservan pendiente la validación autenticada real; SCRUM-157 conserva sin confirmar la causa interna de MS4.
