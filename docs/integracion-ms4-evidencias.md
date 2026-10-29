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
