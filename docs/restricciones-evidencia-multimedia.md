# Restricciones de carga de evidencia multimedia

Este documento contrasta las restricciones de tipo, tamaño y campos requeridos que define el contrato de MS4 (`/ms4/openapi.json`) para `POST /api/evidencias` con lo que aplica actualmente la app móvil. Las restricciones adoptadas por la app quedan centralizadas en `src/constants/evidence.ts`.

## Criterios de clasificación

| Categoría | Significado |
|---|---|
| **Coincide** | La app aplica la misma restricción que el contrato |
| **Diferencia** | La app aplica una restricción distinta, parcial o no la aplica |
| **No definido** | El contrato no entrega el dato necesario para aplicarla |

## Tipo de archivo

El contrato admite solo JPG, PNG, WEBP, MP4 y MOV (`415` en otro caso) y verifica el formato por el **contenido** del archivo, no por su nombre ni por el tipo declarado.

| Restricción | Contrato | App | Categoría |
|---|---|---|---|
| Formatos de imagen | JPG, PNG, WEBP | `image/jpeg`, `image/png`, `image/webp` | Coincide |
| Formatos de video | MP4, MOV | `video/mp4`, `video/quicktime` | Coincide |
| `image/jpg` | No es un tipo MIME estándar | Incluido en `ALLOWED_EVIDENCE_MIME_TYPES` (`media-picker.ts`) | Diferencia: redundante, porque `resolveMediaMimeType` ya lo normaliza a `image/jpeg` antes de validar |
| Tipo desconocido | Se rechaza con `415` | Si el archivo no informa tipo MIME ni tiene una extensión reconocida, `resolveMediaMimeType` asume `image/jpeg` | Diferencia: el archivo pasa la validación local y lo rechaza el backend |
| Verificación por contenido | Sí | La app solo revisa el tipo declarado o la extensión | Diferencia esperada: la validación local es preventiva y el `415` sigue siendo posible |

## Tamaño

| Restricción | Contrato | App | Categoría |
|---|---|---|---|
| Tamaño máximo de foto | Existe (`413`), sin cifra publicada | 15 MB provisionales | No definido |
| Tamaño máximo de video | Existe (`413`), sin cifra publicada | 50 MB provisionales | No definido |
| Archivo vacío | Se rechaza con `422` | El adaptador simulado rechaza tamaño `0` con `422` | Coincide |
| Tamaño desconocido | — | Si el activo no informa `fileSize`, el adaptador simulado asume 256 000 bytes | Diferencia: un archivo sin tamaño informado nunca se rechaza localmente |
| Aplicación de límites | El backend responde `413` | Solo los aplica `MockEvidenceAdapter`; `RealEvidenceAdapter` envía el archivo sin validarlo | Diferencia |

Los límites de 15 MB y 50 MB no provienen del contrato. Se mantienen como valores provisionales en `EVIDENCE_MAX_SIZE_BYTES` hasta que el backend publique los límites reales.

## Campos requeridos (`Body_subir_evidencias_post`)

| Campo | Contrato | App | Categoría |
|---|---|---|---|
| `archivo` | Binario, obligatorio | Obligatorio en `UploadEvidenceRequestDto`. Solo el adaptador simulado rechaza una URI vacía (`400`); el adaptador real no lo valida | Diferencia: obligatorio en tipos; validación solo simulada |
| `orden_id` | Entero `> 0`, obligatorio | El adaptador simulado solo rechaza un valor vacío o `'0'`; acepta negativos, decimales o texto. El adaptador real no lo valida | Diferencia |
| `contexto` | `diagnostico`, `presupuesto`, `reparacion` o `resultado_final`, obligatorio | Tipado como `EvidenceContext`. Solo el adaptador simulado lo valida en tiempo de ejecución; el adaptador real no | Diferencia: coincide en tipos; validación solo simulada |
| `presupuesto_id` | Entero `> 0` o `null`, opcional | `buildEvidenceFormData` lo omite si es `null`, `undefined` o vacío; no valida que sea positivo | Diferencia: falta validar el valor cuando se envía |
| `visible_cliente` | Booleano o `null`, opcional | `buildEvidenceFormData` lo omite si es `null` o `undefined` y lo envía como `'true'` o `'false'` | Coincide |

## Campos de la respuesta (`EvidenciaLeida`)

El contrato declara todos los campos como obligatorios; `presupuesto_id` es el único que admite `null`. `evidenceResponseDtoSchema` los exige todos, con dos diferencias:

| Campo | Contrato | App | Categoría |
|---|---|---|---|
| `evidencia_id` | `string`, formato `uuid` | `z.string().min(1)` | Diferencia: no valida el formato |
| `contexto` | `string` | El esquema acepta cualquier texto y `normalizeContext` (`evidence.mapper.ts`) convierte un valor desconocido en `'diagnostico'` | Diferencia: un contexto inesperado se reemplaza sin aviso |

## Restricciones adoptadas por la app

`src/constants/evidence.ts` reúne las restricciones del contrato y los límites de tamaño provisionales:

| Constante | Contenido |
|---|---|
| `EVIDENCE_CONTEXTS` | Los cuatro valores de `ContextoEvidencia` |
| `EVIDENCE_MIME_TYPES` | Tipos MIME permitidos, separados en imagen y video |
| `EVIDENCE_ALLOWED_MIME_TYPES` | Lista blanca completa de MS4 |
| `EVIDENCE_MAX_SIZE_BYTES` | Límites provisionales por tipo |
| `getEvidenceMediaKind()` | Indica si un tipo MIME es imagen o video, o `null` si no está permitido |

Los tipos `EvidenceContext` y `AllowedEvidenceMimeType` de `src/models/evidence.model.ts` se derivan de estas constantes, siguiendo el mismo patrón de `WorkOrderStatus` en `src/constants/orderStatus.ts`.