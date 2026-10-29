# Integración con el MS4 (evidencia multimedia)

Contrato de referencia: `https://tallerconect.vercel.app/ms4/openapi.json` ("SGTM — MS4: Evidencia Multimedia", versión 0.1.0), consultado el 28-10-2026. MS1, MS2 y MS3 no publican rutas de archivos: las evidencias pertenecen al MS4. La app lo consume a través de la API Gateway (`/api/evidencias`), con el mismo `apiClient` que usa para los demás servicios.

## Comprobaciones reales (solo lectura, sin token)

| Solicitud | Resultado |
|---|---|
| `GET /ms4/openapi.json` | 200, contrato completo |
| `GET /ms4/health`, `GET /ms4/health/db` | 200, servicio y base de datos operativos |
| `GET /ms4/health/storage` | **503** `El almacenamiento de evidencias no está disponible` (28-10-2026): el bucket MinIO/S3 del despliegue no responde, por lo que una subida real fallaría con 503 aunque el contrato esté publicado |
| `GET /api/evidencias?orden_id=1` | 401 `No autenticado`: la Gateway enruta al MS4 y exige JWT |

No se hicieron solicitudes autenticadas ni de escritura, ni se enviaron fotografías al entorno desplegado.

## Endpoints

| Método y ruta | Uso | Respuestas documentadas |
|---|---|---|
| `POST /evidencias` | Subir una evidencia (`multipart/form-data`) | 201 `EvidenciaLeida`; 400, 401, 403, 404, 409, 413, 415, 422, 503 |
| `GET /evidencias?orden_id=` | Listar las evidencias de una orden | 200 `EvidenciaLeida[]`; 401, 404, 422, 503 |
| `GET /evidencias/{evidencia_id}` | Detalle (UUID) | 200; 401, 404 (también fuera de alcance), 503 |
| `GET /evidencias/{evidencia_id}/descarga` | URL prefirmada de corta duración (`url`, `expira_en` en segundos) | 200; 401, 404, 503 |

Cuerpo de la subida (`Body_subir_evidencias_post`): `archivo` (binario, obligatorio), `orden_id` (entero > 0, obligatorio), `contexto` (`diagnostico`, `presupuesto`, `reparacion`, `resultado_final`, obligatorio), `presupuesto_id` (opcional) y `visible_cliente` (opcional).

## Validación de archivos (SCRUM-109)

`src/utils/evidence-file.ts` filtra la fotografía antes de cualquier solicitud HTTP:

| Regla | Origen |
|---|---|
| JPG, PNG y WEBP | Subconjunto fotográfico de la lista blanca de MS4 (JPG, PNG, WEBP, MP4, MOV). Los videos se excluyen porque el módulo es fotográfico. |
| MIME y extensión deben coincidir | Política local: una extensión engañosa se rechaza. |
| Firma del archivo (bytes iniciales) | Se comprueba cuando la plataforma permite leer el archivo (web, `File`). En Android/iOS el proyecto no declara una API de archivos y no se agregó una dependencia nueva: la firma la verifica MS4 por contenido (415). |
| Tamaño > 0 y ≤ máximo | MS4 rechaza con 413 sobre un máximo **no publicado**. El máximo local por omisión es 10 MiB, configurable con `EXPO_PUBLIC_EVIDENCE_MAX_BYTES`; no es un límite confirmado por el servidor. |
| URI local (`file://`, `content://`, `ph://`, `blob:`, `data:image/`) | Política local: se rechazan URI remotas o arbitrarias. |
| Una fotografía por envío | El contrato recibe un solo `archivo` por solicitud. |

El validador no registra URI ni nombres de archivo, y la cancelación del selector no se trata como error.

## Captura y selección asociada a la orden (SCRUM-106)

| Capa | Elemento |
|---|---|
| DTO / esquema | `src/dto/evidence.dto.ts`, `src/schemas/evidence-dto.schema.ts` (`EvidenciaLeida`, `UrlDescarga`) |
| Modelo / mapper | `Evidence` en `src/models/evidence.model.ts`; `src/mappers/evidence.mapper.ts` rechaza respuestas fuera del contrato |
| Servicio | `EvidenceService.uploadEvidence` (`src/services/evidence.service.ts`): `POST /evidencias` multipart con `archivo`, `orden_id` y `contexto` |
| Selección | `useEvidencePicker` (`src/hooks/useEvidencePicker.ts`) con `expo-image-picker`: cámara o galería, una fotografía, sin EXIF |
| Vista | `EvidenceCapturePanel` en `(mecanico)/ordenes-asignadas/[id]`, mediante `OrderDetailView.renderSections` |

Decisiones:

- **Solo `expo-image-picker`.** Resuelve cámara y galería con la UI del sistema; `expo-camera` (también instalado) no se usa para no combinar dos implementaciones.
- **Galería sin permiso de biblioteca.** En Android 13+ e iOS 14+ el selector del sistema no requiere acceso completo a las fotografías; solo la cámara pide permiso, y solo cuando el usuario pulsa "Tomar fotografía".
- **Multipart.** El cliente usa `application/json` por omisión; la subida fija `Content-Type: multipart/form-data` para que axios no convierta el `FormData` a JSON. En web axios quita ese valor y el navegador agrega el límite; en Android/iOS lo agrega la capa de red de React Native. El archivo nativo viaja por referencia (`{ uri, name, type }`), sin base64.
- **Autor y fecha.** No se envían identificadores de usuario: MS4 toma el autor del JWT y devuelve `creada_en`.
- **Asociación con la orden.** La selección queda ligada al `orderId` de la ruta; la sección solo se monta cuando la orden cargada coincide con la ruta y se reinicia (`key`) al cambiar de orden. Un resultado del selector que llega tras cambiar de orden se descarta. El servicio rechaza una respuesta 201 asociada a otra orden.
- **Contexto.** El mecánico elige `diagnostico`, `reparacion` o `resultado_final`. `presupuesto` se omite porque MS4 valida contra MS3 un `presupuesto_id` que esta vista no gestiona.
- **Seleccionar no sube.** La carga solo ocurre con "Enviar evidencia"; tras la confirmación del servidor la selección se limpia.
- **Permisos nativos** (`app.json`, plugin `expo-image-picker`): textos propios para cámara y fotografías en iOS; micrófono bloqueado porque el módulo es solo fotográfico.

## Permisos de cámara y galería (SCRUM-110)

| Situación | Comportamiento |
|---|---|
| Al abrir la orden | No se consulta ni se solicita ningún permiso. |
| Cámara concedida | `getCameraPermissionsAsync` en cada pulsación; si está concedida se abre sin volver a preguntar. |
| Cámara sin decidir o rechazada con `canAskAgain` | Una sola solicitud por pulsación; si se rechaza se informa y se sugiere la galería. |
| Rechazo permanente (`canAskAgain: false`) | No se vuelve a preguntar; mensaje que remite a Ajustes y botón "Abrir Ajustes" (`Linking.openSettings`), que nunca se abre solo. |
| Permiso revocado en Ajustes | Se detecta en la siguiente pulsación (se consulta siempre); la fotografía válida ya elegida se conserva. Un rechazo informado al abrir la cámara (`ERR_MISSING_PERMISSIONS`) se trata como permiso bloqueado. |
| Cámara no disponible o error nativo | Mensaje recuperable, sin Ajustes; la galería sigue disponible. |
| Galería | Selector del sistema sin `requestMediaLibraryPermissionsAsync`: en Android 13+ (Photo Picker) e iOS 14+ (PHPicker) no requiere acceso a la biblioteca, ni completo ni limitado. Si una plataforma antigua lo exige y lo rechazó, se informa y se ofrece Ajustes. |
| Archivo ilegible | Se informa (`UNREADABLE`) y se puede elegir otro. |
| Web | El navegador decide los permisos; no se ofrece "Abrir Ajustes". |

Ningún rechazo cambia la ruta, pierde la orden ni envía evidencias. Pendiente: comprobar estos casos en un dispositivo o emulador real; solo se verificaron con respuestas nativas simuladas en Jest.

## Actualizaciones del mecánico (SCRUM-107)

En el backend, la "actualización realizada por el mecánico" es la **bitácora de trabajo de MS2**: `POST /ordenes/{orden_id}/bitacora` registra una observación (nota libre) o una acción (puede declarar repuestos) **sin cambiar el estado de la orden**; solo el mecánico asignado o un administrador pueden hacerlo (403), y una orden inexistente o ajena responde 404. `GET` devuelve las entradas con autor (`autor_usuario_id`) y fecha (`creado_en`) del servidor. Los cambios de estado siguen en `PATCH /ordenes/{id}/estado`, que no se modificó.

| Capa | Elemento |
|---|---|
| DTO / esquema / modelo | `src/dto/order-log.dto.ts`, `src/schemas/order-log-dto.schema.ts`, `src/models/order-log.model.ts` |
| Mapper | `src/mappers/order-log.mapper.ts` (rechaza respuestas fuera del contrato) |
| Servicio | `OrderLogService` (`src/services/order-log.service.ts`): servicio propio, como `BudgetsService`, para no ampliar `OrderServiceAdapter` ni sus implementaciones simuladas |
| Vista | `MechanicUpdatePanel` en `(mecanico)/ordenes-asignadas/[id]`: tipo, descripción, fotografía opcional e historial bajo demanda |

**Asociación con la evidencia.** MS2 y MS4 no comparten identificadores: `BitacoraCrear` no admite adjuntos y `Body_subir_evidencias_post` no admite `bitacora_id`. La fotografía queda asociada a la orden y a su etapa (`contexto`), no a la entrada concreta de la bitácora. Vincularlas requiere un cambio de contrato en MS2 o MS4.

**Integridad entre las dos operaciones.**

1. Se registra primero el avance (texto) y después la fotografía: la carga es la operación que más falla (almacenamiento, tamaño, formato) y puede repetirse sola.
2. Si el avance falla, la fotografía no se envía y el formulario se conserva.
3. Si el avance se registra y la fotografía falla, se muestra "Avance registrado sin fotografía" (nunca éxito completo), el texto queda bloqueado y solo se ofrece "Reintentar envío de la fotografía" o "Continuar sin fotografía". El avance no se reenvía: el POST no es idempotente y el contrato no ofrece idempotencia.
4. La doble pulsación se bloquea con una referencia síncrona.

**Estados terminales.** En órdenes entregadas o canceladas no se ofrecen fotografías (MS4 responde 409). El contrato de la bitácora no documenta restricciones por estado, así que el registro del avance lo decide el servidor y su error se muestra.

**Historial.** Se consulta solo al pulsar "Ver avances registrados" (o tras registrar un avance) para que abrir la orden no genere solicitudes adicionales. Muestra tipo, descripción, fecha, repuestos e identificador del autor, que son los campos publicados; el contrato no entrega el nombre del autor.

Fuera de alcance: declarar repuestos en las acciones (requiere coordinar con el inventario de MS3).

## Estados de envío, errores y reintento (SCRUM-111)

`useEvidenceUpload` (`src/hooks/useEvidenceUpload.ts`) gobierna el envío en `EvidenceCapturePanel` y en la fotografía de `MechanicUpdatePanel`; `EvidenceUploadStatus` lo muestra.

| Estado | Interfaz |
|---|---|
| Sin archivo / archivo seleccionado | Sin botón de envío / "Enviar evidencia" (seleccionar no sube nada) |
| Validando y preparando | Revalidación (`prepareEvidenceFile`, incluida la firma en web) antes de la red |
| Enviando | Indicador, "Cancelar envío" y porcentaje **solo** si `onUploadProgress` informa el total; no se inventa progreso |
| Comprobando | Consulta al servidor antes de reintentar un envío incierto |
| Completado | Solo con una `EvidenciaLeida` válida de la misma orden, o encontrada en `GET /evidencias` ("ya estaba guardada; no se volvió a enviar") |
| Fallido | Mensaje según el contrato y "Reintentar envío" solo cuando es seguro |

Clasificación (`EvidenceServiceError.outcome`):

| Resultado | Casos | Reintento |
|---|---|---|
| `rejected` | 400, 403, 404, 409, 413, 415, 422, archivo u orden inválidos | No con la misma fotografía; se puede reemplazar |
| `retryable` | 503 (el contrato garantiza que no quedan archivos ni filas) y 429 | Reenvía |
| `uncertain` | Timeout, red sin respuesta, cancelación, 500/502/504, 2xx fuera de contrato | Primero `GET /evidencias?orden_id=` y busca la misma orden, nombre original y tamaño creada desde el primer intento (con 5 min de margen de reloj). Si existe, se da por confirmada sin reenviar; si no, reenvía; si la consulta falla, **no** reenvía |
| `session` | 401 | El interceptor cierra la sesión; sin reintento |

Garantías:

- El POST nunca se reintenta automáticamente (`attachRetryInterceptor` solo repite GET/HEAD/OPTIONS) y tras un resultado incierto el botón "Enviar evidencia" se oculta para no duplicar.
- Doble pulsación bloqueada con una referencia síncrona, no solo con el botón deshabilitado.
- 403 informa el permiso sin cerrar la sesión.
- Timeout de subida local de 60 s (`EVIDENCE_UPLOAD_TIMEOUT_MS`), distinto del general de 15 s.
- Una respuesta que llega tras cambiar de orden se descarta (el panel se desmonta) y la subida queda asociada a la orden original.
- No se envía `X-Request-ID` propio: MS4 solo lo registra para trazabilidad (no es clave de idempotencia documentada) y generar UUID en React Native requeriría un polyfill de `crypto.getRandomValues`.

Límite conocido: la verificación compara nombre y tamaño; si en la misma ventana se subió deliberadamente otra copia idéntica, se tomaría como la confirmación. Solo una clave de idempotencia en MS4 lo resolvería del todo.

## Visualización de evidencias según el rol (SCRUM-112)

`OrderEvidenceList` (`src/components/evidence/OrderEvidenceList.tsx`) se muestra en el detalle de la orden de los tres roles (`(cliente)/mis-ordenes/[id]`, `(mecanico)/ordenes-asignadas/[id]`, `(admin)/ordenes/[id]`), siempre detrás de su `RoleGuard`.

**Reglas del contrato MS4** (la autorización la aplica el servidor):

| Solicitante | `GET /evidencias?orden_id=` | Detalle y descarga |
|---|---|---|
| Cliente dueño | Solo `visible_cliente = true`, confirmadas y no eliminadas | Igual alcance; fuera de él, 404 |
| Mecánico asignado / personal | No eliminadas | Igual alcance; fuera de él, 404 |
| Administrador | Todas, incluidas las eliminadas | Sin consulta a MS2 (auditoría) |
| Orden ajena o inexistente | 404 (no revela existencia) | 404 |
| Sin JWT o expirado | 401 | 401 |

**Complementos en la app** (no sustituyen al servidor):

- La lista se pide con "Ver evidencias": abrir la orden no genera solicitudes adicionales.
- El cliente nunca ve una evidencia con `visible_cliente = false`, aunque llegara en la respuesta, ni los datos internos (visibilidad y estado), que solo ve el personal.
- Una respuesta que incluya evidencias de otra orden se rechaza completa y no se muestra nada.
- Se muestran solo los campos publicados: nombre original, etapa, fecha, tamaño y, para el personal, visibilidad y estado. El contrato no entrega autor ni descripción.
- 401 cierra la sesión (interceptor); 403 y 404 se informan sin cerrarla; error, lista vacía, actualización y reintento se manejan en la vista.
- Al cambiar de orden la lista se desmonta (`key`): no se reutilizan evidencias, URL ni imágenes de la orden anterior.

**Fotografías.** "Ver fotografía" pide `GET /evidencias/{id}/descarga` y muestra la URL prefirmada con `expo-image` y `cachePolicy="none"` (sin caché en disco ni en memoria). La URL se guarda solo en memoria del componente y se reutiliza mientras no caduque (`expira_en`); al caducar se pide otra. Si la imagen falla con la URL ya caducada se renueva una sola vez; cualquier otro fallo se informa con reintento. La URL nunca se registra, no se muestra en textos ni etiquetas accesibles y no lleva el token. Los archivos que no son imagen (MP4/MOV) no se muestran en línea.

**Pruebas y alcance.** Las pruebas usan los layouts reales, el servicio y el cliente HTTP reales y respuestas construidas según el contrato para cada rol. Comprueban cómo la app consulta, filtra y presenta esas respuestas y que las guardas de ruta no generan solicitudes; **no** prueban la autorización real de MS4, que requiere el entorno desplegado con credenciales de prueba de cada rol.

## Pruebas funcionales del módulo (SCRUM-108)

`__tests__/evidence-functional.test.tsx` recorre el caso de uso completo con pantallas, layouts (`RoleGuard`), store de sesión, `OrdersService`, `OrderLogService`, `EvidenceService`, `useEvidencePicker`, `useEvidenceUpload`, el cliente HTTP y sus interceptores reales. Se simulan `AuthService`, el almacenamiento seguro (en memoria), el selector nativo y el adaptador de red, que actúa como un servidor MS2 + MS4 con estado: guarda bitácora y evidencias y responde según los contratos.

**Flujo principal (una sola prueba):** login del mecánico → orden asignada 31 → avance con fotografía de la galería (vista previa, validación, `POST /ordenes/31/bitacora` y luego `POST /evidencias`) → evidencia independiente desde la cámara → "Ver evidencias" y "Ver fotografía" → cambio a la orden 32 sin arrastrar selección ni evidencias → todas las solicitudes con el JWT de la sesión → cierre de sesión y detalle inaccesible sin nuevas solicitudes.

**Flujos alternativos:** cámara rechazada (con galería como alternativa), galería cancelada, imagen inválida, archivo demasiado grande, falta de conectividad con la foto guardada (reintento la encuentra y no duplica), timeout sin guardar (comprueba y reenvía una vez), 503 (reintento directo), doble pulsación, 403 en la bitácora (sin logout ni subida), 404 de MS4, orden inexistente, orden entregada, cambio de orden durante el envío, sesión expirada (401 → login) y error 500 al consultar con recuperación.

Se verificó con mutaciones que las suites no son triviales: desactivar la comprobación previa al reintento hace fallar dos flujos funcionales, y quitar la verificación de orden en `OrderDetailView` hace fallar la prueba correspondiente.

### Niveles de prueba

| Nivel | Estado | Dónde |
|---|---|---|
| Unitarias | Ejecutadas | `evidence-file-validation` (validador y firma), `evidence-service` (multipart, errores), bitácora en `evidence-mechanic-updates` |
| Componentes | Ejecutadas | `evidence-capture`, `evidence-permissions`, `evidence-mechanic-updates` (pantalla real, servicios simulados) |
| Integración con servicios simulados | Ejecutadas | Las suites anteriores con `jest.mock` de servicios |
| Integración con adaptador HTTP simulado | Ejecutadas | `evidence-upload-states`, `evidence-role-visibility`, `evidence-functional` (cliente HTTP e interceptores reales) |
| Empaquetado web con Metro | Ejecutado | `expo export --platform web` termina sin errores e incluye las rutas de detalle |
| Dispositivo o emulador | **No ejecutadas** | El equipo no tiene Android SDK, emulador ni Xcode. Cámara, galería, permisos nativos, `FormData` nativo y progreso de subida no se comprobaron en hardware |
| E2E con backend real | **No ejecutadas** | Sin credenciales de prueba por rol ni entorno no productivo, y `/ms4/health/storage` respondía 503. No se enviaron fotografías ni solicitudes mutantes a producción |

Pendiente para cerrar la validación: en un dispositivo, probar los permisos (concedido, rechazado, permanente, revocado, acceso limitado en iOS) y una subida real a un entorno de pruebas de MS4 con almacenamiento operativo, con usuarios de los tres roles.
