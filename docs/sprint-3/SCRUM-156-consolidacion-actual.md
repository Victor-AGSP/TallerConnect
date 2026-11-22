# SCRUM-156 — consolidación actual: Expo Go y API real

Actualización 12-11-2026 UTC. El backend desplegado está identificado: `https://tallerconect.vercel.app/api`, etiquetado **producción**. Metro está preparado para Expo Go con mocks y demo desactivados. Las tres identidades fueron informadas; todavía no se verificaron su existencia, activación ni roles mediante login. Sigue pendiente autorizar expresamente login y lecturas con esas cuentas en ese destino y observar el teléfono. No se enviaron credenciales ni se modificaron datos productivos.

## Resultado de los 64 casos

[Matriz actual](evidencias/SCRUM-156-matriz-actual.csv): **3 PASS de UI local / 0 FAIL observados / 61 BLOCKED**. Ningún PASS corresponde a login ni consulta backend autenticada. Los bloqueos reflejan ahora el destino productivo conocido y la falta de autorización de cuentas/observación; la ausencia de identidades ya no es el diagnóstico.

| Ticket / familia | Casos originales | PASS | BLOCKED | Alcance |
| --- | --- | --- | --- | --- |
| SCRUM-158 / SCRUM-216, AUTH-* | 27 | 3 | 24 | AUTH-C-03, AUTH-M-03, AUTH-A-03: formulario anónimo común |
| SCRUM-217, CQ-* | 12 | 0 | 12 | Consulta Cliente pendiente con sesión real |
| SCRUM-218, MQ-* | 12 | 0 | 12 | Consulta Mecánico pendiente con sesión real |
| SCRUM-219, AQ-* | 13 | 0 | 13 | Consulta Administrador/acceso cruzado pendiente |
| Total | 64 | 3 | 61 | No sumar controles adicionales ni pruebas Jest |

La matriz conserva rol, funcionalidad, ticket, ID, resultado, fecha real o «No ejecutada», entorno, evidencia, incidencia y tipo. Las tres capturas originales iguales se deduplicaron por SHA-256 y se conserva [la captura real única](evidencias/SCRUM-158-formulario-web-vacio.png). Son validaciones del formulario compartido antes del login, no tres sesiones de roles. La [matriz inicial](evidencias/SCRUM-156-matriz.csv) permanece como snapshot histórico. Las tablas fechadas 11-11-2026 de los tickets de consulta describen ese estado; sus apartados de avance técnico del 12-11-2026 documentan las correcciones posteriores.

## Evidencias diferenciadas

| Categoría | Resultado observado | Evidencia |
| --- | --- | --- |
| Expo Go / compilación y entrega local | Manifiesto Android 200, bundle Android 200; configuración real verificada en bundle; **teléfono no observado** | [Validaciones finales](evidencias/SCRUM-156-expo-go-validaciones.json), [configuración y comando](SCRUM-158-expo-go.md) |
| HTTP público real desde CLI | Gateway health 200; agregado servicios 503; cuatro contratos OpenAPI 200; MS4 DB 200 y storage 503 | [Sondas iniciales](evidencias/SCRUM-158-expo-go.json), [contratos y sondas MS4](evidencias/SCRUM-156-api-publica.json) |
| UI Expo Web real previa, sin sesión | Tres repeticiones de formulario PASS; grupos de roles redirigen a login; cero POST login | [Ejecución Firefox](evidencias/SCRUM-158-formulario-web.json), [checklist UI](SCRUM-216-ejecucion-web.md) |
| HTTP autenticado real | **0 intentos ejecutados**; sin contraseñas configuradas en el agente ni autorización expresa del destino | [Alcance de ejecución](SCRUM-158-expo-go.md) |
| Jest con dobles | 78 suites / **1295 PASS / 0 FAIL**; regresión 41 suites / **841 PASS / 0 FAIL**, subconjunto de la suite completa | [Resultado final](evidencias/SCRUM-156-expo-go-validaciones.json) |
| Herramientas | TypeScript exit 0; lint 0 errores / 46 advertencias preexistentes, sin nuevas; diff check limpio | Mismo resultado final; comparación por archivo/regla/mensaje con [auditoría previa](evidencias/SCRUM-158-auditoria-lint.json) |
| Compatibilidad de dependencias | `npx expo install --check`: exit 1; 11 actualizaciones patch recomendadas; sin cambios de dependencias | [Preparación inicial](evidencias/SCRUM-158-expo-go.json) |

La suite ampliada detectó inicialmente dos fallos de navegación por dobles incompletos de notificaciones; se corrigieron en `bbf7dd8` y la suite/regresión completas se repitieron sobre ese commit limpio, con resultado aprobado. No se presenta la ejecución intermedia como éxito. Las 36 pruebas nuevas respecto de las 1259 iniciales usan dobles: precedencia de adaptadores, privacidad de traza, exclusión de demo, vacío/error y recuperación.

MS4 continúa con almacenamiento indisponible y DB accesible en las sondas individuales. La respuesta de storage es genérica; **causa raíz no determinada**. Un agregado con timeout no demuestra fallo de DB ni una causa específica. No se subieron evidencias ni se alteró configuración remota. [Incidencia histórica SCRUM-157](SCRUM-157-incidencias-ms4.md).

## Avance y commits por ticket

| Ticket | Avance de esta ejecución | Commit | Aceptación real |
| --- | --- | --- | --- |
| SCRUM-158 | Configuración/adaptadores reales, traza segura y compilación Expo Go | `1763c70` | BLOCKED |
| SCRUM-216 | Conserva los tres PASS UI previos; sin nuevos resultados autenticados | Sin nuevo commit; previo `3ef891a` | BLOCKED |
| SCRUM-217 | Inicio sin datos demo; presupuesto consulta orden solicitada | `aa55650` | BLOCKED |
| SCRUM-218 | Inicio sin actividad demo; inventario conecta listas y proveedor real | `b158d36` | BLOCKED |
| SCRUM-219 | Vacíos/errores sin fallback ficticio; error de avisos visible y reintento | `6def604`, `bbf7dd8` | BLOCKED |
| SCRUM-156 | Consolida estos resultados y actualiza bloqueos de la matriz | Este commit documental | BLOCKED para cierre real |
| SCRUM-157 | Nuevas sondas públicas en evidencia consolidada; causa interna pendiente | Sin nuevo commit específico | BLOCKED causa raíz |

## Intervención necesaria y reproducción

Abrir el QR que imprime `npx expo start --clear --lan --go --max-workers 2 --port 8081` en Expo Go compatible con SDK 58, con teléfono y equipo en la misma Wi-Fi. La [configuración local](SCRUM-158-expo-go.md) usa `.env.local` ignorado, permisos 0600 y sin secretos. No se observó fallo de LAN desde teléfono ni se instaló un túnel.

Antes de enviar login: autorización explícita para las tres cuentas de prueba en este destino productivo. Introducir sus contraseñas directamente en el formulario; no enviarlas por chat, Git, logs ni variables públicas de Expo. Si ejecuta el agente, deberá recibir acceso mediante variables privadas locales o mecanismo seguro equivalente. El contrato público confirma POST `/api/auth/login` con JSON email/password y GET `/api/auth/me` Bearer; conocerlo no valida cuentas ni sesiones. La traza optativa mostrará solo método, destino sin query/credenciales y estado HTTP.

Después de autenticar: confirmar IDs y relaciones reales de vehículos/órdenes propios, asignados y ajenos; presupuestos/versiones, catálogos y evidencias visibles/ocultas, casos vacíos y política efectiva de permisos. Para expiración, errores inducidos y datasets vacíos usar un entorno/controles autorizados; no alterar producción. La [matriz de requisitos original](evidencias/SCRUM-158-requisitos-qa.csv) conserva el detalle por caso como referencia histórica; el destino actual y sus permisos son los de esta consolidación. No se presupone exclusividad administrativa de catálogos ni se inventan IDs.

## Control documental

Se verifican 64 IDs únicos, estados sin cambios injustificados, referencias locales y separación entre HTTP público, compilación, UI web, dobles de prueba y casos bloqueados. `python3 scripts/validate-sprint3-docs.py` y `git diff --check` deben pasar antes del commit. Los cambios de código fueron validados en `bbf7dd8`; este ticket agrega únicamente consolidación. Trabajo exclusivo en Victor, sin push.
