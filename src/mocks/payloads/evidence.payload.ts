import type {
  EvidenceDownloadUrlResponseDto,
  EvidenceResponseDto,
} from '@/dto/evidence.dto';
import { orderResponsePayloads } from './order.payload';

type EvidenceCase =
  | 'fotoDiagnostico'
  | 'fotoPresupuesto'
  | 'videoReparacion'
  | 'fotoResultadoFinal';

/**
 * Evidencias de ejemplo con la forma exacta de `EvidenciaLeida` (`GET /api/evidencias` y `POST /api/evidencias` en MS4).
 */
export const evidenceResponsePayloads: Record<EvidenceCase, EvidenceResponseDto> = {
  fotoDiagnostico: {
    evidencia_id: '550e8400-e29b-41d4-a716-446655440001',
    orden_id: orderResponsePayloads.esperando_diagnostico.orden_id,
    presupuesto_id: null,
    contexto: 'diagnostico',
    tipo_archivo: 'foto',
    visible_cliente: true,
    estado: 'confirmada',
    nombre_original: 'bujias_desgastadas.jpg',
    content_type: 'image/jpeg',
    tamano_bytes: 482310,
    creada_en: '2026-03-03T14:40:00Z',
  },
  fotoPresupuesto: {
    evidencia_id: '550e8400-e29b-41d4-a716-446655440002',
    orden_id: orderResponsePayloads.esperando_aprobacion_presupuesto.orden_id,
    presupuesto_id: 2,
    contexto: 'presupuesto',
    tipo_archivo: 'foto',
    visible_cliente: true,
    estado: 'confirmada',
    nombre_original: 'filtro_aceite_antiguo.png',
    content_type: 'image/png',
    tamano_bytes: 615200,
    creada_en: '2026-03-04T08:45:00Z',
  },
  videoReparacion: {
    evidencia_id: '550e8400-e29b-41d4-a716-446655440003',
    orden_id: orderResponsePayloads.en_reparacion.orden_id,
    presupuesto_id: 3,
    contexto: 'reparacion',
    tipo_archivo: 'video',
    visible_cliente: true,
    estado: 'confirmada',
    nombre_original: 'ajuste_correa_distribucion.mp4',
    content_type: 'video/mp4',
    tamano_bytes: 4250800,
    creada_en: '2026-03-05T11:30:00Z',
  },
  fotoResultadoFinal: {
    evidencia_id: '550e8400-e29b-41d4-a716-446655440004',
    orden_id: orderResponsePayloads.listo_para_entrega.orden_id,
    presupuesto_id: null,
    contexto: 'resultado_final',
    tipo_archivo: 'foto',
    visible_cliente: true,
    estado: 'confirmada',
    nombre_original: 'motor_limpio_finalizado.webp',
    content_type: 'image/webp',
    tamano_bytes: 390120,
    creada_en: '2026-02-12T17:50:00Z',
  },
};

/**
 * URL prefirmada de ejemplo con la forma de `UrlDescarga` (`GET /api/evidencias/{id}/descarga`).
 */
export const evidenceDownloadUrlPayload: EvidenceDownloadUrlResponseDto = {
  url: 'https://storage.tallerconect.vercel.app/evidencias/550e8400-e29b-41d4-a716-446655440001?X-Amz-Expires=300',
  expira_en: 300,
};
