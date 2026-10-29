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
