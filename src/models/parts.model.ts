/**
 * Repuesto del inventario del taller (MS3).
 */
export interface SparePart {
  id: string;
  name: string;
  supplierId: string;
  supplierName: string;
  stock: number;

  /** Umbral propio del repuesto; `null` si usa el umbral general. */
  ownThreshold: number | null;

  /** Umbral aplicado; `null` si no hay umbral configurado. */
  effectiveThreshold: number | null;

  belowThreshold: boolean;
}

/**
 * Proveedor de repuestos (MS3).
 */
export interface Supplier {
  id: string;
  name: string;
  contact: string;
  partsCount: number;
}

/**
 * Proveedor con los repuestos que suministra.
 */
export interface SupplierDetail extends Supplier {
  parts: SparePart[];
}

/**
 * Página de resultados de un listado paginado del MS3.
 */
export interface PagedList<T> {
  items: T[];

  /** Total de registros en el servidor (puede superar `items.length`). */
  total: number;
}
