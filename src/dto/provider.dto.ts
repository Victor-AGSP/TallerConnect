import type { PartResponseDto } from './part.dto';

/**
 * Tipo de distribuidor del proveedor en el contrato MS3 (`oficial` o `generico`).
 */
export type ProviderDistributorType = 'oficial' | 'generico';

/**
 * Proveedor devuelto por la API Gateway (`ProveedorSalida` del contrato MS3).
 */
export interface ProviderResponseDto {
  proveedor_id: number;
  nombre: string;
  contacto: string;
  tipo_distribuidor?: ProviderDistributorType;
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

/**
 * Parámetros de consulta de `GET /api/proveedores` definidos por el contrato MS3.
 */
export interface ProviderQueryParamsDto {
  q?: string | null;
  con_repuestos?: boolean | null;
  hasParts?: boolean;
  tipo_distribuidor?: ProviderDistributorType | null;
  desde?: number;
  limite?: number;
  skip?: number;
  limit?: number;
}

/**
 * Cuerpo para registrar un proveedor (`ProveedorCrear` en `POST /api/proveedores`).
 */
export interface CreateProviderRequestDto {
  nombre: string;
  contacto: string;
  tipo_distribuidor?: ProviderDistributorType;
}

/**
 * Cuerpo para actualizar parcialmente un proveedor (`ProveedorActualizar` en `PATCH /api/proveedores/{proveedor_id}`).
 */
export interface UpdateProviderRequestDto {
  nombre?: string | null;
  contacto?: string | null;
  tipo_distribuidor?: ProviderDistributorType | null;
}
