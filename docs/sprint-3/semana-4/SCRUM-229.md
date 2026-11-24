# SCRUM-229 — guion de demo con contingencia MS4

Fecha: 2026-11-24. Rama `Victor`. Estado inicial: **PENDING**. Resultado: **guion preparado**; no ensayado con cuentas reales (BLOCKED hasta que QA las entregue).

Procedimiento técnico, instalación y comandos: [SCRUM-166](SCRUM-166.md). Este guion es para quien presenta. Duración objetivo: 15 minutos.

## Antes de empezar (T−15 min y T−1 min)

| Acción | Comando / lugar | Resultado esperado |
| --- | --- | --- |
| Comprobar backend | `scripts/demo-preflight.sh` | 7 líneas `OK`, «listo para la demo con backend real» |
| Elegir escenario | según el preflight | A (todo OK), B (MS4 caído) o C (sin login/Gateway) |
| Abrir la app | `npm run web` con las variables de SCRUM-166 §3, o `https://frontend-movil.inf.uct.cl` | Pantalla de login, **sin** franja «Modo demostración» |
| Terminal secundaria | `npx jest evidence --verbose` preparada, sin ejecutar | Para el escenario B |
| Cuentas | Cliente, Mecánico, Administrador entregadas por QA | No se muestran en pantalla ni se dictan |

## Escenario A — MS4 operativo

| # | Presentador hace | Pantalla | Resultado esperado | Punto técnico a explicar |
| --- | --- | --- | --- | --- |
| 1 | Muestra el preflight | Terminal | 7 OK | Arquitectura: app → API Gateway → MS1 auth, MS2 taller, MS3 presupuestos, MS4 evidencias |
| 2 | Inicia sesión como Cliente | `/cliente` «Mi taller» | Portal sin cifras inventadas | El token JWT se guarda en almacenamiento seguro; la ruta depende del rol |
| 3 | «Ver mis vehículos» | `/mis-vehiculos` | Vehículos del Cliente | El backend filtra por token; la app no envía el ID de cliente |
| 4 | Abre un vehículo y su orden | `/vehiculos/[id]` → `/ordenes/[id]` | Estado de la orden y «Ver presupuesto» | Una lista vacía y un error se muestran distinto (SCRUM-162/224) |
| 5 | «Ver evidencias» | sección de evidencias | Fotos visibles para el Cliente | MS4 aplica el alcance por rol; URL prefirmada de corta duración |
| 6 | «Ver presupuesto» | `/mis-ordenes/[id]/presupuesto` | Versión, ítems y total | MS3; la decisión se coordina con MS2 y un 503 se reintenta sin decidir dos veces |
| 7 | Intenta abrir `/administrador` en la barra | vuelve a `/cliente` | Redirección | Protección de rutas por rol (SCRUM-228) |
| 8 | Cierra sesión, entra como Mecánico | `/mecanico` | Vehículos y órdenes asignadas | Separación de funciones por rol |
| 9 | Abre una orden asignada | detalle | Panel de avances y captura de evidencias | Solo el Mecánico ve estas herramientas |
| 10 | Cierra sesión, entra como Administrador | `/administrador` | Métricas calculadas de datos reales | Si una consulta falla, la métrica dice «No disponible», no «0» (SCRUM-163) |
| 11 | Cierra sesión | `/login` | Sesión eliminada | — |

Aprobar o rechazar un presupuesto modifica datos reales: hacerlo **solo** si QA preparó una orden para la demo.

## Escenario B — MS4 no disponible

Pasos 1–4 y 6–11 igual que A. En el paso 5:

1. Pulsar «Ver evidencias». Resultado esperado: mensaje de error y botón «Reintentar»; **no** «Sin evidencias».
2. Pulsar «Reintentar» una vez. Si sigue fallando, continuar.
3. Decir el mensaje de transparencia (abajo).
4. En la terminal secundaria: `npx jest evidence --verbose`. Mostrar los nombres de las pruebas de roles, códigos 401/403/404/5xx, reintento y URL prefirmada, y el resumen final (11 suites, 0 fallos).
5. Volver a la app y seguir con el paso 6.

No cambiar a modo demostración para «mostrar fotos»: MS4 no tiene camino simulado y no debe tenerlo.

## Escenario C — sin login (MS1) o sin Gateway

1. Repetir el preflight tras 2–3 minutos (el 2026-11-24 se observó una caída transitoria de MS1 que se recuperó en minutos).
2. Si persiste: decir el mensaje de transparencia, iniciar la instancia de modo demostración en el puerto 8082 (SCRUM-166 §7) y **señalar la franja «Modo demostración: datos simulados, no provienen del taller»**. Usar las cuentas `*@demo.local` del README.
3. Recorrer navegación y estados (pasos 2–4, 7–11). Omitir evidencias.
4. Mostrar las pruebas automatizadas de integración: `npm run test:regression` (52 suites).

## Mensaje de transparencia

> «El servicio de [evidencias / autenticación] no está respondiendo en este momento. Es un servicio externo a la aplicación móvil; la app está mostrando el error real y permite reintentar, en lugar de inventar datos. Lo que sí puedo mostrar es cómo la app maneja ese servicio, con las pruebas automatizadas que ejecutamos contra su contrato.»

Si se usa el modo demostración, añadir: «Lo que ven ahora son datos simulados, marcados en la franja superior; no provienen del taller.»

## Preguntas probables

| Pregunta | Respuesta basada en evidencia |
| --- | --- |
| ¿Se probó en Android? | Se exporta para Android sin errores; la ejecución en dispositivo está pendiente por falta de equipo con SDK (SCRUM-226). |
| ¿Por qué la URL de Vercel ya no funciona? | El despliegue fue retirado; la Gateway vigente es la de la UCT (D-11). Cambiar el valor por defecto es una decisión pendiente del equipo. |
| ¿Cuántas pruebas hay? | 89 suites / 1435 pruebas, 0 fallos (SCRUM-165). |

Hash: `git log -1 --format=%H -- docs/sprint-3/semana-4/SCRUM-229.md`.
