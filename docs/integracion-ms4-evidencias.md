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
