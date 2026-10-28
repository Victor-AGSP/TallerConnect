import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';

/**
 * Tipo de permiso multimedia requerido en el dispositivo.
 */
export type MediaPermissionType = 'camera' | 'mediaLibrary';

/**
 * Estado normalizado de un permiso de cámara o galería en Expo.
 */
export type MediaPermissionStatus = 'granted' | 'denied' | 'undetermined';

/**
 * Resultado estructurado de la verificación o solicitud de un permiso multimedia.
 */
export interface MediaPermissionResult {
  type: MediaPermissionType;
  granted: boolean;
  status: MediaPermissionStatus;
  canAskAgain: boolean;
  message: string;
}

/**
 * Error tipado cuando el usuario deniega permisos de cámara o galería.
 */
export class MediaPermissionError extends Error {
  readonly permissionType: MediaPermissionType;
  readonly status: MediaPermissionStatus;
  readonly canAskAgain: boolean;
  readonly code = 'EVIDENCE_PERMISSION_DENIED';

  constructor(result: MediaPermissionResult) {
    super(result.message);
    this.name = 'MediaPermissionError';
    this.permissionType = result.type;
    this.status = result.status;
    this.canAskAgain = result.canAskAgain;
    Object.setPrototypeOf(this, MediaPermissionError.prototype);
  }
}

function normalizeStatus(status?: string): MediaPermissionStatus {
  if (status === 'granted') return 'granted';
  if (status === 'denied') return 'denied';
  return 'undetermined';
}

function buildPermissionMessage(
  type: MediaPermissionType,
  granted: boolean,
  canAskAgain: boolean
): string {
  if (granted) {
    return type === 'camera'
      ? 'Permiso de cámara concedido.'
      : 'Permiso de galería multimedia concedido.';
  }

  const label = type === 'camera' ? 'la cámara' : 'la galería de fotos y videos';
  if (!canAskAgain) {
    return `El acceso a ${label} fue bloqueado permanentemente. Habilita el permiso desde la Configuración del dispositivo para adjuntar evidencias.`;
  }

  return `Se requiere permiso para acceder a ${label} y adjuntar evidencia de la orden.`;
}

/**
 * Consulta el estado actual del permiso de cámara sin abrir el diálogo del sistema.
 */
export async function checkCameraPermission(): Promise<MediaPermissionResult> {
  const response = await ImagePicker.getCameraPermissionsAsync();
  const granted = Boolean(response.granted);
  const canAskAgain = response.canAskAgain ?? true;
  const status = normalizeStatus(response.status);

  return {
    type: 'camera',
    granted,
    status,
    canAskAgain,
    message: buildPermissionMessage('camera', granted, canAskAgain),
  };
}

/**
 * Solicita permiso de cámara al usuario (respaldado por `expo-image-picker` y `expo-camera`).
 */
export async function requestCameraPermission(): Promise<MediaPermissionResult> {
  const response = await ImagePicker.requestCameraPermissionsAsync();
  let granted = Boolean(response.granted);
  let canAskAgain = response.canAskAgain ?? true;
  let status = normalizeStatus(response.status);

  if (!granted && typeof Camera?.requestCameraPermissionsAsync === 'function') {
    const camResponse = await Camera.requestCameraPermissionsAsync();
    granted = Boolean(camResponse.granted);
    canAskAgain = camResponse.canAskAgain ?? canAskAgain;
    status = normalizeStatus(camResponse.status);
  }

  return {
    type: 'camera',
    granted,
    status,
    canAskAgain,
    message: buildPermissionMessage('camera', granted, canAskAgain),
  };
}

/**
 * Garantiza que el permiso de cámara esté concedido; lo solicita si aún puede preguntarse
 * o lanza `MediaPermissionError` si es rechazado.
 */
export async function ensureCameraPermission(): Promise<MediaPermissionResult> {
  const current = await checkCameraPermission();
  if (current.granted) {
    return current;
  }

  if (!current.canAskAgain) {
    throw new MediaPermissionError(current);
  }

  const requested = await requestCameraPermission();
  if (!requested.granted) {
    throw new MediaPermissionError(requested);
  }

  return requested;
}

/**
 * Consulta el estado actual del permiso de acceso a la galería/archivos multimedia.
 */
export async function checkMediaLibraryPermission(): Promise<MediaPermissionResult> {
  const response = await ImagePicker.getMediaLibraryPermissionsAsync();
  const granted = Boolean(response.granted);
  const canAskAgain = response.canAskAgain ?? true;
  const status = normalizeStatus(response.status);

  return {
    type: 'mediaLibrary',
    granted,
    status,
    canAskAgain,
    message: buildPermissionMessage('mediaLibrary', granted, canAskAgain),
  };
}

/**
 * Solicita permiso al usuario para acceder a la galería/archivos multimedia.
 */
export async function requestMediaLibraryPermission(): Promise<MediaPermissionResult> {
  const response = await ImagePicker.requestMediaLibraryPermissionsAsync();
  const granted = Boolean(response.granted);
  const canAskAgain = response.canAskAgain ?? true;
  const status = normalizeStatus(response.status);

  return {
    type: 'mediaLibrary',
    granted,
    status,
    canAskAgain,
    message: buildPermissionMessage('mediaLibrary', granted, canAskAgain),
  };
}

/**
 * Garantiza que el permiso de galería esté concedido; lo solicita si aún puede preguntarse
 * o lanza `MediaPermissionError` si es rechazado.
 */
export async function ensureMediaLibraryPermission(): Promise<MediaPermissionResult> {
  const current = await checkMediaLibraryPermission();
  if (current.granted) {
    return current;
  }

  if (!current.canAskAgain) {
    throw new MediaPermissionError(current);
  }

  const requested = await requestMediaLibraryPermission();
  if (!requested.granted) {
    throw new MediaPermissionError(requested);
  }

  return requested;
}
