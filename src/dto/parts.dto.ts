/**
 * DTO de repuestos y proveedores del MS3, tal como los publica su contrato
 * OpenAPI (`/ms3/openapi.json`). La app los consume a través de la API
 * Gateway (`/api/repuestos`, `/api/proveedores`).
 */

/** `RepuestoSalida`. */
export interface SparePartResponseDto {
  repuesto_id: number;
  nombre: string;
  proveedor_id: number;
  proveedor_nombre: string;
  stock: number;
  umbral_particular: number | null;
  umbral_efectivo: number | null;
  bajo_umbral: boolean;
}

/** `PaginaRepuestos` (GET /repuestos). */
export interface SparePartsPageDto {
  total: number;
  desde: number;
  limite: number;
  umbral_general: number | null;
  repuestos: SparePartResponseDto[];
}

/** `ProveedorSalida`. */
export interface SupplierResponseDto {
  proveedor_id: number;
  nombre: string;
  contacto: string;
  cantidad_repuestos: number;
}

/** `ProveedorDetalle` (GET /proveedores/{proveedor_id}). */
export interface SupplierDetailResponseDto extends SupplierResponseDto {
  repuestos: SparePartResponseDto[];
}

/** `PaginaProveedores` (GET /proveedores). */
export interface SuppliersPageDto {
  total: number;
  desde: number;
  limite: number;
  proveedores: SupplierResponseDto[];
}
