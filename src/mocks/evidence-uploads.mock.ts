import { EVIDENCE_MAX_SIZE_BYTES } from '@/constants/evidence';
import { budgetDetailPayloads } from '@/mocks/payloads/budget.payload';
import { orderResponsePayloads } from '@/mocks/payloads/order.payload';
import type {
  EvidenceUploadRequest,
  SelectedMediaAsset,
} from '@/models/evidence.model';

export type MediaAssetCase =
  | 'fotoJpeg'
  | 'videoMp4'
  | 'formatoNoPermitido'
  | 'fotoSobreLimite'
  | 'videoSobreLimite'
  | 'archivoVacio'
  | 'sinTamano';

export type EvidenceUploadCase =
  | 'diagnostico'
  | 'presupuesto'
  | 'reparacion'
  | 'resultadoFinal';

export type InvalidEvidenceMetadataCase =
  | 'ordenSimulada'
  | 'contextoInvalido'
  | 'presupuestoVacio'
  | 'presupuestoNoNumerico';

/**
 * Archivos locales simulados, con la forma que entrega `media-picker.ts` al capturar o seleccionar.
 * Los dos primeros cumplen las restricciones de `src/constants/evidence.ts`; el resto cubre cada caso inválido.
 */
export const mockMediaAssets: Record<MediaAssetCase, SelectedMediaAsset> = {
  fotoJpeg: {
    uri: 'file:///data/cache/ImagePicker/bujias_desgastadas.jpg',
    fileName: 'bujias_desgastadas.jpg',
    mimeType: 'image/jpeg',
    fileSize: 482310,
    mediaType: 'image',
    width: 1920,
    height: 1080,
    duration: null,
  },
  videoMp4: {
    uri: 'file:///data/cache/ImagePicker/ajuste_correa_distribucion.mp4',
    fileName: 'ajuste_correa_distribucion.mp4',
    mimeType: 'video/mp4',
    fileSize: 4250800,
    mediaType: 'video',
    width: 1280,
    height: 720,
    duration: 18500,
  },
  formatoNoPermitido: {
    uri: 'file:///data/cache/ImagePicker/tablero.heic',
    fileName: 'tablero.heic',
    mimeType: 'image/heic',
    fileSize: 350000,
    mediaType: 'image',
  },
  fotoSobreLimite: {
    uri: 'file:///data/cache/ImagePicker/motor_alta_resolucion.jpg',
    fileName: 'motor_alta_resolucion.jpg',
    mimeType: 'image/jpeg',
    fileSize: EVIDENCE_MAX_SIZE_BYTES.image + 1,
    mediaType: 'image',
  },
  videoSobreLimite: {
    uri: 'file:///data/cache/ImagePicker/prueba_ruta_completa.mov',
    fileName: 'prueba_ruta_completa.mov',
    mimeType: 'video/quicktime',
    fileSize: EVIDENCE_MAX_SIZE_BYTES.video + 1,
    mediaType: 'video',
  },
  archivoVacio: {
    uri: 'file:///data/cache/ImagePicker/captura_fallida.jpg',
    fileName: 'captura_fallida.jpg',
    mimeType: 'image/jpeg',
    fileSize: 0,
    mediaType: 'image',
  },
  sinTamano: {
    uri: 'file:///data/cache/ImagePicker/filtro_aceite.png',
    fileName: 'filtro_aceite.png',
    mimeType: 'image/png',
    mediaType: 'image',
  },
};

/**
 * Solicitudes de subida válidas, una por cada valor de `ContextoEvidencia`.
 * Usan los identificadores numéricos de los payloads de órdenes y presupuestos, que el contrato admite;
 * los de `mockWorkOrders` (como `'ot-00124'`) no pasan el mapeo a multipart.
 */
export const mockEvidenceUploadRequests: Record<EvidenceUploadCase, EvidenceUploadRequest> = {
  diagnostico: {
    file: mockMediaAssets.fotoJpeg,
    metadata: {
      orderId: String(orderResponsePayloads.esperando_diagnostico.orden_id),
      context: 'diagnostico',
    },
  },
  presupuesto: {
    file: mockMediaAssets.fotoJpeg,
    metadata: {
      orderId: String(orderResponsePayloads.esperando_aprobacion_presupuesto.orden_id),
      context: 'presupuesto',
      budgetId: String(budgetDetailPayloads.enviado.presupuesto_id),
      visibleToClient: true,
    },
  },
  reparacion: {
    file: mockMediaAssets.videoMp4,
    metadata: {
      orderId: String(orderResponsePayloads.en_reparacion.orden_id),
      context: 'reparacion',
      budgetId: String(budgetDetailPayloads.aprobadoConModificacion.presupuesto_id),
      visibleToClient: false,
    },
  },
  resultadoFinal: {
    file: mockMediaAssets.fotoJpeg,
    metadata: {
      orderId: String(orderResponsePayloads.listo_para_entrega.orden_id),
      context: 'resultado_final',
      budgetId: null,
      visibleToClient: null,
    },
  },
};

/**
 * Metadatos inválidos para probar el esquema y el mapeo de evidencias.
 * `ordenSimulada` y `presupuestoNoNumerico` pasan `evidenceUploadMetadataSchema` (texto no vacío),
 * pero `mapEvidenceUploadRequest` los rechaza porque no representan enteros positivos.
 */
export const mockInvalidEvidenceUploadMetadata: Record<
  InvalidEvidenceMetadataCase,
  Record<string, unknown>
> = {
  ordenSimulada: { orderId: 'ot-00124', context: 'diagnostico' },
  contextoInvalido: {
    orderId: String(orderResponsePayloads.esperando_diagnostico.orden_id),
    context: 'entrega',
  },
  presupuestoVacio: {
    orderId: String(orderResponsePayloads.esperando_aprobacion_presupuesto.orden_id),
    context: 'presupuesto',
    budgetId: '',
  },
  presupuestoNoNumerico: {
    orderId: String(orderResponsePayloads.esperando_aprobacion_presupuesto.orden_id),
    context: 'presupuesto',
    budgetId: 'presupuesto-2',
  },
};