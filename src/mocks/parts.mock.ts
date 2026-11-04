import type { SparePart, Supplier } from '@/models/parts.model';

import { mapPartResponse } from '@/mappers/part.mapper';
import {
  partPagePayload,
  partResponsePayloads,
} from '@/mocks/payloads/part.payload';
import type { Part } from '@/models/part.model';

/**
 * Datos locales de repuestos y proveedores para el modo sin backend
 * (`EXPO_PUBLIC_USE_MOCK_AUTH=true`). No provienen del MS3.
 */
export const mockSuppliers: Supplier[] = [
  {
    id: '1',
    name: 'Repuestos del Sur',
    contact: 'ventas@repuestosdelsur.cl',
    partsCount: 2,
  },
  {
    id: '2',
    name: 'Frenos Chile',
    contact: '+56 9 1234 5678',
    partsCount: 1,
  },
];

export const mockSpareParts: SparePart[] = [
  {
    id: '1',
    name: 'Filtro de aceite',
    supplierId: '1',
    supplierName: 'Repuestos del Sur',
    stock: 12,
    ownThreshold: null,
    effectiveThreshold: 5,
    belowThreshold: false,
  },
  {
    id: '2',
    name: 'Bujía',
    supplierId: '1',
    supplierName: 'Repuestos del Sur',
    stock: 2,
    ownThreshold: 4,
    effectiveThreshold: 4,
    belowThreshold: true,
  },
  {
    id: '3',
    name: 'Pastillas de freno',
    supplierId: '2',
    supplierName: 'Frenos Chile',
    stock: 0,
    ownThreshold: null,
    effectiveThreshold: 5,
    belowThreshold: true,
  },
];

/**
 * Catálogo de repuestos simulados derivado de los payloads del contrato MS3.
 */
export const mockParts: Part[] = Object.values(partResponsePayloads).map(
  mapPartResponse
);

/**
 * Umbral general simulado para el catálogo de repuestos.
 */
export const mockGeneralThreshold: number | null = partPagePayload.umbral_general;
