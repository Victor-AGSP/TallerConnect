import type { UploadEvidenceRequestDto } from '@/dto/evidence.dto';
import type { EvidenceUploadRequest } from '@/models/evidence.model';

/**
 * Convierte un identificador de la app (texto) en el entero positivo que exige el contrato de MS4.
 * Lanza un error si el texto no representa un entero mayor que 0, por ejemplo `'ot-00124'` o `'1.5'`.
 */
function toContractId(value: string, field: string): number {
  const clean = value.trim();
  const id = Number(clean);
  if (!/^\d+$/.test(clean) || !Number.isSafeInteger(id) || id <= 0) {
    throw new Error(`Identificador inválido en ${field}: ${value}`);
  }
  return id;
}

/**
 * Mapea una solicitud de subida de evidencia de la app a los campos de `Body_subir_evidencias_post` (MS4).
 *
 * | App (`EvidenceUploadRequest`) | Campo multipart | Conversión |
 * |---|---|---|
 * | `file` | `archivo` | Sin cambios; `buildEvidenceFormData` lo agrega como `{ uri, name, type }` |
 * | `metadata.orderId` | `orden_id` | Texto → entero positivo |
 * | `metadata.context` | `contexto` | Sin cambios |
 * | `metadata.budgetId` | `presupuesto_id` | Texto → entero positivo; se omite si es `null` o `undefined` |
 * | `metadata.visibleToClient` | `visible_cliente` | Sin cambios; se omite si es `null` o `undefined` |
 *
 * Los campos opcionales sin valor se omiten porque multipart no puede representar `null`.
 * El resultado se convierte en `multipart/form-data` con `buildEvidenceFormData`.
 */
export function mapEvidenceUploadRequest(
  request: EvidenceUploadRequest
): UploadEvidenceRequestDto {
  const { file, metadata } = request;

  const dto: UploadEvidenceRequestDto = {
    archivo: file,
    orden_id: toContractId(metadata.orderId, 'orden_id'),
    contexto: metadata.context,
  };

  if (metadata.budgetId !== undefined && metadata.budgetId !== null) {
    dto.presupuesto_id = toContractId(metadata.budgetId, 'presupuesto_id');
  }

  if (metadata.visibleToClient !== undefined && metadata.visibleToClient !== null) {
    dto.visible_cliente = metadata.visibleToClient;
  }

  return dto;
}