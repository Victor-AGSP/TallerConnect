import type { Part } from './part.model';

/**
 * Proveedor (distribuidor) de repuestos.
 */
export interface Provider {
  id: string;
  name: string;
  contact: string;
  partCount: number;
}

/**
 * Proveedor con el detalle de sus repuestos.
 */
export interface ProviderDetail extends Provider {
  parts: Part[];
}