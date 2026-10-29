import { z } from 'zod';

/**
 * Valida `EvidenciaLeida` (MS4). `contexto`, `tipo_archivo` y `estado` viajan
 * como texto legible y el contrato no publica sus valores posibles, por lo
 * que se aceptan como texto no vacío.
 */
export const evidenceResponseDtoSchema = z.object({
  evidencia_id: z.uuid(),
  orden_id: z.number().int().positive(),
  presupuesto_id: z.number().int().positive().nullable(),
  contexto: z.string().min(1),
  tipo_archivo: z.string().min(1),
  visible_cliente: z.boolean(),
  estado: z.string().min(1),
  nombre_original: z.string(),
  content_type: z.string().min(1),
  tamano_bytes: z.number().int().nonnegative(),
  creada_en: z.iso.datetime({ offset: true, local: true }),
});

export const evidenceListResponseDtoSchema = z.array(evidenceResponseDtoSchema);

/** Valida `UrlDescarga` (MS4). */
export const evidenceDownloadResponseDtoSchema = z.object({
  url: z.url({ protocol: /^https?$/ }),
  expira_en: z.number().int().positive(),
});
