import { z } from 'zod';

import type {
  ProviderDetailResponseDto,
  ProviderPageResponseDto,
  ProviderResponseDto,
} from '@/dto/provider.dto';
import { partResponseDtoSchema } from './part-dto.schema';

const providerShape = z.object({
  proveedor_id: z.number().int(),
  nombre: z.string(),
  contacto: z.string(),
  tipo_distribuidor: z.enum(['oficial', 'generico']).optional(),
  cantidad_repuestos: z.number().int(),
});

/**
 * Valida un proveedor recibido de la API (contrato `ProveedorSalida`).
 */
export const providerResponseDtoSchema: z.ZodType<ProviderResponseDto> = providerShape;

/**
 * Valida un proveedor con sus repuestos recibido de la API
 * (GET /api/proveedores/{proveedor_id}). Comprueba la forma del contrato `ProveedorDetalle`.
 */
export const providerDetailResponseDtoSchema: z.ZodType<ProviderDetailResponseDto> =
  providerShape.extend({
    repuestos: z.array(partResponseDtoSchema),
  });

/**
 * Valida la página de proveedores recibida de la API (GET /api/proveedores).
 * Comprueba la forma del contrato `PaginaProveedores`.
 */
export const providerPageResponseDtoSchema: z.ZodType<ProviderPageResponseDto> = z.object({
  total: z.number().int(),
  desde: z.number().int(),
  limite: z.number().int(),
  proveedores: z.array(providerShape),
});
