/**
 * DTO de evidencias del MS4, tal como los publica su contrato OpenAPI
 * (`/ms4/openapi.json`). La app los consume a través de la API Gateway
 * (`/api/evidencias`).
 */

/** `ContextoEvidencia`: etapa de la orden en la que se adjuntó la evidencia. */
export type EvidenceContextDto =
  | 'diagnostico'
  | 'presupuesto'
  | 'reparacion'
  | 'resultado_final';

/** `EvidenciaLeida` (sin clave del objeto ni hash, que son internos). */
export interface EvidenceResponseDto {
  evidencia_id: string;
  orden_id: number;
  presupuesto_id: number | null;
  contexto: string;
  tipo_archivo: string;
  visible_cliente: boolean;
  estado: string;
  nombre_original: string;
  content_type: string;
  tamano_bytes: number;
  creada_en: string;
}

/** `UrlDescarga`: URL prefirmada; `expira_en` son segundos desde la emisión. */
export interface EvidenceDownloadResponseDto {
  url: string;
  expira_en: number;
}
