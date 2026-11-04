/**
 * Tipo de distribuidor del proveedor en el contrato MS3.
 */
export type PartDistributorType = 'oficial' | 'generico';

/**
 * Criterio de ordenamiento para `GET /api/repuestos` en el contrato MS3.
 */
export type PartSortOrder = 'nombre' | 'stock_asc' | 'stock_desc';

/**
 * Repuesto devuelto por la API Gateway (`RepuestoSalida` del contrato MS3).
 * Respuesta de GET /api/repuestos/{repuesto_id}.
 */
export interface PartResponseDto {
  repuesto_id: number;
  nombre: string;
  proveedor_id: number;
  proveedor_nombre: string;
  proveedor_tipo_distribuidor?: PartDistributorType;
  stock: number;
  umbral_particular: number | null;
  umbral_efectivo: number | null;
  bajo_umbral: boolean;
}

/**
 * Página de repuestos (`PaginaRepuestos` del contrato MS3).
 * Respuesta de GET /api/repuestos.
 */
export interface PartPageResponseDto {
  total: number;
  desde: number;
  limite: number;
  umbral_general: number | null;
  repuestos: PartResponseDto[];
}

/**
 * Parámetros de consulta de `GET /api/repuestos` definidos por el contrato MS3.
 */
export interface PartQueryParamsDto {
  proveedor_id?: number | string | null;
  providerId?: string;
  q?: string | null;
  bajo_umbral?: boolean;
  belowThreshold?: boolean;
  con_stock?: boolean | null;
  inStock?: boolean;
  ordenar?: PartSortOrder;
  desde?: number;
  limite?: number;
  skip?: number;
  limit?: number;
}

/**
 * Cuerpo para registrar un repuesto (`RepuestoCrear` en `POST /api/repuestos`).
 */
export interface CreatePartRequestDto {
  proveedor_id: number | string;
  nombre: string;
  stock_inicial?: number;
  umbral_particular?: number | null;
}

/**
 * Cuerpo para actualizar parcialmente un repuesto (`RepuestoActualizar` en `PATCH /api/repuestos/{repuesto_id}`).
 */
export interface UpdatePartRequestDto {
  nombre?: string | null;
  proveedor_id?: number | string | null;
  umbral_particular?: number | null;
  observacion?: string | null;
}
