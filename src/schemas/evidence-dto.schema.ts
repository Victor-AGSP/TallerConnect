import { z } from 'zod';
import type {
  EvidenceDownloadUrlResponseDto,
  EvidenceResponseDto,
} from '@/dto/evidence.dto';

/**
 * Valida una evidencia recibida de la API (`EvidenciaLeida` en MS4).
 */
export const evidenceResponseDtoSchema: z.ZodType<EvidenceResponseDto> =
  z.object({
    evidencia_id: z.string().min(1),
    orden_id: z.number().int(),
    presupuesto_id: z.number().int().nullable(),
    contexto: z.string().min(1),
    tipo_archivo: z.string().min(1),
    visible_cliente: z.boolean(),
    estado: z.string().min(1),
    nombre_original: z.string().min(1),
    content_type: z.string().min(1),
    tamano_bytes: z.number().int().nonnegative(),
    creada_en: z.iso.datetime({ offset: true }),
  });

/**
 * Valida la lista de evidencias devuelta por `GET /api/evidencias`.
 */
export const evidenceListResponseDtoSchema: z.ZodType<EvidenceResponseDto[]> =
  z.array(evidenceResponseDtoSchema);

/**
 * Valida la URL prefirmada de descarga devuelta por `GET /api/evidencias/{evidencia_id}/descarga` (`UrlDescarga` en MS4).
 */
export const evidenceDownloadUrlResponseDtoSchema: z.ZodType<EvidenceDownloadUrlResponseDto> =
  z.object({
    url: z.string().min(1),
    expira_en: z.number().int().positive(),
  });
