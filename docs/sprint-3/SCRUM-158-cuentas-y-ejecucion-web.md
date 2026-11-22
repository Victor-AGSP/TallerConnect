# SCRUM-158 — cuentas informadas, backend y ejecución real de UI

Actualización del 12-11-2026 UTC. **El usuario proporcionó las identidades de prueba de Cliente, Mecánico y Administrador. La ausencia de cuentas identificadas ya no es el diagnóstico vigente.** Su existencia, activación y roles en el backend todavía no se han verificado mediante login: identificar un correo no prueba que la cuenta esté operativa.

El bloqueo actual es **identificar el destino QA autorizado y disponer de acceso efectivo al mecanismo seguro de contraseñas**. No se encontró configuración QA en el proceso ni `.env.qa.local`; se solicitó su ubicación/configuración sin pedir contraseñas en el chat. Eso no afirma que las contraseñas no existan fuera de esta sesión. No se probaron claves supuestas, valores demo ni solicitudes de enumeración de usuarios.

## Backend y contrato comprobados

| Comprobación | Observación | Alcance |
| --- | --- | --- |
| URL del frontend | `.env`: `https://tallerconect.vercel.app/api`, entorno `production` | No se modificó. Las constantes de integración y producción apuntan al mismo host; no identifica por sí solo un QA aislado. |
| GET `/api/auth/me` sin sesión | HTTP 401 | Conectividad real y rechazo anónimo; no confirma ninguna cuenta ni sesión. |
| GET `/ms1/openapi.json` | HTTP 200, MS1 Autenticación y Usuarios 0.1.0 | Contrato real consultado, separado del ejemplo ilustrativo del repositorio. |
| Backend local `localhost:8000` | Conexión rechazada, curl exit 7, sin respuesta HTTP | No había backend local disponible durante la sonda. |
| Ubicación del backend | La búsqueda de repositorios instalados por «taller» solo devolvió el frontend TallerConnect | No se halló otro repositorio/URL QA con ese acceso. No demuestra que no exista en otros accesos. |

[Registro de conectividad, contrato y disponibilidad segura](evidencias/SCRUM-158-preflight-cuentas.json). No incluye contraseñas, tokens ni los correos aportados. No se enviaron credenciales al host etiquetado producción.

El contrato exige POST `/api/auth/login`, JSON con `email` y `password`; devuelve `access_token`, `token_type` y `user`. El usuario incluye ID entero, email, nombre, roles e `is_active`. GET `/api/auth/me` requiere Bearer. El frontend normaliza email, mapea el primer rol y rechaza usuario inactivo. El contrato distingue 401 credenciales inválidas, 403 sin roles y 429 por bloqueo temporal: no se hicieron intentos adivinados ni repetidos que pudieran bloquear las cuentas.

Para ejecutar autenticación real falta confirmar URL QA y habilitar las contraseñas mediante variables locales no públicas o archivo ignorado `.env.qa.local`: `TALLERCONNECT_QA_API_URL`, `TALLERCONNECT_QA_CLIENTE_PASSWORD`, `TALLERCONNECT_QA_MECANICO_PASSWORD`, `TALLERCONNECT_QA_ADMINISTRADOR_PASSWORD`. Si ya existe otro mecanismo seguro, basta indicar su ubicación accesible. No usar `EXPO_PUBLIC_*` para secretos. Confirmar además dataset propio/ajeno y política de permisos; no se asumen IDs ni roles por conocer el correo.

## Pruebas de interfaz que sí se ejecutaron

Se inició **Expo Web real** con Firefox 159.0 y perfil temporal aislado. WebDriver BiDi interactuó con los inputs/botón del frontend; no se usó Jest, un servidor simulado, una sesión inyectada ni respuestas mock para estas pruebas. [Runner reproducible](../../scripts/qa-web-login-form.mjs), [resultado de ejecución](evidencias/SCRUM-158-formulario-web.json), [captura real sin editar](evidencias/SCRUM-158-formulario-web-vacio.png).

Configuración solo del proceso de prueba: `EXPO_NO_DOTENV=1`, ambas banderas mock en false, entorno development, API local `http://127.0.0.1:8000/api`. El backend local no existe; los escenarios ejecutados **no requieren backend ni deben enviar login**. Esa configuración no se presenta como QA autenticado, y no alteró `.env` ni configuración compartida.

| Control UI ejecutado | Resultado obtenido | Estado |
| --- | --- | --- |
| AUTH-C-03, AUTH-M-03, AUTH-A-03 | Tres repeticiones del formulario anónimo común: correo malformado muestra validación; campos vacíos muestran mensajes; permanece en `/login`; 0 POST login observados | **PASS UI local**, sin autenticación por rol |
| Abrir `/cliente` sin sesión | Redirige a `/login`, sin sesión persistida ni consultas a la API privada | **PASS UI anónima** |
| Abrir `/mecanico` sin sesión | Misma protección observada | **PASS UI anónima** |
| Abrir `/administrador` sin sesión | Misma protección observada | **PASS UI anónima** |

Las tres capturas de campos vacíos fueron idénticas por SHA-256: se guarda una sola copia y cada caso remite a ella. Los puntos del campo de contraseña son el placeholder; el input estuvo vacío. El correo malformado es entrada inválida de formulario, no una cuenta creada ni un intento backend.

Los tres IDs AUTH-*-03 corresponden al mismo formulario antes de autenticarse: **no son tres sesiones reales de los roles**. Los controles de rutas anónimas son evidencia adicional de SCRUM-158 y no añaden casos al conjunto original de 64. La aplicación atravesó carga/hidratación, pero no se considera validado el estado de carga de un login HTTP ni la sesión expirada.

## Resultados pendientes y validación técnica

De los 64 casos, **3 pueden pasar a PASS de UI local y 61 conservan BLOCKED**. Siguen sin ejecutar: login válido/inválido contra backend con las cuentas aportadas, `/auth/me` autenticado, persistencia de sesión real, navegación de usuario autenticado, restricciones entre roles autenticados, consultas del Cliente/Mecánico/Administrador, errores HTTP de sesión y expiración real. El servicio MS4 no impide validar login; su indisponibilidad histórica no se usa como bloqueo principal de autenticación.

TypeScript exit 0; lint exit 0, 0 errores/46 advertencias preexistentes; suite completa **1259 PASS/0 FAIL** con mocks; sintaxis del runner válida. [Comandos y resumen](evidencias/SCRUM-158-cuentas-validaciones.json). La ejecución real de Firefox y las sondas HTTP se mantienen separadas de Jest. [Control documental](evidencias/SCRUM-158-cuentas-validacion.txt).

SCRUM-158 continúa **BLOCKED para aceptación autenticada real**. SCRUM-216 recibe los tres resultados UI; SCRUM-156 puede consolidarlos. SCRUM-217/218/219 siguen pendientes de consulta autenticada real y no reciben PASS por los controles anónimos. No se fabricaron datos, capturas, sesiones ni resultados y no se realizaron operaciones de negocio sobre producción.
