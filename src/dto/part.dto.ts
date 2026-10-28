/**
 * Repuesto devuelto por la API Gateway (`RepuestoSalida` del contrato MS3).
 * Respuesta de GET /api/repuestos/{repuesto_id}.
 */
export interface PartResponseDto {
  repuesto_id: number;
  nombre: string;
  proveedor_id: number;
  proveedor_nombre: string;
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