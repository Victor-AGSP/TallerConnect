/**
 * Etapa de la orden de trabajo en la que se adjunta la evidencia (`ContextoEvidencia` en MS4).
 */
export type EvidenceContext =
  | 'diagnostico'
  | 'presupuesto'
  | 'reparacion'
  | 'resultado_final';

/**
 * Tipos MIME admitidos por la lista blanca del microservicio MS4 (`JPG`, `PNG`, `WEBP`, `MP4`, `MOV`).
 */
export type AllowedEvidenceMimeType =
  | 'image/jpeg'
  | 'image/png'
  | 'image/webp'
  | 'video/mp4'
  | 'video/quicktime';

/**
 * Activo multimedia local capturado por la cámara o seleccionado desde la galería en Expo.
 */
export interface SelectedMediaAsset {
  uri: string;
  fileName: string;
  mimeType: string;
  fileSize?: number;
  mediaType: 'image' | 'video';
  width?: number;
  height?: number;
  duration?: number | null;
}

/**
 * Modelo de dominio de una evidencia multimedia asociada a una orden de trabajo (`EvidenciaLeida` en MS4).
 */
export interface Evidence {
  id: string;
  orderId: string;
  budgetId: string | null;
  context: EvidenceContext;
  fileType: string;
  visibleToClient: boolean;
  status: string;
  originalName: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
}

/**
 * URL prefirmada de corta duración para descargar una evidencia (`UrlDescarga` en MS4).
 */
export interface EvidenceDownloadUrl {
  url: string;
  expiresInSeconds: number;
}
