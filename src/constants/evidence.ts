/**
 * Restricciones de carga de evidencia multimedia para `POST /api/evidencias`
 * (esquema `Body_subir_evidencias_post` en MS4).
 * Los contextos y formatos provienen del contrato; los límites de tamaño son valores
 * provisionales de la app, porque el contrato no publica cifras.
 */

/**
 * Etapas de la orden en las que se adjunta una evidencia (`ContextoEvidencia` en MS4).
 */
export const EVIDENCE_CONTEXTS = [
  'diagnostico',
  'presupuesto',
  'reparacion',
  'resultado_final',
] as const;

export type EvidenceContext = (typeof EVIDENCE_CONTEXTS)[number];

/**
 * Formatos de la lista blanca de MS4 (JPG, PNG, WEBP, MP4 y MOV) expresados como tipo MIME.
 * El backend verifica el formato por el contenido del archivo y responde 415 si no está permitido.
 */
export const EVIDENCE_MIME_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/webp'],
  video: ['video/mp4', 'video/quicktime'],
} as const;

export type EvidenceMediaKind = keyof typeof EVIDENCE_MIME_TYPES;

export const EVIDENCE_ALLOWED_MIME_TYPES = [
  ...EVIDENCE_MIME_TYPES.image,
  ...EVIDENCE_MIME_TYPES.video,
] as const;

export type AllowedEvidenceMimeType = (typeof EVIDENCE_ALLOWED_MIME_TYPES)[number];

/**
 * Tamaño máximo por tipo de archivo, en bytes.
 * El contrato de MS4 indica que existe un límite para foto y otro para video (413 al superarlo),
 * pero no publica las cifras. Estos valores son provisionales y coinciden con los de `EvidenceService`.
 */
export const EVIDENCE_MAX_SIZE_BYTES: Record<EvidenceMediaKind, number> = {
  image: 15 * 1024 * 1024,
  video: 50 * 1024 * 1024,
};

/**
 * Indica si un tipo MIME es foto o video según la lista blanca de MS4.
 * Devuelve `null` si el tipo no está permitido.
 */
export function getEvidenceMediaKind(mimeType: string): EvidenceMediaKind | null {
  const clean = mimeType.trim().toLowerCase();
  if ((EVIDENCE_MIME_TYPES.image as readonly string[]).includes(clean)) return 'image';
  if ((EVIDENCE_MIME_TYPES.video as readonly string[]).includes(clean)) return 'video';
  return null;
}