import { z } from 'zod';

import { EVIDENCE_CONTEXTS } from '@/constants/evidence';
import type { EvidenceUploadMetadata } from '@/models/evidence.model';

/**
 * Valida los metadatos de una evidencia antes de subirla (campos de texto de
 * `Body_subir_evidencias_post` en MS4).
 * Los identificadores se validan como texto no vacío; la comprobación de entero positivo
 * que exige el contrato se hace al convertirlos para el envío, como establece
 * `docs/convenciones-representacion-datos.md`.
 */
export const evidenceUploadMetadataSchema: z.ZodType<EvidenceUploadMetadata> = z.object({
  orderId: z.string('La orden es obligatoria').trim().min(1, 'La orden es obligatoria'),
  context: z.enum(EVIDENCE_CONTEXTS, 'Selecciona una etapa válida para la evidencia'),
  budgetId: z
    .string()
    .trim()
    .min(1, 'El presupuesto no puede estar vacío')
    .nullable()
    .optional(),
  visibleToClient: z.boolean().nullable().optional(),
});