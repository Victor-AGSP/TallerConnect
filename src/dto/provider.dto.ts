import type { PartResponseDto } from './part.dto';

/**
 * Proveedor devuelto por la API Gateway (`ProveedorSalida` del contrato MS3).
 */
export interface ProviderResponseDto {
  proveedor_id: number;
  nombre: string;
  contacto: string;
  cantidad_repuestos: number;
}

/**
 * Proveedor con sus repuestos (`ProveedorDetalle` del contrato MS3).
 * Respuesta de GET /api/proveedores/{proveedor_id}.
 */
export interface ProviderDetailResponseDto extends ProviderResponseDto {
  repuestos: PartResponseDto[];
}

/**
 * Página de proveedores (`PaginaProveedores` del contrato MS3).
 * Respuesta de GET /api/proveedores.
 */
export interface ProviderPageResponseDto {
  total: number;
  desde: number;
  limite: number;
  proveedores: ProviderResponseDto[];
}