import type { ProviderDetailResponseDto, ProviderPageResponseDto } from '@/dto/provider.dto';
import { partResponsePayloads } from './part.payload';

type ProviderCase = 'conRepuestos' | 'conRepuestoSinStock' | 'sinRepuestos';

/**
 * Proveedores con la forma exacta de `ProveedorDetalle` (GET /api/proveedores/{proveedor_id}).
 * Sus repuestos son los de `partResponsePayloads`. El contacto aparece como correo, teléfono y persona.
 */
export const providerDetailPayloads: Record<ProviderCase, ProviderDetailResponseDto> = {
  conRepuestos: {
    proveedor_id: 1,
    nombre: 'Repuestos Sur',
    contacto: 'ventas@repuestossur.cl',
    cantidad_repuestos: 2,
    repuestos: [partResponsePayloads.conStock, partResponsePayloads.bajoUmbral],
  },
  conRepuestoSinStock: {
    proveedor_id: 2,
    nombre: 'Frenos del Pacífico',
    contacto: '+56 9 4444 4444',
    cantidad_repuestos: 2,
    repuestos: [partResponsePayloads.sinStock, partResponsePayloads.conUmbralParticular],
  },
  sinRepuestos: {
    proveedor_id: 3,
    nombre: 'Lubricantes Andes',
    contacto: 'María Soto',
    cantidad_repuestos: 0,
    repuestos: [],
  },
};

/**
 * Página de proveedores con la forma de `PaginaProveedores` (GET /api/proveedores).
 */
export const providerPagePayload: ProviderPageResponseDto = {
  total: 3,
  desde: 0,
  limite: 50,
  proveedores: Object.values(providerDetailPayloads).map(({ repuestos: _repuestos, ...proveedor }) => proveedor),
};