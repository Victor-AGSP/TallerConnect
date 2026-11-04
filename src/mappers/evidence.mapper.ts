import type {
  EvidenceDownloadResponseDto,
  EvidenceDownloadUrlResponseDto,
  EvidenceResponseDto,
  ReactNativeFormDataFile,
  UploadEvidenceRequestDto,
} from '@/dto/evidence.dto';
import type { Evidence, EvidenceContext, EvidenceDownloadUrl, SelectedMediaAsset } from '@/models/evidence.model';
import { resolveMediaFileName, resolveMediaMimeType } from '@/utils/media-picker';
import {
  evidenceDownloadResponseDtoSchema,
  evidenceListResponseDtoSchema,
  evidenceResponseDtoSchema,
} from '@/schemas/evidence-dto.schema';

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


/** Mensaje para respuestas que no cumplen el contrato del MS4. */
export const INVALID_EVIDENCE_RESPONSE =
  'La respuesta del servicio de evidencias no es válida.';

export class InvalidEvidenceResponseError extends Error {
  constructor() {
    super(INVALID_EVIDENCE_RESPONSE);
    this.name = 'InvalidEvidenceResponseError';
  }
}

function toModel(dto: EvidenceResponseDto): Evidence {
  return {
    id: dto.evidencia_id,
    orderId: String(dto.orden_id),
    budgetId: dto.presupuesto_id === null ? null : String(dto.presupuesto_id),
    context: dto.contexto as EvidenceContext,
    fileKind: dto.tipo_archivo,
    visibleToClient: dto.visible_cliente,
    status: dto.estado,
    originalName: dto.nombre_original,
    contentType: dto.content_type,
    sizeBytes: dto.tamano_bytes,
    createdAt: dto.creada_en,
  };
}

/** Convierte `EvidenciaLeida`; rechaza respuestas fuera del contrato. */
export function mapEvidenceResponse(value: unknown): Evidence {
  const parsed = evidenceResponseDtoSchema.safeParse(value);
  if (!parsed.success) throw new InvalidEvidenceResponseError();
  return toModel(parsed.data);
}

/** Convierte la lista de `EvidenciaLeida`; rechaza respuestas fuera del contrato. */
export function mapEvidenceListResponse(value: unknown): Evidence[] {
  const parsed = evidenceListResponseDtoSchema.safeParse(value);
  if (!parsed.success) throw new InvalidEvidenceResponseError();
  return parsed.data.map(toModel);
}

/** Valida `UrlDescarga`. */
export function mapEvidenceDownloadResponse(value: unknown): EvidenceDownloadResponseDto {
  const parsed = evidenceDownloadResponseDtoSchema.safeParse(value);
  if (!parsed.success) throw new InvalidEvidenceResponseError();
  return parsed.data;
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
