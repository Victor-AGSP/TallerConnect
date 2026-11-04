import type {
  AllowedEvidenceMimeType,
  EvidenceContext,
} from '@/constants/evidence';

export type { AllowedEvidenceMimeType, EvidenceContext };

/** Tipos MIME de fotografía que la aplicación permite enviar. */
export type EvidenceMimeType = 'image/jpeg' | 'image/png' | 'image/webp';

/** Origen de la fotografía seleccionada. */
export type EvidenceSource = 'camera' | 'library';

/**
 * Fotografía local ya validada y lista para enviarse. Solo existe en el
 * dispositivo hasta que MS4 confirma la carga.
 */
export interface EvidenceFile {
  uri: string;
  name: string;
  mimeType: EvidenceMimeType;
  /** Tamaño real en bytes informado por la plataforma. */
  size: number;
  source: EvidenceSource;
  /** Archivo del navegador (solo web); se envía tal cual en el multipart. */
  webFile?: Blob;
}


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
 * Metadatos que la app adjunta a una evidencia al subirla (campos de texto de `Body_subir_evidencias_post` en MS4).
 * `budgetId` y `visibleToClient` son opcionales y admiten `null`, como en el contrato.
 */
export interface EvidenceUploadMetadata {
  orderId: string;
  context: EvidenceContext;
  budgetId?: string | null;
  visibleToClient?: boolean | null;
}

/**
 * Solicitud de subida de una evidencia: el archivo local seleccionado y sus metadatos.
 */
export interface EvidenceUploadRequest {
  file: SelectedMediaAsset;
  metadata: EvidenceUploadMetadata;
}

/**
 * Modelo de dominio de una evidencia multimedia asociada a una orden de trabajo (`EvidenciaLeida` en MS4).
 */
export interface Evidence {
  id: string;
  orderId: string;
  budgetId: string | null;
  context: EvidenceContext;
  fileType?: string;
  /** Compatibilidad con vistas anteriores basadas en evidencia fotográfica. */
  fileKind?: string;
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