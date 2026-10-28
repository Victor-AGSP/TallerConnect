import type {
  EvidenceContext,
  SelectedMediaAsset,
} from '@/models/evidence.model';

/**
 *Descriptor nativo de archivo para `FormData` en React Native / Expo.
 */
export interface ReactNativeFormDataFile {
  uri: string;
  name: string;
  type: string;
}

/**
 * Evidencia devuelta por la API Gateway (`EvidenciaLeida` del contrato MS4).
 */
export interface EvidenceResponseDto {
  evidencia_id: string;
  orden_id: number;
  presupuesto_id: number | null;
  contexto: string;
  tipo_archivo: string;
  visible_cliente: boolean;
  estado: string;
  nombre_original: string;
  content_type: string;
  tamano_bytes: number;
  creada_en: string;
}

/**
 * URL prefirmada de descarga devuelta por la API Gateway (`UrlDescarga` del contrato MS4).
 */
export interface EvidenceDownloadUrlResponseDto {
  url: string;
  expira_en: number;
}

/**
 * Parámetros de consulta de `GET /api/evidencias` en el contrato MS4.
 */
export interface EvidenceQueryParamsDto {
  orden_id: number | string;
}

/**
 * Datos para construir la solicitud `multipart/form-data` de `POST /api/evidencias` (`Body_subir_evidencias_post` en MS4).
 */
export interface UploadEvidenceRequestDto {
  archivo: SelectedMediaAsset | ReactNativeFormDataFile | Blob;
  orden_id: number | string;
  contexto: EvidenceContext;
  presupuesto_id?: number | string | null;
  visible_cliente?: boolean | null;
}
