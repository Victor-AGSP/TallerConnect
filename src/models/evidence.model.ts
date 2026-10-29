/**
 * Evidencia fotográfica de una orden de trabajo (MS4 — Evidencia Multimedia).
 */

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

/** Etapa de la orden en la que se adjunta la evidencia (`ContextoEvidencia`). */
export type EvidenceContext =
  | 'diagnostico'
  | 'presupuesto'
  | 'reparacion'
  | 'resultado_final';

/**
 * Evidencia persistida por MS4. Solo contiene los campos que publica el
 * contrato: no incluye autor ni descripción.
 */
export interface Evidence {
  id: string;
  orderId: string;
  budgetId: string | null;
  context: string;
  fileKind: string;
  visibleToClient: boolean;
  status: string;
  originalName: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
}
