import { z } from 'zod';

import { VehicleResponseDto } from '@/dto/vehicle.dto';

/**
 * Valida el vehículo recibido de la API (GET /api/vehiculos, GET /api/vehiculos/asignados,
 * GET /api/vehiculos/{vehiculo_id} y POST /api/vehiculos).
 * Comprueba la forma del contrato `VehiculoRespuesta`.
 */
export const vehicleResponseDtoSchema: z.ZodType<VehicleResponseDto> = z.object({
  vehiculo_id: z.number().int(),
  cliente_id: z.number().int(),
  patente: z.string(),
  marca: z.string(),
  modelo: z.string(),
  anio: z.number().int().nullable(),
  kilometraje: z.number().int().nullable(),
});

/**
 * Valida la lista de vehículos recibida de la API.
 */
export const vehicleListResponseDtoSchema = z.array(vehicleResponseDtoSchema);