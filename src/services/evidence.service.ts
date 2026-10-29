import { apiClient } from '@/services/api/client';
import { HTTP_STATUS } from '@/services/api/types';
import {
  ServiceError,
  normalizeEvidenceServiceError,
} from '@/services/service-error';
import type {
  Evidence,
  EvidenceContext,
  EvidenceDownloadUrl,
  SelectedMediaAsset,
} from '@/models/evidence.model';
import type {
  EvidenceDownloadUrlResponseDto,
  EvidenceResponseDto,
  ReactNativeFormDataFile,
  UploadEvidenceRequestDto,
} from '@/dto/evidence.dto';
import {
  buildEvidenceFormData,
  mapEvidenceDownloadUrlResponse,
  mapEvidenceListResponse,
  mapEvidenceResponse,
  toFormDataFilePart,
} from '@/mappers/evidence.mapper';
import { mockEvidences } from '@/mocks/evidences.mock';
import {
  useEvidenceUploadStore,
  type EvidenceUploadProgressCallback,
} from '@/stores/evidenceUploadStore';
import {
  captureMediaFromCamera,
  isAllowedEvidenceMimeType,
  pickMediaFromLibrary,
  type MediaPickerOptions,
} from '@/utils/media-picker';

export { ServiceError, normalizeEvidenceServiceError };

const USE_MOCKS = process.env.EXPO_PUBLIC_USE_MOCK_AUTH === 'true';

/**
 * Tamaño máximo de referencia en el adaptador simulado (50 MB para video, 15 MB para imagen).
 */
export const MAX_IMAGE_SIZE_BYTES = 15 * 1024 * 1024;
export const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024;

/**
 * Opciones adicionales durante la subida de una evidencia multimedia.
 */
export interface EvidenceUploadOptions {
  onProgress?: EvidenceUploadProgressCallback;
  requestId?: string;
}

/**
 * Parámetros para capturar o elegir desde el dispositivo y subir directamente a MS4.
 */
export interface PickAndUploadEvidenceParams {
  orden_id: number | string;
  contexto: EvidenceContext;
  presupuesto_id?: number | string | null;
  visible_cliente?: boolean | null;
}

const VALID_EVIDENCE_CONTEXTS: readonly EvidenceContext[] = [
  'diagnostico',
  'presupuesto',
  'reparacion',
  'resultado_final',
] as const;

function extractFileSize(
  archivo: UploadEvidenceRequestDto['archivo']
): number | undefined {
  if (typeof archivo === 'object' && archivo !== null) {
    if ('fileSize' in archivo && typeof archivo.fileSize === 'number') {
      return archivo.fileSize;
    }
    if ('size' in archivo && typeof (archivo as Blob).size === 'number') {
      return (archivo as Blob).size;
    }
  }
  return undefined;
}

/**
 * Contrato común para los adaptadores (Mock y Real HTTP) de Evidencia Multimedia (MS4).
 */
export interface EvidenceServiceAdapter {
  uploadEvidence(
    data: UploadEvidenceRequestDto,
    options?: EvidenceUploadOptions
  ): Promise<Evidence>;
  getEvidencesByOrder(orderId: string | number): Promise<Evidence[]>;
  getEvidenceById(id: string): Promise<Evidence>;
  getEvidenceDownloadUrl(id: string): Promise<EvidenceDownloadUrl>;
  resetMocks?(): void;
}

/**
 * Adaptador simulado (Mock) en memoria para subida, listado y descarga de evidencias multimedia.
 */
export class MockEvidenceAdapter implements EvidenceServiceAdapter {
  private evidences: Evidence[];
  private nextSeq = 10;
  private readonly delayMs: number;

  constructor(initialEvidences: Evidence[] = mockEvidences, delayMs = 0) {
    this.evidences = initialEvidences.map((e) => ({ ...e }));
    this.delayMs = delayMs;
  }

  private async simulateDelay(): Promise<void> {
    if (this.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    }
  }

  resetMocks(initialEvidences: Evidence[] = mockEvidences): void {
    this.evidences = initialEvidences.map((e) => ({ ...e }));
    this.nextSeq = 10;
  }

  async uploadEvidence(
    data: UploadEvidenceRequestDto,
    options?: EvidenceUploadOptions
  ): Promise<Evidence> {
    await this.simulateDelay();

    const orderIdStr = String(data.orden_id ?? '').trim();
    if (!orderIdStr || orderIdStr === '0') {
      throw new ServiceError({
        message: 'El identificador de la orden (orden_id) debe ser un entero positivo.',
        status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
        code: 'EVIDENCE_VALIDATION_ERROR',
        domain: 'evidences',
      });
    }

    if (!VALID_EVIDENCE_CONTEXTS.includes(data.contexto)) {
      throw new ServiceError({
        message: 'El contexto de la evidencia no es válido.',
        status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
        code: 'EVIDENCE_VALIDATION_ERROR',
        domain: 'evidences',
      });
    }

    const filePart = toFormDataFilePart(data.archivo) as ReactNativeFormDataFile;
    if (!filePart || ('uri' in filePart && !filePart.uri.trim())) {
      throw new ServiceError({
        message: 'No se pudo leer el archivo enviado.',
        status: HTTP_STATUS.BAD_REQUEST,
        code: 'EVIDENCE_BAD_FILE',
        domain: 'evidences',
      });
    }

    const mimeType = ('type' in filePart ? filePart.type : 'image/jpeg').toLowerCase();
    if (!isAllowedEvidenceMimeType(mimeType)) {
      throw new ServiceError({
        message: 'Formato no permitido: solo JPG, PNG, WEBP, MP4 y MOV.',
        status: HTTP_STATUS.UNSUPPORTED_MEDIA_TYPE,
        code: 'EVIDENCE_UNSUPPORTED_MEDIA',
        domain: 'evidences',
      });
    }

    const isVideo = mimeType.startsWith('video/');
    const maxBytes = isVideo ? MAX_VIDEO_SIZE_BYTES : MAX_IMAGE_SIZE_BYTES;
    const rawSize = extractFileSize(data.archivo) ?? 256000;

    if (rawSize <= 0) {
      throw new ServiceError({
        message: 'El archivo enviado está vacío o dañado.',
        status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
        code: 'EVIDENCE_VALIDATION_ERROR',
        domain: 'evidences',
      });
    }

    if (rawSize > maxBytes) {
      throw new ServiceError({
        message: 'El archivo supera el tamaño máximo de su tipo (foto o video).',
        status: HTTP_STATUS.PAYLOAD_TOO_LARGE,
        code: 'EVIDENCE_TOO_LARGE',
        domain: 'evidences',
      });
    }

    const store = useEvidenceUploadStore.getState();
    store.startUpload(orderIdStr, rawSize);

    const halfEvent = store.updateProgress(Math.floor(rawSize / 2), rawSize);
    options?.onProgress?.(halfEvent);

    const fullEvent = store.updateProgress(rawSize, rawSize);
    options?.onProgress?.(fullEvent);

    const seq = this.nextSeq++;
    const newEvidence: Evidence = {
      id: `550e8400-e29b-41d4-a716-4466554400${seq}`,
      orderId: orderIdStr,
      budgetId:
        data.presupuesto_id !== undefined && data.presupuesto_id !== null
          ? String(data.presupuesto_id)
          : null,
      context: data.contexto,
      fileType: isVideo ? 'video' : 'foto',
      visibleToClient: data.visible_cliente ?? true,
      status: 'confirmada',
      originalName: 'name' in filePart ? filePart.name : `evidencia_${seq}.jpg`,
      contentType: mimeType,
      sizeBytes: rawSize,
      createdAt: new Date().toISOString(),
    };

    this.evidences.unshift(newEvidence);
    store.completeUpload(newEvidence);

    return { ...newEvidence };
  }

  async getEvidencesByOrder(orderId: string | number): Promise<Evidence[]> {
    await this.simulateDelay();
    const orderIdStr = String(orderId ?? '').trim();
    if (!orderIdStr || orderIdStr === '0') {
      throw new ServiceError({
        message: 'Falta orden_id o no es un entero positivo.',
        status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
        code: 'EVIDENCE_VALIDATION_ERROR',
        domain: 'evidences',
      });
    }

    return this.evidences
      .filter((e) => e.orderId === orderIdStr)
      .map((e) => ({ ...e }));
  }

  async getEvidenceById(id: string): Promise<Evidence> {
    await this.simulateDelay();
    const targetId = String(id ?? '').trim();
    const found = this.evidences.find((e) => e.id === targetId);
    if (!found) {
      throw new ServiceError({
        message: 'Evidencia inexistente o fuera del alcance del solicitante.',
        status: HTTP_STATUS.NOT_FOUND,
        code: 'EVIDENCE_NOT_FOUND',
        domain: 'evidences',
      });
    }
    return { ...found };
  }

  async getEvidenceDownloadUrl(id: string): Promise<EvidenceDownloadUrl> {
    const found = await this.getEvidenceById(id);
    return {
      url: `https://storage.tallerconect.vercel.app/evidencias/${found.id}?X-Amz-Expires=300`,
      expiresInSeconds: 300,
    };
  }
}

/**
 * Adaptador HTTP real conectado a la API Gateway (`/evidencias` en MS4).
 */
export class RealEvidenceAdapter implements EvidenceServiceAdapter {
  async uploadEvidence(
    data: UploadEvidenceRequestDto,
    options?: EvidenceUploadOptions
  ): Promise<Evidence> {
    const formData = buildEvidenceFormData(data);
    const knownSize = extractFileSize(data.archivo) ?? null;
    const store = useEvidenceUploadStore.getState();

    store.startUpload(data.orden_id, knownSize);

    const headers: Record<string, string> = {
      'Content-Type': 'multipart/form-data',
    };
    if (options?.requestId) {
      headers['X-Request-ID'] = options.requestId;
    }

    const response = await apiClient.post<EvidenceResponseDto>(
      '/evidencias',
      formData,
      {
        headers,
        onUploadProgress: (progressEvent) => {
          const loaded = progressEvent.loaded ?? 0;
          const total = progressEvent.total ?? knownSize ?? undefined;
          const event = useEvidenceUploadStore
            .getState()
            .updateProgress(loaded, total);
          options?.onProgress?.(event);
        },
      }
    );

    const mapped = mapEvidenceResponse(response.data);
    useEvidenceUploadStore.getState().completeUpload(mapped);
    return mapped;
  }

  async getEvidencesByOrder(orderId: string | number): Promise<Evidence[]> {
    const numericOrderId = Number(orderId);
    const resolvedOrderId = Number.isNaN(numericOrderId)
      ? orderId
      : numericOrderId;

    const response = await apiClient.get<EvidenceResponseDto[]>('/evidencias', {
      params: { orden_id: resolvedOrderId },
    });
    return mapEvidenceListResponse(response.data);
  }

  async getEvidenceById(id: string): Promise<Evidence> {
    const response = await apiClient.get<EvidenceResponseDto>(
      `/evidencias/${encodeURIComponent(String(id))}`
    );
    return mapEvidenceResponse(response.data);
  }

  async getEvidenceDownloadUrl(id: string): Promise<EvidenceDownloadUrl> {
    const response = await apiClient.get<EvidenceDownloadUrlResponseDto>(
      `/evidencias/${encodeURIComponent(String(id))}/descarga`
    );
    return mapEvidenceDownloadUrlResponse(response.data);
  }
}

/**
 * Servicio de Evidencia Multimedia con soporte para `multipart/form-data`,
 * seguimiento de progreso de carga, integración con cámara/galería y adaptador Mock/Real.
 */
export class EvidencesService {
  private adapter: EvidenceServiceAdapter;
  private readonly mockAdapter: MockEvidenceAdapter;
  private readonly realAdapter: RealEvidenceAdapter;

  constructor(customAdapter?: EvidenceServiceAdapter) {
    this.mockAdapter = new MockEvidenceAdapter(mockEvidences, 0);
    this.realAdapter = new RealEvidenceAdapter();
    this.adapter =
      customAdapter ?? (USE_MOCKS ? this.mockAdapter : this.realAdapter);
  }

  /**
   * Permite inyectar un adaptador personalizado.
   */
  setAdapter(adapter: EvidenceServiceAdapter): void {
    this.adapter = adapter;
  }

  /**
   * Activa el adaptador simulado en memoria.
   */
  useMockAdapter(): MockEvidenceAdapter {
    this.adapter = this.mockAdapter;
    return this.mockAdapter;
  }

  /**
   * Activa el adaptador HTTP real conectado a `apiClient`.
   */
  useRealAdapter(): RealEvidenceAdapter {
    this.adapter = this.realAdapter;
    return this.realAdapter;
  }

  /**
   * Restaura el estado inicial de las evidencias simuladas y del store de progreso.
   */
  resetMocks(): void {
    this.mockAdapter.resetMocks(mockEvidences);
    useEvidenceUploadStore.getState().resetUploadState();
  }

  /**
   * Sube una evidencia multimedia (`multipart/form-data`) asociada a una orden de trabajo.
   * Ruta Gateway: POST /api/evidencias
   */
  async uploadEvidence(
    data: UploadEvidenceRequestDto,
    options?: EvidenceUploadOptions
  ): Promise<Evidence> {
    try {
      return await this.adapter.uploadEvidence(data, options);
    } catch (error: unknown) {
      const normalized = normalizeEvidenceServiceError(
        error,
        'No fue posible subir la evidencia multimedia.'
      );
      useEvidenceUploadStore.getState().failUpload(normalized.message);
      throw normalized;
    }
  }

  /**
   * Captura una foto o video con la cámara del dispositivo (gestionando permisos) y lo sube a MS4.
   * Devuelve `null` si el usuario cancela la captura.
   */
  async captureAndUploadEvidence(
    params: PickAndUploadEvidenceParams,
    options?: EvidenceUploadOptions & MediaPickerOptions
  ): Promise<Evidence | null> {
    useEvidenceUploadStore.getState().startPreparing(params.orden_id);
    try {
      const asset: SelectedMediaAsset | null = await captureMediaFromCamera(
        options
      );
      if (!asset) {
        useEvidenceUploadStore.getState().resetUploadState();
        return null;
      }

      return await this.uploadEvidence(
        {
          archivo: asset,
          orden_id: params.orden_id,
          contexto: params.contexto,
          presupuesto_id: params.presupuesto_id,
          visible_cliente: params.visible_cliente,
        },
        options
      );
    } catch (error: unknown) {
      const normalized = normalizeEvidenceServiceError(
        error,
        'No fue posible capturar o subir la evidencia desde la cámara.'
      );
      useEvidenceUploadStore.getState().failUpload(normalized.message);
      throw normalized;
    }
  }

  /**
   * Selecciona una foto o video de la galería del dispositivo (gestionando permisos) y lo sube a MS4.
   * Devuelve `null` si el usuario cancela la selección.
   */
  async pickAndUploadEvidence(
    params: PickAndUploadEvidenceParams,
    options?: EvidenceUploadOptions & MediaPickerOptions
  ): Promise<Evidence | null> {
    useEvidenceUploadStore.getState().startPreparing(params.orden_id);
    try {
      const asset: SelectedMediaAsset | null = await pickMediaFromLibrary(
        options
      );
      if (!asset) {
        useEvidenceUploadStore.getState().resetUploadState();
        return null;
      }

      return await this.uploadEvidence(
        {
          archivo: asset,
          orden_id: params.orden_id,
          contexto: params.contexto,
          presupuesto_id: params.presupuesto_id,
          visible_cliente: params.visible_cliente,
        },
        options
      );
    } catch (error: unknown) {
      const normalized = normalizeEvidenceServiceError(
        error,
        'No fue posible seleccionar o subir la evidencia desde la galería.'
      );
      useEvidenceUploadStore.getState().failUpload(normalized.message);
      throw normalized;
    }
  }

  /**
   * Lista las evidencias visibles asociadas a una orden de trabajo.
   * Ruta Gateway: GET /api/evidencias?orden_id={orden_id}
   */
  async getEvidencesByOrder(orderId: string | number): Promise<Evidence[]> {
    try {
      return await this.adapter.getEvidencesByOrder(orderId);
    } catch (error: unknown) {
      throw normalizeEvidenceServiceError(
        error,
        'No fue posible cargar las evidencias de la orden.'
      );
    }
  }

  /**
   * Obtiene los metadatos de una evidencia por su UUID.
   * Ruta Gateway: GET /api/evidencias/{evidencia_id}
   */
  async getEvidenceById(id: string): Promise<Evidence> {
    try {
      return await this.adapter.getEvidenceById(id);
    } catch (error: unknown) {
      throw normalizeEvidenceServiceError(
        error,
        'No fue posible cargar el detalle de la evidencia.'
      );
    }
  }

  /**
   * Obtiene una URL prefirmada de corta duración para visualizar o descargar la evidencia.
   * Ruta Gateway: GET /api/evidencias/{evidencia_id}/descarga
   */
  async getEvidenceDownloadUrl(id: string): Promise<EvidenceDownloadUrl> {
    try {
      return await this.adapter.getEvidenceDownloadUrl(id);
    } catch (error: unknown) {
      throw normalizeEvidenceServiceError(
        error,
        'No fue posible obtener el enlace de descarga de la evidencia.'
      );
    }
  }
}

export const evidencesService = new EvidencesService();
export const evidenceService = evidencesService;
export { EvidencesService as EvidenceService };
