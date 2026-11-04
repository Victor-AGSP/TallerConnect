import { mapEvidenceResponse } from '@/mappers/evidence.mapper';
import { evidenceResponsePayloads } from '@/mocks/payloads/evidence.payload';
import type { Evidence } from '@/models/evidence.model';

/**
 * Evidencias simuladas derivadas de los payloads del contrato MS4.
 */
export const mockEvidences: Evidence[] = Object.values(
  evidenceResponsePayloads
).map(mapEvidenceResponse);
