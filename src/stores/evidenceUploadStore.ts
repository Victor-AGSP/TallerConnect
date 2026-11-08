import { create } from 'zustand';
import type { Evidence } from '@/models/evidence.model';

/**
 * Estados del ciclo de vida de carga de una evidencia multimedia.
 */
export type EvidenceUploadStatus =
  | 'idle'
  | 'preparing'
  | 'uploading'
  | 'success'
  | 'error';

/**
 * Evento de progreso normalizado durante el envío `multipart/form-data`.
 */
export interface EvidenceUploadProgressEvent {
  loaded: number;
  total?: number;
  percentage: number;
}

/**
 * Callback invocado a medida que avanza el envío del archivo.
 */
export type EvidenceUploadProgressCallback = (
  progress: EvidenceUploadProgressEvent
) => void;

/**
 * Estado reactivo en Zustand para monitorear el progreso de carga de evidencias.
 */
export interface EvidenceUploadState {
  status: EvidenceUploadStatus;
  progress: number;
  bytesTransferred: number;
  totalBytes: number | null;
  activeOrderId: string | null;
  errorMessage: string | null;
  lastUploadedEvidence: Evidence | null;

  startPreparing: (orderId?: string | number) => void;
  startUpload: (orderId?: string | number, totalBytes?: number | null) => void;
  updateProgress: (loaded: number, total?: number) => EvidenceUploadProgressEvent;
  completeUpload: (evidence: Evidence) => void;
  failUpload: (message: string) => void;
  resetUploadState: () => void;
}

const initialState = {
  status: 'idle' as EvidenceUploadStatus,
  progress: 0,
  bytesTransferred: 0,
  totalBytes: null as number | null,
  activeOrderId: null as string | null,
  errorMessage: null as string | null,
  lastUploadedEvidence: null as Evidence | null,
};

/**
 * Store global de progreso y estado de carga durante el envío de evidencias hacia la API Gateway.
 */
export const useEvidenceUploadStore = create<EvidenceUploadState>((set, get) => ({
  ...initialState,

  startPreparing: (orderId) => {
    set({
      status: 'preparing',
      progress: 0,
      bytesTransferred: 0,
      totalBytes: null,
      activeOrderId: orderId !== undefined ? String(orderId) : null,
      errorMessage: null,
    });
  },

  startUpload: (orderId, totalBytes = null) => {
    set({
      status: 'uploading',
      progress: 0,
      bytesTransferred: 0,
      totalBytes: totalBytes ?? null,
      activeOrderId:
        orderId !== undefined ? String(orderId) : get().activeOrderId,
      errorMessage: null,
    });
  },

  updateProgress: (loaded: number, total?: number) => {
    const safeLoaded = Math.max(0, loaded);
    const resolvedTotal =
      total && total > 0 ? total : get().totalBytes ?? undefined;
    const rawPercent =
      resolvedTotal && resolvedTotal > 0
        ? Math.round((safeLoaded / resolvedTotal) * 100)
        : 0;
    const percentage = Math.min(100, Math.max(0, rawPercent));

    set({
      status: 'uploading',
      bytesTransferred: safeLoaded,
      totalBytes: resolvedTotal ?? null,
      progress: percentage,
    });

    return {
      loaded: safeLoaded,
      total: resolvedTotal,
      percentage,
    };
  },

  completeUpload: (evidence: Evidence) => {
    set({
      status: 'success',
      progress: 100,
      bytesTransferred: evidence.sizeBytes,
      totalBytes: evidence.sizeBytes,
      errorMessage: null,
      lastUploadedEvidence: evidence,
    });
  },

  failUpload: (message: string) => {
    set({
      status: 'error',
      errorMessage: message,
    });
  },

  resetUploadState: () => {
    set({ ...initialState });
  },
}));
