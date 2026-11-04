# Estudio de Permisos, Archivos en Dispositivos Expo y Contrato de Evidencia Multimedia (MS4)

Este documento analiza el comportamiento del sistema de permisos y manejo de archivos multimedia en dispositivos móviles (**iOS**, **Android** y **Web**) utilizando `expo-camera` y `expo-image-picker`, así como su integración con el microservicio **SGTM — MS4: Evidencia Multimedia** (`https://tallerconect.vercel.app/ms4/openapi.json`).

---

## 1. Comportamiento de Permisos en Dispositivos Expo

En React Native / Expo (`expo-camera` y `expo-image-picker`), el acceso al hardware de captura y a la biblioteca multimedia del dispositivo se rige por permisos en tiempo de ejecución:

| Estado (`PermissionStatus`) | `granted` | `canAskAgain` | Comportamiento en el dispositivo y acción en TallerConnect |
|---|---|---|---|
| `undetermined` | `false` | `true` | El usuario aún no ha sido consultado. La app debe invocar `requestCameraPermissionsAsync()` o `requestMediaLibraryPermissionsAsync()` para mostrar el diálogo nativo del sistema operativo. |
| `granted` | `true` | `true` | Permiso concedido (total o parcial en iOS 14+ / Android 14+ mediante *Selected Photos*). Se permite abrir la cámara o el selector de archivos. |
| `denied` | `false` | `true` | El usuario rechazó la solicitud en esta ocasión (Android permite volver a preguntar una vez más antes de bloquear). Se informa que el permiso es necesario para adjuntar evidencia. |
| `denied` (bloqueado) | `false` | `false` | En iOS tras el primer rechazo o en Android tras rechazar permanentemente ("No volver a preguntar"), el sistema operativo no vuelve a mostrar el diálogo nativo. La app debe indicar al usuario que habilite el permiso desde la **Configuración del dispositivo**. |

### Declaración en `app.json`
Para que los binarios nativos y Expo Go describan adecuadamente el motivo del permiso (requisito obligatorio de App Store `NSCameraUsageDescription` / `NSPhotoLibraryUsageDescription` y permisos de Android), se configuran los plugins de `expo-camera` y `expo-image-picker` en `app.json`.

---

## 2. Comportamiento de Archivos y URIs en `expo-image-picker`

Cuando el usuario toma una fotografía/video con `launchCameraAsync` o selecciona un archivo con `launchImageLibraryAsync`, Expo devuelve un objeto `ImagePickerResult` con `canceled: boolean` y un arreglo `assets: ImagePickerAsset[]`:

1. **Almacenamiento temporal (Cache Directory):**
   - En **iOS y Android**, el archivo capturado o seleccionado se copia a un directorio temporal de caché de la aplicación con un esquema `file:///...`.
   - En **Web**, el activo se entrega como una URL `blob:` o `data:`.
2. **Metadatos del activo (`ImagePickerAsset`):**
   - `uri`: ruta local del archivo (obligatoria).
   - `fileName`: nombre del archivo (en iOS o cámara directa puede venir en `null`, por lo que nuestra capa `media-picker.ts` infiere un nombre seguro como `evidencia_<timestamp>.jpg` a partir de la URI o del tipo MIME).
   - `mimeType`: tipo MIME reportado (ej. `image/jpeg`, `image/png`, `image/webp`, `video/mp4`, `video/quicktime`). Si el sistema operativo no lo reporta, se infiere desde la extensión del archivo.
   - `fileSize`: tamaño en bytes (opcional según plataforma).
3. **Construcción de `multipart/form-data` en React Native:**
   - A diferencia del navegador web estándar que exige una instancia de `File` o `Blob`, la implementación de `FormData` en React Native requiere adjuntar un descriptor de archivo con la forma `{ uri: string, name: string, type: string }` en el campo `archivo`.

---

## 3. Contrato OpenAPI de MS4 (`SGTM — MS4: Evidencia Multimedia`)

### 3.1 Endpoints publicados en `/ms4/openapi.json`

| Método y Ruta (MS4) | Ruta vía Gateway | Rol requerido | Parámetros / Cuerpo | Respuesta (`200`/`201`) | Método en `EvidenceService` |
|---|---|---|---|---|---|
| `POST /evidencias` | `POST /api/evidencias` | Mecánico o Administrador | `multipart/form-data` (`Body_subir_evidencias_post`):<br>- `archivo` (binario, obligatorio)<br>- `orden_id` (`int > 0`, obligatorio)<br>- `contexto` (`ContextoEvidencia`, obligatorio)<br>- `presupuesto_id?` (`int > 0 \| null`)<br>- `visible_cliente?` (`boolean \| null`) | `EvidenciaLeida` (`201`) | `uploadEvidence(data, options?)` |
| `GET /evidencias` | `GET /api/evidencias` | Autenticado (según alcance) | Query: `orden_id: integer > 0` (obligatorio) | `EvidenciaLeida[]` (`200`) | `getEvidencesByOrder(orderId)` |
| `GET /evidencias/{evidencia_id}` | `GET /api/evidencias/{evidencia_id}` | Autenticado (según alcance) | Path: `evidencia_id: string (uuid)` | `EvidenciaLeida` (`200`) | `getEvidenceById(evidenceId)` |
| `GET /evidencias/{evidencia_id}/descarga` | `GET /api/evidencias/{evidencia_id}/descarga` | Autenticado (según alcance) | Path: `evidencia_id: string (uuid)` | `UrlDescarga` (`200`) | `getEvidenceDownloadUrl(evidenceId)` |

### 3.2 Esquemas y Reglas de Validación en MS4

- **`ContextoEvidencia`**: `'diagnostico' | 'presupuesto' | 'reparacion' | 'resultado_final'`.
- **Lista blanca de formatos (`415 Unsupported Media Type`)**:
  - Imágenes: `JPG` (`image/jpeg`), `PNG` (`image/png`), `WEBP` (`image/webp`).
  - Videos: `MP4` (`video/mp4`), `MOV` (`video/quicktime`).
- **`EvidenciaLeida`** (`EvidenceResponseDto`):
  - `evidencia_id`: `string (uuid)`
  - `orden_id`: `integer`
  - `presupuesto_id`: `integer | null`
  - `contexto`: `string`
  - `tipo_archivo`: `string` (`'foto' | 'video'`)
  - `visible_cliente`: `boolean`
  - `estado`: `string`
  - `nombre_original`: `string`
  - `content_type`: `string`
  - `tamano_bytes`: `integer`
  - `creada_en`: `string (date-time)`
- **`UrlDescarga`** (`EvidenceDownloadUrlResponseDto`):
  - `url`: `string` (URL GET prefirmada de corta duración hacia MinIO/S3)
  - `expira_en`: `integer` (segundos de validez desde la emisión)

### 3.3 Códigos de Error de Carga en MS4

| Código HTTP | Condición en MS4 | Código `ServiceError` en la app |
|---|---|---|
| `400` | No se pudo leer el archivo enviado | `EVIDENCE_BAD_FILE` |
| `401` | JWT ausente, inválido o expirado | `EVIDENCE_UNAUTHORIZED` |
| `403` | Se requiere rol Mecánico o Administrador | `EVIDENCE_FORBIDDEN` |
| `404` | La orden o evidencia no existe o está fuera del alcance del solicitante | `EVIDENCE_NOT_FOUND` |
| `409` | La orden está entregada o cancelada (estado terminal) | `EVIDENCE_CONFLICT` |
| `413` | El archivo supera el tamaño máximo permitido para foto o video | `EVIDENCE_TOO_LARGE` |
| `415` | Formato no permitido (solo JPG, PNG, WEBP, MP4 y MOV) | `EVIDENCE_UNSUPPORTED_MEDIA` |
| `422` | Archivo vacío/dañado, contexto inválido o presupuesto de otra orden | `EVIDENCE_VALIDATION_ERROR` |
| `503` | Almacenamiento (MinIO/S3), base de datos, MS2 o MS3 no disponible | `EVIDENCE_STORAGE_UNAVAILABLE` |
