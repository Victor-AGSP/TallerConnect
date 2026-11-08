import type {
  EvidenceFile,
  EvidenceMimeType,
  EvidenceSource,
} from '@/models/evidence.model';

/**
 * Validación local de fotografías de evidencia antes de solicitar su carga.
 *
 * MS4 (`POST /evidencias`) admite JPG, PNG, WEBP, MP4 y MOV verificados por su
 * contenido (415), rechaza archivos vacíos o dañados (422) y aplica un tamaño
 * máximo por tipo (413) cuyo valor NO está publicado en el contrato. Esta
 * validación es un filtro previo, no reemplaza la del servidor:
 *
 * - Tipos: subconjunto fotográfico de la lista blanca de MS4 (JPG, PNG, WEBP);
 *   los videos quedan fuera porque el módulo es exclusivamente fotográfico.
 * - Tamaño: política LOCAL configurable (`EXPO_PUBLIC_EVIDENCE_MAX_BYTES`),
 *   no un límite confirmado por el servidor; MS4 puede rechazar con 413.
 */

/** Tamaño máximo local por omisión: 10 MiB. */
export const DEFAULT_EVIDENCE_MAX_BYTES = 10 * 1024 * 1024;

export interface EvidenceFilePolicy {
  maxBytes: number;
  /** Extensiones permitidas para cada tipo MIME. */
  allowedTypes: Readonly<Record<EvidenceMimeType, readonly string[]>>;
}

const ALLOWED_TYPES: EvidenceFilePolicy['allowedTypes'] = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
};

/** Lee el máximo configurado; un valor ausente o inválido usa el de omisión. */
export function resolveEvidenceMaxBytes(raw?: string): number {
  if (!raw || !/^[1-9]\d*$/.test(raw.trim())) return DEFAULT_EVIDENCE_MAX_BYTES;
  const value = Number(raw.trim());
  return Number.isSafeInteger(value) ? value : DEFAULT_EVIDENCE_MAX_BYTES;
}

export const EVIDENCE_FILE_POLICY: EvidenceFilePolicy = {
  maxBytes: resolveEvidenceMaxBytes(process.env.EXPO_PUBLIC_EVIDENCE_MAX_BYTES),
  allowedTypes: ALLOWED_TYPES,
};

/**
 * Datos de un archivo tal como los entrega el selector (compatible con
 * `ImagePickerAsset` de expo-image-picker).
 */
export interface EvidenceFileCandidate {
  uri?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  type?: string | null;
  file?: Blob | null;
}

export type EvidenceFileErrorCode =
  | 'MISSING_FILE'
  | 'INVALID_URI'
  | 'MISSING_METADATA'
  | 'UNSUPPORTED_TYPE'
  | 'EXTENSION_MISMATCH'
  | 'SIGNATURE_MISMATCH'
  | 'EMPTY_FILE'
  | 'TOO_LARGE'
  | 'UNREADABLE'
  | 'MULTIPLE_NOT_SUPPORTED';

export interface EvidenceFileError {
  ok: false;
  code: EvidenceFileErrorCode;
  message: string;
}

export type EvidenceFileValidation = { ok: true; file: EvidenceFile } | EvidenceFileError;

function formatMegabytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`;
}

function fail(code: EvidenceFileErrorCode, policy: EvidenceFilePolicy): EvidenceFileError {
  const messages: Record<EvidenceFileErrorCode, string> = {
    MISSING_FILE: 'No se seleccionó ninguna fotografía.',
    INVALID_URI: 'No se pudo acceder a la fotografía seleccionada. Elige otra.',
    MISSING_METADATA:
      'No se pudo determinar el tipo o el tamaño de la fotografía. Elige otra.',
    UNSUPPORTED_TYPE: 'Formato no permitido: solo fotografías JPG, PNG o WEBP.',
    EXTENSION_MISMATCH:
      'La extensión del archivo no coincide con su tipo. Elige otra fotografía.',
    SIGNATURE_MISMATCH:
      'El contenido del archivo no corresponde a una fotografía válida.',
    EMPTY_FILE: 'La fotografía está vacía. Elige otra.',
    TOO_LARGE: `La fotografía supera el máximo de ${formatMegabytes(policy.maxBytes)}.`,
    UNREADABLE: 'No se pudo leer la fotografía: puede que ya no exista. Elige otra.',
    MULTIPLE_NOT_SUPPORTED: 'Selecciona una sola fotografía por envío.',
  };
  return { ok: false, code, message: messages[code] };
}

/** Normaliza el MIME declarado (`image/jpg` → `image/jpeg`). */
function normalizeMime(mime: string): string {
  const base = mime.split(';')[0].trim().toLowerCase();
  return base === 'image/jpg' || base === 'image/pjpeg' ? 'image/jpeg' : base;
}

/** Esquemas de URI locales que entregan cámara y galería en cada plataforma. */
const LOCAL_URI = /^(file:\/\/|content:\/\/|ph:\/\/|assets-library:\/\/|blob:|data:image\/)/i;

function extensionOf(name: string): string | null {
  const clean = name.split(/[?#]/)[0];
  const base = clean.slice(clean.lastIndexOf('/') + 1);
  const dot = base.lastIndexOf('.');
  if (dot <= 0 || dot === base.length - 1) return null;
  return base.slice(dot + 1).toLowerCase();
}

/**
 * Valida los metadatos de una fotografía sin acceder a la red.
 * No registra nada: las URI pueden revelar rutas privadas del dispositivo.
 */
export function validateEvidenceFile(
  candidate: EvidenceFileCandidate | null | undefined,
  source: EvidenceSource,
  policy: EvidenceFilePolicy = EVIDENCE_FILE_POLICY,
): EvidenceFileValidation {
  if (!candidate) return fail('MISSING_FILE', policy);

  const uri = typeof candidate.uri === 'string' ? candidate.uri.trim() : '';
  if (!uri || !LOCAL_URI.test(uri)) return fail('INVALID_URI', policy);

  if (candidate.type && candidate.type !== 'image') {
    return fail('UNSUPPORTED_TYPE', policy);
  }

  const declaredMime = candidate.mimeType || candidate.file?.type || '';
  const size = candidate.fileSize ?? candidate.file?.size;
  if (!declaredMime || size === undefined || size === null) {
    return fail('MISSING_METADATA', policy);
  }
  if (typeof size !== 'number' || !Number.isFinite(size) || size < 0) {
    return fail('MISSING_METADATA', policy);
  }

  const mime = normalizeMime(declaredMime);
  const allowedExtensions = policy.allowedTypes[mime as EvidenceMimeType];
  if (!allowedExtensions) return fail('UNSUPPORTED_TYPE', policy);

  const rawName = candidate.fileName?.trim() || '';
  const extension = extensionOf(rawName) ?? extensionOf(uri);
  if (extension && !allowedExtensions.includes(extension)) {
    return fail('EXTENSION_MISMATCH', policy);
  }

  if (size === 0) return fail('EMPTY_FILE', policy);
  if (size > policy.maxBytes) return fail('TOO_LARGE', policy);

  // Solo el nombre base: nunca la ruta del dispositivo.
  const baseName = rawName ? rawName.slice(rawName.lastIndexOf('/') + 1) : '';
  const name =
    baseName && extensionOf(baseName) ? baseName : `evidencia.${allowedExtensions[0]}`;

  return {
    ok: true,
    file: {
      uri,
      name,
      mimeType: mime as EvidenceMimeType,
      size,
      source,
      ...(candidate.file ? { webFile: candidate.file } : {}),
    },
  };
}

/**
 * Identifica el formato por su firma (primeros bytes) o devuelve `null` si
 * no corresponde a ninguna fotografía permitida.
 */
export function detectImageSignature(bytes: Uint8Array): EvidenceMimeType | null {
  const starts = (sig: number[], offset = 0) =>
    bytes.length >= offset + sig.length && sig.every((b, i) => bytes[offset + i] === b);

  if (starts([0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  // RIFF....WEBP
  if (starts([0x52, 0x49, 0x46, 0x46]) && starts([0x57, 0x45, 0x42, 0x50], 8)) {
    return 'image/webp';
  }
  return null;
}

/** Lee los primeros bytes de un archivo, o `null` si la plataforma no lo permite. */
export type EvidenceHeaderReader = (
  candidate: EvidenceFileCandidate,
) => Promise<Uint8Array | null>;

/**
 * Lector por omisión: en web el selector entrega un `File` legible. En
 * Android/iOS no hay API de archivos declarada en el proyecto, por lo que la
 * firma la verifica MS4 por contenido (415).
 */
export const readEvidenceHeader: EvidenceHeaderReader = async (candidate) => {
  const blob = candidate.file;
  if (!blob || typeof blob.slice !== 'function') return null;
  const chunk = blob.slice(0, 16);
  if (typeof chunk.arrayBuffer !== 'function') return null;
  return new Uint8Array(await chunk.arrayBuffer());
};

/**
 * Validación completa previa a la carga: metadatos y, cuando la plataforma
 * permite leer el archivo, su firma. Un archivo que no se puede leer se trata
 * como inexistente.
 */
export async function prepareEvidenceFile(
  candidate: EvidenceFileCandidate | null | undefined,
  source: EvidenceSource,
  options: { policy?: EvidenceFilePolicy; readHeader?: EvidenceHeaderReader } = {},
): Promise<EvidenceFileValidation> {
  const policy = options.policy ?? EVIDENCE_FILE_POLICY;
  const result = validateEvidenceFile(candidate, source, policy);
  if (!result.ok || !candidate) return result;

  let header: Uint8Array | null;
  try {
    header = await (options.readHeader ?? readEvidenceHeader)(candidate);
  } catch {
    return fail('UNREADABLE', policy);
  }

  if (header) {
    if (header.length === 0) return fail('EMPTY_FILE', policy);
    if (detectImageSignature(header) !== result.file.mimeType) {
      return fail('SIGNATURE_MISMATCH', policy);
    }
  }

  return result;
}

/** Resultado del selector de cámara o galería (forma de `ImagePickerResult`). */
export interface EvidencePickerResult {
  canceled: boolean;
  assets?: EvidenceFileCandidate[] | null;
}

export type EvidenceSelection =
  | { status: 'canceled' }
  | { status: 'invalid'; code: EvidenceFileErrorCode; message: string }
  | { status: 'selected'; file: EvidenceFile };

/**
 * Convierte el resultado del selector en una selección validada. El módulo
 * admite una fotografía por envío.
 */
export async function selectionFromPickerResult(
  result: EvidencePickerResult | null | undefined,
  source: EvidenceSource,
  options?: { policy?: EvidenceFilePolicy; readHeader?: EvidenceHeaderReader },
): Promise<EvidenceSelection> {
  if (!result || result.canceled) return { status: 'canceled' };

  const assets = result.assets ?? [];
  if (assets.length === 0) return { status: 'canceled' };
  if (assets.length > 1) {
    const { code, message } = fail(
      'MULTIPLE_NOT_SUPPORTED',
      options?.policy ?? EVIDENCE_FILE_POLICY,
    );
    return { status: 'invalid', code, message };
  }

  const validation = await prepareEvidenceFile(assets[0], source, options);
  return validation.ok
    ? { status: 'selected', file: validation.file }
    : { status: 'invalid', code: validation.code, message: validation.message };
}
