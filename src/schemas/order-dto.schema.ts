import { z } from 'zod';

import { OrderResponseDto } from '@/dto/order.dto';

/**
 * Valida la orden de trabajo recibida de la API (GET /api/ordenes,
 * GET /api/ordenes/{orden_id} y POST /api/ordenes).
 * Comprueba la forma del contrato `OrdenRespuesta`; la conversión de
 * `estado_codigo` al estado de la app sigue a cargo del mapper.
 */
export const orderResponseDtoSchema: z.ZodType<OrderResponseDto> = z.object({
  orden_id: z.number().int(),
  vehiculo_id: z.number().int(),
  ingreso_id: z.number().int(),
  estado_codigo: z.number().int(),
  mecanico_actual_id: z.number().int().nullable(),
  creado_por_id: z.number().int(),
  creado_en: z.iso.datetime({ offset: true }),
  actualizado_en: z.iso.datetime({ offset: true }),
});

/**
 * Valida la lista de órdenes de trabajo recibida de la API.
 */
export const orderListResponseDtoSchema = z.array(orderResponseDtoSchema);