/**
 * Repuesto del catálogo, asociado a un proveedor, con su stock
 * y el umbral que determina la alerta de stock bajo.
 */
export interface Part {
  id: string;
  name: string;
  providerId: string;
  providerName: string;
  stock: number;
  customThreshold: number | null;
  effectiveThreshold: number | null;
  belowThreshold: boolean;
}