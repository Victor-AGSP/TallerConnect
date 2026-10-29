import type { OrderLogEntryResponseDto } from '@/dto/order-log.dto';
import type { OrderLogEntry } from '@/models/order-log.model';
import {
  orderLogEntryResponseDtoSchema,
  orderLogResponseDtoSchema,
} from '@/schemas/order-log-dto.schema';

/** Mensaje para respuestas que no cumplen el contrato de la bitácora. */
export const INVALID_ORDER_LOG_RESPONSE =
  'La respuesta de la bitácora de la orden no es válida.';

export class InvalidOrderLogResponseError extends Error {
  constructor() {
    super(INVALID_ORDER_LOG_RESPONSE);
    this.name = 'InvalidOrderLogResponseError';
  }
}

function toModel(dto: OrderLogEntryResponseDto): OrderLogEntry {
  return {
    id: String(dto.bitacora_id),
    orderId: String(dto.orden_id),
    authorUserId: String(dto.autor_usuario_id),
    type: dto.tipo,
    description: dto.descripcion,
    createdAt: dto.creado_en,
    parts: (dto.repuestos ?? []).map((part) => ({
      name: part.nombre,
      quantity: part.cantidad,
    })),
  };
}

/** Convierte `BitacoraRespuesta`; rechaza respuestas fuera del contrato. */
export function mapOrderLogEntryResponse(value: unknown): OrderLogEntry {
  const parsed = orderLogEntryResponseDtoSchema.safeParse(value);
  if (!parsed.success) throw new InvalidOrderLogResponseError();
  return toModel(parsed.data);
}

/** Convierte la lista de `BitacoraRespuesta`; rechaza respuestas fuera del contrato. */
export function mapOrderLogResponse(value: unknown): OrderLogEntry[] {
  const parsed = orderLogResponseDtoSchema.safeParse(value);
  if (!parsed.success) throw new InvalidOrderLogResponseError();
  return parsed.data.map(toModel);
}
