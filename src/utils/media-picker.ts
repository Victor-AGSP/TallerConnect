import * as ImagePicker from 'expo-image-picker';
import type { SelectedMediaAsset } from '@/models/evidence.model';
import {
  ensureCameraPermission,
  ensureMediaLibraryPermission,
} from './media-permissions';

/**
 * Lista blanca de tipos MIME aceptados por el contrato de MS4 (`415 Unsupported Media Type` si no coincide).
 */
export const ALLOWED_EVIDENCE_MIME_TYPES: readonly string[] = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/quicktime',
] as const;

const EXTENSION_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
};

const MIME_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
};

/**
 * Opciones para capturar o seleccionar fotos y videos con `expo-image-picker`.
 */
export interface MediaPickerOptions {
  mediaTypes?: ('images' | 'videos')[];
  quality?: number;
  allowsEditing?: boolean;
  videoMaxDuration?: number;
}

/**
 * Infiere el tipo MIME de un archivo a partir de su tipo reportado, nombre o URI.
 */
export function resolveMediaMimeType(
  rawMimeType?: string | null,
  fileNameOrUri?: string | null,
  fallbackType: 'image' | 'video' = 'image'
): string {
  if (rawMimeType && rawMimeType.trim() !== '') {
    const clean = rawMimeType.trim().toLowerCase();
    return clean === 'image/jpg' ? 'image/jpeg' : clean;
  }

  if (fileNameOrUri) {
    const cleanPath = fileNameOrUri.split('?')[0].split('#')[0];
    const parts = cleanPath.split('.');
    if (parts.length > 1) {
      const ext = parts[parts.length - 1].toLowerCase();
      if (EXTENSION_TO_MIME[ext]) {
        return EXTENSION_TO_MIME[ext];
      }
    }
  }

  return fallbackType === 'video' ? 'video/mp4' : 'image/jpeg';
}

/**
 * Infiere un nombre de archivo válido con extensión para el envío `multipart/form-data`.
 */
export function resolveMediaFileName(
  rawFileName?: string | null,
  uri?: string | null,
  mimeType = 'image/jpeg'
): string {
  if (rawFileName && rawFileName.trim() !== '') {
    return rawFileName.trim();
  }

  const ext = MIME_TO_EXTENSION[mimeType.toLowerCase()] ?? 'jpg';
  if (uri) {
    const cleanUri = uri.split('?')[0].split('#')[0];
    const segments = cleanUri.split('/');
    const lastSegment = segments[segments.length - 1];
    if (lastSegment && lastSegment.includes('.')) {
      return lastSegment;
    }
  }

  return `evidencia_${Date.now()}.${ext}`;
}

/**
 * Verifica si el tipo MIME del activo está en la lista blanca permitida por MS4.
 */
export function isAllowedEvidenceMimeType(mimeType: string): boolean {
  return ALLOWED_EVIDENCE_MIME_TYPES.includes(mimeType.trim().toLowerCase());
}

/**
 * Convierte un `ImagePickerAsset` de Expo en nuestro modelo normalizado `SelectedMediaAsset`.
 */
export function normalizeImagePickerAsset(
  asset: ImagePicker.ImagePickerAsset
): SelectedMediaAsset {
  const mediaType: 'image' | 'video' =
    asset.type === 'video' ? 'video' : 'image';
  const mimeType = resolveMediaMimeType(
    asset.mimeType,
    asset.fileName ?? asset.uri,
    mediaType
  );
  const fileName = resolveMediaFileName(asset.fileName, asset.uri, mimeType);

  return {
    uri: asset.uri,
    fileName,
    mimeType,
    fileSize: asset.fileSize,
    mediaType,
    width: asset.width,
    height: asset.height,
    duration: asset.duration ?? null,
  };
}

/**
 * Abre la cámara del dispositivo previa validación de permisos y devuelve el archivo capturado
 * o `null` si el usuario cancela la captura.
 */
export async function captureMediaFromCamera(
  options: MediaPickerOptions = {}
): Promise<SelectedMediaAsset | null> {
  await ensureCameraPermission();

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: options.mediaTypes ?? ['images', 'videos'],
    quality: options.quality ?? 0.85,
    allowsEditing: options.allowsEditing ?? false,
    videoMaxDuration: options.videoMaxDuration ?? 60,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  return normalizeImagePickerAsset(result.assets[0]);
}

/**
 * Abre la galería multimedia del dispositivo previa validación de permisos y devuelve el archivo seleccionado
 * o `null` si el usuario cancela la selección.
 */
export async function pickMediaFromLibrary(
  options: MediaPickerOptions = {}
): Promise<SelectedMediaAsset | null> {
  await ensureMediaLibraryPermission();

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: options.mediaTypes ?? ['images', 'videos'],
    quality: options.quality ?? 0.85,
    allowsEditing: options.allowsEditing ?? false,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  return normalizeImagePickerAsset(result.assets[0]);
}
