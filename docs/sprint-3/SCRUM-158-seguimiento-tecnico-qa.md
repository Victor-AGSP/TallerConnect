# Seguimiento técnico, MS4 y requisitos de QA — SCRUM-158

Revisión 12-11-2026 UTC (11-11-2026 America/Santiago). **La corrección técnica está confirmada; SCRUM-158 sigue BLOCKED para aceptación real.** No se ejecutaron logins ni consultas autenticadas con cuentas backend de Cliente, Mecánico o Administrador. No se crearon cuentas, JWT, datasets ni archivos remotos.

## Corrección técnica y estado probado

Commit **`c0b9bda` — `test(SCRUM-158): corregir matcher de rutas sin validar autenticacion real`**. Registra los tres archivos pendientes, el refuerzo de la prueba existente de utilidades y el resultado de validación previa. El [diagnóstico](SCRUM-158-autenticacion.md) explica el matcher público y la compatibilidad por rol; [evidencia técnica](evidencias/SCRUM-158-matcher-tecnico.json). El [baseline](evidencias/SCRUM-158-baseline.json) es histórico y no se reescribió.

Se verificó árbol e índice limpios en ese commit **antes y después** de repetir herramientas. [Registro verificable del estado confirmado](evidencias/SCRUM-158-estado-confirmado.json), con SHA completo, marcas UTC, comandos, conteos, versiones y hashes de archivos/bundle.

| Validación posterior al commit técnico | Resultado |
| --- | --- |
| `npm test -- --watchman=false` con salida JSON | 74 suites, **1259 PASS / 0 FAIL** |
| `npm run test:regression -- --watchman=false` | 41 suites, **841 PASS / 0 FAIL**, subconjunto de la suite completa |
| `npm run typecheck` | Exit 0 |
| `CI=1 npm run lint` | Exit 0, 0 errores / 46 advertencias |
| `CI=1 npm run export:android -- --max-workers 2` | Exit 0, bundle Android exportado; no prueba dispositivo |

Las suites usan mocks de servicios, HTTP, auth y/o almacenamiento según cada prueba. Comprobar rutas con Expo Router real dentro de Jest no convierte la sesión simulada en una cuenta real. Las aserciones nuevas comprueban también el rechazo de una ruta incorrecta. La guarda sigue cubierta con los tres roles y accesos cruzados.

La instalación preexistente contiene Expo Router 58.0.30 (lock 58.0.28), jest-expo 58.0.14 (lock 58.0.13), RNTL 14.1.0, Node v26.12.1 y npm 12.2.1. ESLint 9.39.5 y eslint-config-expo 58.0.4 están instalados, pero no figuran en las dependencias/lock de Victor. Se mantuvieron intactos package/lock y node_modules; **no se afirma una instalación limpia reproducible con `npm ci`**. Esa regularización requiere un trabajo de dependencias separado.

## Auditoría de las 46 advertencias

Se reconstruyeron `src`, configuraciones y utilidades de `872a862` en `/tmp`, sin checkout ni alteración de ramas. Se ejecutó ESLint sin caché en ambos árboles usando las mismas herramientas y se comparó cada advertencia por archivo, regla, mensaje, línea y columna. **46 preexistentes idénticas, 0 nuevas, 0 eliminadas**. Los dos errores originales de efectos administrativos ya no aparecen. [Inventario completo de cada advertencia y comparación](evidencias/SCRUM-158-auditoria-lint.json).

| Regla / categoría | Cantidad | Evaluación |
| --- | --- | --- |
| `import/no-named-as-default-member` | 26 | Convención de importación Axios; preexistente, sin regresión nueva |
| `@typescript-eslint/array-type` | 15 | Estilo de tipos de array; preexistente |
| `@typescript-eslint/no-unused-vars` | 3 | Imports/función no usados; preexistentes |
| `@typescript-eslint/no-require-imports` | 1 | `require` del interceptor para evitar ciclo con store; preexistente, cambiarlo exige revisar ese ciclo |
| Directiva `eslint-disable` sin uso | 1 | Preexistente; no se ajustó configuración para ocultarla |

32 advertencias están en `src/__tests__/interceptors.test.ts`; las 14 restantes en nueve archivos de aplicación/servicios. No se aplicaron autofixes, exclusiones ni cambios fuera del alcance.

## Investigación no destructiva del MS4

Se consultaron exclusivamente rutas públicas implementadas: salud, salud de base, salud de almacenamiento, contrato OpenAPI y `/api/auth/me` sin token. [Evidencia actual](evidencias/SCRUM-158-seguimiento-ms4.json): códigos, hashes de cuerpo, verificación TLS, tiempos y encabezados permitidos; no cookies ni Authorization.

| Consulta | Resultado actual |
| --- | --- |
| GET `/ms4/health` | 200; servicio declara estado ok |
| GET `/ms4/health/db` | 200; base declara estado ok |
| GET `/ms4/health/storage` | **503** a las 00:17:41 UTC y **503** en repetición a las 00:19:05 UTC |
| GET `/ms4/openapi.json` | 200; contrato MS4 0.1.0 |
| GET `/api/auth/me` sin sesión | 401; no constituye login real |

Ambas respuestas de almacenamiento dicen `El almacenamiento de evidencias no está disponible`, con `Age: 0` y `X-Vercel-Cache: MISS`. Esto respalda que se reprodujo el fallo en esa ventana de observación; no acredita disponibilidad posterior ni descarta toda caché interna.

El contrato describe una comprobación del bucket MinIO/S3 bajo la identidad del microservicio y explica que oculta deliberadamente endpoint, claves y nombre del bucket en el error. **Causa raíz no determinada**: con el 503 genérico no se puede distinguir fallo de conectividad/TLS, permisos, credenciales, configuración o existencia del bucket. El repositorio contiene el cliente móvil, no implementación/configuración operativa ni logs del backend MS4. Tampoco se prueba pérdida de archivos ni un fallo de subida: no se ejecutaron operaciones autenticadas ni mutantes.

Para diagnosticar, el responsable backend necesita correlacionar las horas e IDs de solicitud del JSON con la excepción original en logs del despliegue, revisar configuración de almacenamiento sin divulgar secretos y verificar desde ese runtime acceso al bucket. Después debe confirmar health 200. El almacenamiento es dependencia de fotos; **no bloquea por sí mismo login, rutas, vehículos, órdenes o presupuesto**. Un listado MS4 de metadatos se debe evaluar aparte de la descarga del binario.

## Revisión de los 64 casos bloqueados

La [matriz de requisitos por caso](evidencias/SCRUM-158-requisitos-qa.csv) mapea **los mismos 64 IDs**, sin añadir casos ni reclasificar resultados: AUTH-C/M/A (27), CQ (12), MQ (12), AQ (13). Cada fila identifica endpoints reales, cuentas requeridas, datasets, configuración/controles y el documento canónico. Todos conservan BLOCKED; no se aprovisionó ninguno de esos requisitos.

Los nombres C1/C2/C0/M1/M2/M0/A1 son **alias de requisitos a entregar**, no cuentas existentes ni identidades inventadas para probar. Debe entregarse acceso por mecanismo local seguro fuera de Git/chat.

| Requisito de cuenta | Uso |
| --- | --- |
| C1, Cliente activo, rol único conocido e ID backend verificable | Login, sesión, datos propios y acceso cruzado; requerido para aceptación real Cliente |
| M1, Mecánico activo, rol único conocido e ID backend verificable | Login, sesión y asignaciones propias; requerido para aceptación real Mecánico |
| A1, Administrador activo, rol conocido e ID backend verificable | Login, panel y control positivo de permisos; requerido para aceptación real Administrador |
| C2 y M2, identidades backend distintas | Datos de otro propietario y otra asignación; no se necesitan sus contraseñas si la relación está acreditada en fixture de QA |
| C0 y M0, o preparación autorizada de C1/M1 | Escenarios sin vehículos/asignaciones; pueden reemplazarse por restauración de fixture QA, realizada por el responsable, sin mutar producción |

**Para desbloquear específicamente SCRUM-158:** bastan inicialmente C1/M1/A1, QA accesible con MS1 y consultas protegidas operativas, ejecución Expo instrumentada, política ACL y control real de expiración/denegación. No hacen falta fotos, catálogos paginados o MS4 para esos logins. El rol debe comprobarse con respuesta del servidor, no con usuario/token mock ni edición de localStorage. Para login inválido usar contraseña incorrecta que satisfaga el mínimo local de seis caracteres: si no, solo se prueba el formulario y nunca el rechazo del backend.

Los tres casos **AUTH-*-03** son validación local de campos: no requieren cuenta, token ni backend; su dependencia pendiente es ejecutar la UI de Expo/navegador. Están diferenciados así en el CSV. Las pruebas Jest de formulario ya son soporte automatizado, no una ejecución manual real registrada.

### Endpoints y datasets requeridos

Las rutas siguientes son relativas al host QA autorizado; no son solicitudes ejecutadas durante esta revisión. Parámetros entre llaves deben provenir del backend; no se generan IDs.

| Familia / casos | Endpoints y datos que debe aportar QA |
| --- | --- |
| Auth, AUTH-*-01…09 | POST `/api/auth/login`, GET `/api/auth/me` cuando procede y GET protegido: Cliente `/api/vehiculos`, Mecánico `/api/vehiculos/asignados`, Administrador `/api/ordenes`. Logout solo local; no hay endpoint remoto implementado. Persistencia requiere SecureStore o localStorage del entorno de prueba y JWT auténtico emitido al login. |
| Vehículos/órdenes, CQ-01…03 y MQ-01…04; AQ-01…03 | GET `/api/vehiculos`, `/api/vehiculos/asignados`, `/api/vehiculos/{vehiculo_id}`, `/api/ordenes`, `/api/ordenes/{orden_id}`. D-OWN: al menos dos órdenes/vehículos válidos y relaciones propietario/asignación acreditadas; otros de C2/M2 para denegación. IDs numéricos reales; no usar la orden histórica de una sonda como fixture confirmado. |
| Presupuesto, CQ-04 y AQ-04 | GET `/api/presupuestos?orden_id={orden_id}` y `/api/presupuestos/{presupuesto_id}`. D-BUDGET: orden propia con presupuesto/versiones visibles, borrador oculto al Cliente según contrato y orden sin presupuesto. No aprobar/rechazar para probar consulta. |
| Bitácora, MQ-05 | GET `/api/ordenes/{orden_id}/bitacora`. D-LOG: orden asignada con entradas reales de QA, otra vacía y otra no asignada; autores/fechas redactados en evidencia. |
| Fotografías, CQ-05…06, MQ-06, AQ-07 y controles asociados | GET `/api/evidencias?orden_id={orden_id}`, `/api/evidencias/{evidencia_id}` para acceso directo y `/api/evidencias/{evidencia_id}/descarga`. D-MS4: UUID backend existentes, foto visible y oculta al Cliente, orden ajena y enlaces temporales que puedan expirar. Storage operativo para servir archivos; no guardar URL prefirmada en Git. |
| Catálogos, AQ-05…06 | GET `/api/repuestos`, `/api/proveedores` con HTTP **`desde/limite`**, GET `/api/proveedores/{proveedor_id}`. D-PAGE: más de una página verificable (por omisión 50), última página y vacío conocidos. `offset/limit` son argumentos locales que el servicio traduce, no nombres de query HTTP. Se aclaró el checklist de Administrador sin modificar servicios. |
| Panel/avisos, AQ-01, AQ-08…10 | GET órdenes/vehículos y, si el contrato está habilitado y disponible, `/api/notificaciones`; derivación usa `/api/ordenes`, `/api/presupuestos`, `/api/repuestos`. D-ADMIN: dataset conocido con recuentos y cero/errores controlables. El servicio puede recurrir a `mockNotifications` si no hay avisos derivados, aun con ambas banderas mock en false: esos avisos no deben clasificarse como evidencia real. |
| Vacíos, CQ-07, MQ-07, AQ-08 | D-EMPTY: identidad/tenant con listas vacías y órdenes sin presupuesto/fotografías/bitácora. Distinguir vacío de 200 de errores ocultados en frontend. |
| Autorización, CQ-10…11, MQ-10…11, AQ-11…12 y auth cruzada | D-ACL y ACL-QA: recursos ajenos, asignaciones distintas y política esperada por endpoint/rol, incluyendo diferencia 401/403/404. Los layouts UI son exclusivos por rol; **no se identificó con certeza un GET exclusivo de Administrador** en los contratos disponibles. AQ-12 necesita que backend aporte esa política y ruta implementada; no se inventa un endpoint ni se exige 403 para todos los catálogos. |

Los riesgos estáticos conocidos —home Cliente/Mecánico, presupuesto e inventario demo; fallback de avisos y errores de órdenes convertidos en listas vacías— están separados de consultas conectadas. La revisión no los convierte en PASS/FAIL real ni implementa funcionalidades nuevas fuera del alcance.

### Configuración y controles de QA

| Código del CSV | Requisito concreto |
| --- | --- |
| ENV-QA | URL real de QA proporcionada por su responsable, accesible desde dispositivo, con prefijo `/api`, MS1/MS2/MS3 operativos y política CORS/TLS apropiada si se usa web. `EXPO_PUBLIC_API_URL` prevalece; elegir `integration` **no crea un entorno aislado**, porque el valor por defecto coincide con el host configurado como producción. |
| CRED-LOCAL | Cuentas autorizadas disponibles por mecanismo seguro local fuera del repositorio; login genera el token real, que se mantiene en almacenamiento de la app y se redacta en evidencia. No se fabrican JWT para simular expiración. |
| EXPO-DEVICE | Iniciar Expo con URL QA, `EXPO_PUBLIC_USE_MOCK_AUTH=false`, `EXPO_PUBLIC_USE_MOCK_SERVICES=false`, reiniciar Metro/cliente; registrar plataforma, build, ruta de grupo Expo y llamadas HTTP redactadas. Verificar SecureStore nativo o persistencia web según plataforma objetivo. |
| SESSION-QA | TTL de sesión confirmado por backend y posibilidad de esperar expiración o revocar una sesión de prueba; probar 401 protegido y 403 con sesión vigente. No cambiar reloj ni editar token para afirmar expiración real. |
| NET-QA | Control de latencia, desconexión, timeout y fallos 503 parciales en entorno QA, mediante proxy/infraestructura de pruebas; no tumbar servicios productivos. Restablecer red y registrar el reintento. |
| ACL-QA | Tabla de permisos por rol/recurso y fixtures con propiedad/asignación verificable; confirmar exclusividad HTTP antes de ejecutar AQ-12. |
| MS4-STORAGE-OK | Health de almacenamiento 200 y archivos QA existentes/accesibles; luego ejecutar lista y descarga con sesiones reales. La recuperación del storage no sustituye credenciales. |

`.env` inspeccionado sigue sin modificar: host configurado como producción y ambas banderas mock en false; notificaciones HTTP en false. Es configuración observada, **no un entorno QA confirmado**. Si QA no ofrece notificaciones HTTP, declarar los avisos derivados/demo de forma explícita y no certificar datos reales por su mera presencia visual.

## Estado de los tickets

SCRUM-158 y el checklist SCRUM-216 mantienen pendiente autenticación/autorización real por los tres roles. SCRUM-217, SCRUM-218 y SCRUM-219 mantienen pendientes las consultas reales por rol. La documentación de SCRUM-156 está consolidada, pero su aceptación de evidencia real sigue pendiente. SCRUM-157 conserva abierta MS4-STORAGE-503 y la falta de evidencia autenticada; sus correcciones locales/documentales sí están confirmadas.

Los snapshots de la primera entrega conservan sus resultados históricos. Este seguimiento deja atrás la dependencia de un parche sin commit: el código probado ya está confirmado en `c0b9bda`. La documentación/evidencia posterior se guarda en otro commit, sin alterar el código validado. [Control documental y revisión 1:1 de los 64 requisitos](evidencias/SCRUM-158-seguimiento-validacion.txt). No se hicieron push, merges, rebases, resets ni modificaciones en main/Develop.
