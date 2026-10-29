import type {
  EvidenceDownloadUrlResponseDto,
  EvidenceResponseDto,
  ReactNativeFormDataFile,
  UploadEvidenceRequestDto,
} from '@/dto/evidence.dto';
import type {
  Evidence,
  EvidenceContext,
  EvidenceDownloadUrl,
  SelectedMediaAsset,
} from '@/models/evidence.model';
import {
  resolveMediaFileName,
  resolveMediaMimeType,
} from '@/utils/media-picker';

const VALID_CONTEXTS: readonly EvidenceContext[] = [
  'diagnostico',
  'presupuesto',
  'reparacion',
  'resultado_final',
] as const;

function normalizeContext(raw: string): EvidenceContext {
  const clean = raw.trim().toLowerCase() as EvidenceContext;
  return VALID_CONTEXTS.includes(clean) ? clean : 'diagnostico';
}

function isSelectedMediaAsset(
  file: UploadEvidenceRequestDto['archivo']
): file is SelectedMediaAsset {
  return (
    typeof file === 'object' &&
    file !== null &&
    'uri' in file &&
    'mimeType' in file
  );
}

function isReactNativeFormDataFile(
  file: UploadEvidenceRequestDto['archivo']
): file is ReactNativeFormDataFile {
  return (
    typeof file === 'object' &&
    file !== null &&
    'uri' in file &&
    'name' in file &&
    'type' in file
  );
}

/**
 * Normaliza el activo de entrada al descriptor `{ uri, name, type }` requerido por `FormData` en React Native.
 */
export function toFormDataFilePart(
  archivo: UploadEvidenceRequestDto['archivo']
): ReactNativeFormDataFile | Blob {
  if (isSelectedMediaAsset(archivo)) {
    const type = resolveMediaMimeType(
      archivo.mimeType,
      archivo.fileName || archivo.uri,
      archivo.mediaType
    );
    const name = resolveMediaFileName(archivo.fileName, archivo.uri, type);
    return {
      uri: archivo.uri,
      name,
      type,
    };
  }

  if (isReactNativeFormDataFile(archivo)) {
    const type = resolveMediaMimeType(archivo.type, archivo.name || archivo.uri);
    const name = resolveMediaFileName(archivo.name, archivo.uri, type);
    return {
      uri: archivo.uri,
      name,
      type,
    };
  }

  return archivo;
}

/**
 * Construye una instancia de `FormData` (`multipart/form-data`) alineada con `Body_subir_evidencias_post` de MS4.
 * Campos:
 * - `archivo`: binario o descriptor `{ uri, name, type }`
 * - `orden_id`: entero positivo en texto
 * - `contexto`: `'diagnostico' | 'presupuesto' | 'reparacion' | 'resultado_final'`
 * - `presupuesto_id` (opcional)
 * - `visible_cliente` (opcional)
 */
export function buildEvidenceFormData(
  data: UploadEvidenceRequestDto
): FormData {
  const formData = new FormData();
  const filePart = toFormDataFilePart(data.archivo);

  // En React Native FormData.append acepta { uri, name, type } como segundo argumento
  formData.append('archivo', filePart as unknown as Blob);
  formData.append('orden_id', String(data.orden_id).trim());
  formData.append('contexto', data.contexto);

  if (data.presupuesto_id !== undefined && data.presupuesto_id !== null && String(data.presupuesto_id).trim() !== '') {
    formData.append('presupuesto_id', String(data.presupuesto_id).trim());
  }

  if (data.visible_cliente !== undefined && data.visible_cliente !== null) {
    formData.append('visible_cliente', String(Boolean(data.visible_cliente)));
  }

  return formData;
}

/**
 * Mapea una evidencia devuelta por la API Gateway (`EvidenciaLeida`) al modelo `Evidence`.
 */
export function mapEvidenceResponse(dto: EvidenceResponseDto): Evidence {
  return {
    id: String(dto.evidencia_id),
    orderId: String(dto.orden_id),
    budgetId: dto.presupuesto_id !== null ? String(dto.presupuesto_id) : null,
    context: normalizeContext(dto.contexto),
    fileType: dto.tipo_archivo,
    visibleToClient: Boolean(dto.visible_cliente),
    status: dto.estado,
    originalName: dto.nombre_original,
    contentType: dto.content_type,
    sizeBytes: dto.tamano_bytes,
    createdAt: dto.creada_en,
  };
}

/**
 * Mapea una lista de evidencias devuelta por `GET /api/evidencias` al arreglo de modelos `Evidence[]`.
 */
export function mapEvidenceListResponse(
  dtos: EvidenceResponseDto[]
): Evidence[] {
  if (!Array.isArray(dtos)) return [];
  return dtos.map(mapEvidenceResponse);
}

/**
 * Mapea la respuesta de URL prefirmada (`UrlDescarga`) al modelo `EvidenceDownloadUrl`.
 */
export function mapEvidenceDownloadUrlResponse(
  dto: EvidenceDownloadUrlResponseDto
): EvidenceDownloadUrl {
  return {
    url: dto.url,
    expiresInSeconds: dto.expira_en,
  };
}
