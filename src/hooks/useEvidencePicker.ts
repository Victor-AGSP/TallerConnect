import { useCallback, useEffect, useRef, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';

import type { EvidenceFile, EvidenceSource } from '@/models/evidence.model';
import { selectionFromPickerResult } from '@/utils/evidence-file';

/** Opciones comunes: una sola fotografía, sin EXIF (puede incluir ubicación). */
const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsMultipleSelection: false,
  allowsEditing: false,
  exif: false,
  quality: 0.8,
};

export const CAMERA_DENIED_MESSAGE =
  'No se concedió acceso a la cámara. Puedes seleccionar una fotografía desde la galería.';

export interface EvidencePickerResult {
  /** Fotografía validada para la orden actual, o `null`. */
  file: EvidenceFile | null;
  /** Motivo por el que no se pudo seleccionar (archivo inválido, permiso, error nativo). */
  message: string | null;
  /** El selector del sistema está abierto. */
  isPicking: boolean;
  takePhoto: () => Promise<void>;
  pickFromLibrary: () => Promise<void>;
  clear: () => void;
}

interface SelectionState {
  orderId: string;
  file: EvidenceFile | null;
  message: string | null;
}

/**
 * Selección local de una fotografía para una orden concreta. No sube nada:
 * la carga es una acción explícita posterior.
 *
 * La selección queda ligada a `orderId`: si la orden cambia, la selección
 * anterior deja de exponerse y los resultados asíncronos que lleguen tarde
 * (selector abierto mientras se cambió de orden) se descartan.
 */
export function useEvidencePicker(orderId: string): EvidencePickerResult {
  const [state, setState] = useState<SelectionState>({
    orderId,
    file: null,
    message: null,
  });
  const [isPicking, setIsPicking] = useState(false);

  const pickingRef = useRef(false);
  const orderIdRef = useRef(orderId);
  const isMountedRef = useRef(true);

  useEffect(() => {
    orderIdRef.current = orderId;
  }, [orderId]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const run = useCallback(
    async (source: EvidenceSource) => {
      // Evita abrir dos selectores a la vez (doble pulsación).
      if (pickingRef.current) return;
      pickingRef.current = true;
      setIsPicking(true);

      const requestedFor = orderId;
      const isCurrent = () =>
        isMountedRef.current && orderIdRef.current === requestedFor;

      // Conserva una selección válida anterior de la misma orden.
      const update = (patch: Partial<Omit<SelectionState, 'orderId'>>) =>
        setState((prev) => ({
          orderId: requestedFor,
          file: prev.orderId === requestedFor ? prev.file : null,
          message: null,
          ...patch,
        }));

      try {
        if (source === 'camera') {
          const permission = await ImagePicker.requestCameraPermissionsAsync();
          if (!isCurrent()) return;
          if (!permission.granted) {
            update({ message: CAMERA_DENIED_MESSAGE });
            return;
          }
        }

        let result: ImagePicker.ImagePickerResult;
        try {
          result =
            source === 'camera'
              ? await ImagePicker.launchCameraAsync(PICKER_OPTIONS)
              : await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
        } catch {
          if (isCurrent()) {
            update({
              message:
                source === 'camera'
                  ? 'No se pudo abrir la cámara. Intenta nuevamente o usa la galería.'
                  : 'No se pudo abrir la galería. Intenta nuevamente.',
            });
          }
          return;
        }

        const selection = await selectionFromPickerResult(result, source);
        if (!isCurrent()) return;

        if (selection.status === 'selected') {
          update({ file: selection.file });
        } else if (selection.status === 'invalid') {
          update({ message: selection.message });
        } else {
          update({});
        }
      } catch {
        if (isCurrent()) {
          update({ message: 'No se pudo obtener la fotografía. Intenta nuevamente.' });
        }
      } finally {
        pickingRef.current = false;
        if (isMountedRef.current) setIsPicking(false);
      }
    },
    [orderId],
  );

  const takePhoto = useCallback(() => run('camera'), [run]);
  const pickFromLibrary = useCallback(() => run('library'), [run]);
  const clear = useCallback(
    () => setState({ orderId, file: null, message: null }),
    [orderId],
  );

  const isSameOrder = state.orderId === orderId;

  return {
    file: isSameOrder ? state.file : null,
    message: isSameOrder ? state.message : null,
    isPicking,
    takePhoto,
    pickFromLibrary,
    clear,
  };
}
