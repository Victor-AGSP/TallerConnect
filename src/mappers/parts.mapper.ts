import type {
  SparePartResponseDto,
  SparePartsPageDto,
  SupplierDetailResponseDto,
  SupplierResponseDto,
  SuppliersPageDto,
} from '@/dto/parts.dto';
import type {
  PagedList,
  SparePart,
  Supplier,
  SupplierDetail,
} from '@/models/parts.model';

/** Mensaje para respuestas que no cumplen el contrato del MS3. */
export const INVALID_INVENTORY_RESPONSE =
  'La respuesta del servicio de inventario no es válida.';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Exige el identificador entero del recurso: sin él no se puede representar
 * ni consultar después, de modo que la respuesta se rechaza en lugar de
 * mostrar un registro vacío.
 */
function requireId(value: unknown): string {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new Error(INVALID_INVENTORY_RESPONSE);
  }
  return String(value);
}

function requireArray(value: unknown): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(INVALID_INVENTORY_RESPONSE);
  }
  return value;
}

function toNumberOrNull(value: unknown): number | null {
  return typeof value === 'number' ? value : null;
}

/**
 * Mapea un `RepuestoSalida` al modelo SparePart.
 */
export function mapSparePartResponse(dto: SparePartResponseDto): SparePart {
  if (!isObject(dto)) throw new Error(INVALID_INVENTORY_RESPONSE);

  return {
    id: requireId(dto.repuesto_id),
    name: dto.nombre ?? '',
    supplierId: dto.proveedor_id != null ? String(dto.proveedor_id) : '',
    supplierName: dto.proveedor_nombre ?? '',
    stock: typeof dto.stock === 'number' ? dto.stock : 0,
    ownThreshold: toNumberOrNull(dto.umbral_particular),
    effectiveThreshold: toNumberOrNull(dto.umbral_efectivo),
    belowThreshold: dto.bajo_umbral === true,
  };
}

/**
 * Mapea un `ProveedorSalida` al modelo Supplier.
 */
export function mapSupplierResponse(dto: SupplierResponseDto): Supplier {
  if (!isObject(dto)) throw new Error(INVALID_INVENTORY_RESPONSE);

  return {
    id: requireId(dto.proveedor_id),
    name: dto.nombre ?? '',
    contact: dto.contacto ?? '',
    partsCount:
      typeof dto.cantidad_repuestos === 'number' ? dto.cantidad_repuestos : 0,
  };
}

/**
 * Mapea un `ProveedorDetalle` con sus repuestos.
 */
export function mapSupplierDetailResponse(
  dto: SupplierDetailResponseDto,
): SupplierDetail {
  const supplier = mapSupplierResponse(dto);

  return {
    ...supplier,
    parts: requireArray(dto.repuestos).map((item) =>
      mapSparePartResponse(item as SparePartResponseDto),
    ),
  };
}

/**
 * Mapea una `PaginaRepuestos`.
 */
export function mapSparePartsPage(
  dto: SparePartsPageDto,
): PagedList<SparePart> {
  if (!isObject(dto)) throw new Error(INVALID_INVENTORY_RESPONSE);

  const items = requireArray(dto.repuestos).map((item) =>
    mapSparePartResponse(item as SparePartResponseDto),
  );

  return {
    items,
    total: typeof dto.total === 'number' ? dto.total : items.length,
  };
}

/**
 * Mapea una `PaginaProveedores`.
 */
export function mapSuppliersPage(
  dto: SuppliersPageDto,
): PagedList<Supplier> {
  if (!isObject(dto)) throw new Error(INVALID_INVENTORY_RESPONSE);

  const items = requireArray(dto.proveedores).map((item) =>
    mapSupplierResponse(item as SupplierResponseDto),
  );

  return {
    items,
    total: typeof dto.total === 'number' ? dto.total : items.length,
  };
}
