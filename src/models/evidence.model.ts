import type {
  AllowedEvidenceMimeType,
  EvidenceContext,
} from '@/constants/evidence';

export type { AllowedEvidenceMimeType, EvidenceContext };

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