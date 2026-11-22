# SCRUM-216 — ejecución actual del formulario compartido

Actualización 12-11-2026 UTC, a partir de SCRUM-158 `b15f364`. **3 PASS de UI local y 24 casos BLOCKED** en el checklist de autenticación. Los PASS son tres repeticiones de la misma UI anónima compartida; no certifican cuentas activas ni sesiones de los roles.

Las tres identidades de prueba están informadas por el usuario. El diagnóstico ya no es «faltan cuentas identificadas»: falta confirmar backend QA y acceder a las contraseñas por el mecanismo seguro local para verificar activación/login/roles. El host configurado está etiquetado producción; no se enviaron credenciales allí. [Estado actual y contrato](SCRUM-158-cuentas-y-ejecucion-web.md).

## Resultados ejecutados

Entorno: Firefox 159.0 real, Expo Web en `127.0.0.1:8093`, perfil temporal sin sesión, mocks desactivados solo en el proceso y `.env` sin cargar. El backend local está ausente; estos casos no deben generar HTTP de login. Se usó WebDriver BiDi según el [mecanismo documentado por Mozilla](https://developer.mozilla.org/en-US/docs/Web/WebDriver/How_to/Create_BiDi_connection).

| ID | Rol | Procedimiento | Resultado esperado | Resultado observado | Estado | Evidencia |
| --- | --- | --- | --- | --- | --- | --- |
| AUTH-C-03 | Cliente (formulario anónimo común) | Abrir /login, ingresar correo malformado, pulsar Iniciar sesión; vaciar campos y volver a pulsar | Validación local y ausencia de POST login/sesión | Correo inválido rechazado, mensajes de campos vacíos, permanece /login; 0 POST login observados | PASS | [Ejecución](evidencias/SCRUM-158-formulario-web.json), [captura real](evidencias/SCRUM-158-formulario-web-vacio.png) |
| AUTH-M-03 | Mecánico (formulario anónimo común) | Repetir el mismo procedimiento desde nueva navegación a /login | Mismo formulario compartido; sin petición HTTP ni sesión | Mismos mensajes y permanencia en /login; 0 POST login observados | PASS | [Ejecución independiente](evidencias/SCRUM-158-formulario-web.json), captura compartida por hash |
| AUTH-A-03 | Administrador (formulario anónimo común) | Repetir desde nueva navegación a /login | Mismo formulario compartido; sin petición HTTP ni sesión | Mismos mensajes y permanencia en /login; 0 POST login observados | PASS | [Ejecución independiente](evidencias/SCRUM-158-formulario-web.json), captura compartida por hash |

El JSON registra cada repetición y el hash del runner. Las tres capturas coincidieron byte a byte; se conserva una sola imagen sin editar. No hubo contraseñas, tokens ni usuarios inyectados. No se presenta esta UI de Expo Web como validación Android/iOS.

Los otros 24 IDs AUTH-*-01/02/04/05/06/07/08/09 permanecen **BLOCKED**. Los resultados de rutas sin sesión de SCRUM-158 son soporte adicional; no completan los casos de acceso cruzado con usuarios autenticados. Login incorrecto backend, persistencia de token real, errores de red del login y sesión expirada real no se ejecutaron.

## Coherencia y validación

La tabla original de [SCRUM-216](SCRUM-216-checklist-autenticacion.md) y la matriz SCRUM-156 de la primera entrega son snapshots históricos. Este documento es el registro posterior de los tres casos, sin reescribir resultados que no se habían ejecutado en aquel momento. No se duplican JSON o capturas. La consolidación actual de SCRUM-156 debe aplicar esta actualización a los mismos 64 IDs, sin contar ejecuciones repetidas como casos nuevos.

Se verificó correspondencia 1:1 entre los tres IDs, observaciones del JSON y captura existente; no se cambia código de aplicación. [Validación documental del ticket](evidencias/SCRUM-216-ejecucion-web-validacion.txt). Las herramientas de aplicación pasaron en SCRUM-158: 1259 pruebas con mocks, TypeScript y lint 0 errores/46 advertencias previas; esos resultados no sustituyen ejecución real autenticada.
