import type { UploadEvidenceRequestDto } from '@/dto/evidence.dto';
import {
  mockMediaAssets,
  type EvidenceUploadCase,
} from '@/mocks/evidence-uploads.mock';
import { budgetDetailPayloads } from './budget.payload';
import { orderResponsePayloads } from './order.payload';

/**
 * Campos de `Body_subir_evidencias_post` (`POST /api/evidencias` en MS4) que corresponden
 * a cada solicitud de `mockEvidenceUploadRequests`. Los campos opcionales sin valor no aparecen.
 */
export const evidenceUploadRequestPayloads: Record<
  EvidenceUploadCase,
  UploadEvidenceRequestDto
> = {
  diagnostico: {
    archivo: mockMediaAssets.fotoJpeg,
    orden_id: orderResponsePayloads.esperando_diagnostico.orden_id,
    contexto: 'diagnostico',
  },
  presupuesto: {
    archivo: mockMediaAssets.fotoJpeg,
    orden_id: orderResponsePayloads.esperando_aprobacion_presupuesto.orden_id,
    contexto: 'presupuesto',
    presupuesto_id: budgetDetailPayloads.enviado.presupuesto_id,
    visible_cliente: true,
  },
  reparacion: {
    archivo: mockMediaAssets.videoMp4,
    orden_id: orderResponsePayloads.en_reparacion.orden_id,
    contexto: 'reparacion',
    presupuesto_id: budgetDetailPayloads.aprobadoConModificacion.presupuesto_id,
    visible_cliente: false,
  },
  resultadoFinal: {
    archivo: mockMediaAssets.fotoJpeg,
    orden_id: orderResponsePayloads.listo_para_entrega.orden_id,
    contexto: 'resultado_final',
  },
};