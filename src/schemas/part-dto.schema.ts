import { z } from 'zod';

import type { PartPageResponseDto, PartResponseDto } from '@/dto/part.dto';

/**
 * Valida un repuesto recibido de la API (GET /api/repuestos/{repuesto_id}).
 * Comprueba la forma del contrato `RepuestoSalida`.
 */
export const partResponseDtoSchema: z.ZodType<PartResponseDto> = z.object({
  repuesto_id: z.number().int(),
  nombre: z.string(),
  proveedor_id: z.number().int(),
  proveedor_nombre: z.string(),
  proveedor_tipo_distribuidor: z.enum(['oficial', 'generico']).optional(),
  stock: z.number().int(),
  umbral_particular: z.number().int().nullable(),
  umbral_efectivo: z.number().int().nullable(),
  bajo_umbral: z.boolean(),
});

/**
 * Valida la página de repuestos recibida de la API (GET /api/repuestos).
 * Comprueba la forma del contrato `PaginaRepuestos`.
 */
export const partPageResponseDtoSchema: z.ZodType<PartPageResponseDto> = z.object({
  total: z.number().int(),
  desde: z.number().int(),
  limite: z.number().int(),
  umbral_general: z.number().int().nullable(),
  repuestos: z.array(partResponseDtoSchema),
});
