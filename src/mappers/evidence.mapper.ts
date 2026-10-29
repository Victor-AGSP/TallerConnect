import type {
  EvidenceDownloadResponseDto,
  EvidenceResponseDto,
} from '@/dto/evidence.dto';
import type { Evidence } from '@/models/evidence.model';
import {
  evidenceDownloadResponseDtoSchema,
  evidenceListResponseDtoSchema,
  evidenceResponseDtoSchema,
} from '@/schemas/evidence-dto.schema';

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
    context: dto.contexto,
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
