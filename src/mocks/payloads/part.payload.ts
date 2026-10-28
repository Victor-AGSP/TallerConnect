import type { PartPageResponseDto, PartResponseDto } from '@/dto/part.dto';

type PartCase = 'conStock' | 'bajoUmbral' | 'sinStock' | 'conUmbralParticular';

/**
 * Repuestos con la forma exacta de `RepuestoSalida` (GET /api/repuestos).
 * Cubren stock suficiente, bajo umbral, sin stock y umbral particular.
 * El umbral general simulado es 5: si un repuesto no tiene umbral particular, su umbral efectivo es 5.
 */
export const partResponsePayloads: Record<PartCase, PartResponseDto> = {
  conStock: {
    repuesto_id: 10,
    nombre: 'Filtro de aceite',
    proveedor_id: 1,
    proveedor_nombre: 'Repuestos Sur',
    stock: 12,
    umbral_particular: null,
    umbral_efectivo: 5,
    bajo_umbral: false,
  },
  bajoUmbral: {
    repuesto_id: 11,
    nombre: 'Bujía',
    proveedor_id: 1,
    proveedor_nombre: 'Repuestos Sur',
    stock: 2,
    umbral_particular: 4,
    umbral_efectivo: 4,
    bajo_umbral: true,
  },
  sinStock: {
    repuesto_id: 12,
    nombre: 'Pastillas de freno delanteras',
    proveedor_id: 2,
    proveedor_nombre: 'Frenos del Pacífico',
    stock: 0,
    umbral_particular: null,
    umbral_efectivo: 5,
    bajo_umbral: true,
  },
  conUmbralParticular: {
    repuesto_id: 13,
    nombre: 'Correa de distribución',
    proveedor_id: 2,
    proveedor_nombre: 'Frenos del Pacífico',
    stock: 3,
    umbral_particular: 2,
    umbral_efectivo: 2,
    bajo_umbral: false,
  },
};

/**
 * Página de repuestos con la forma de `PaginaRepuestos` (GET /api/repuestos).
 */
export const partPagePayload: PartPageResponseDto = {
  total: 4,
  desde: 0,
  limite: 50,
  umbral_general: 5,
  repuestos: Object.values(partResponsePayloads),
};