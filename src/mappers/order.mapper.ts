import { WorkOrder, WorkOrderStatus } from '@/models/order.model';
import { OrderResponseDto } from '@/dto/order.dto';
import { ORDER_STATUS_BY_CODE } from '@/constants/orderStatus';

/**
 * Convierte el `estado_codigo` del backend al estado de la aplicación.
 * Lanza un error si el código no pertenece al catálogo oficial.
 */
function mapOrderStatus(code: number): WorkOrderStatus {
  const status = ORDER_STATUS_BY_CODE[code];
  if (!status) {
    throw new Error(`Estado de orden desconocido: ${code}`);
  }
  return status;
}

/**
 * Mapea una orden de trabajo devuelta por la API Gateway al modelo WorkOrder de la aplicación.
 */
export function mapOrderResponse(dto: OrderResponseDto): WorkOrder {
  return {
    id: String(dto.orden_id),
    vehicleId: String(dto.vehiculo_id),
    intakeId: String(dto.ingreso_id),
    status: mapOrderStatus(dto.estado_codigo),
    assignedMechanicId: dto.mecanico_actual_id !== null ? String(dto.mecanico_actual_id) : null,
    createdById: String(dto.creado_por_id),
    createdAt: dto.creado_en,
    updatedAt: dto.actualizado_en,
  };
}

/**
 * Mapea una lista de órdenes de trabajo devuelta por la API Gateway.
 */
export function mapOrdersResponseList(dtos: OrderResponseDto[]): WorkOrder[] {
  if (!Array.isArray(dtos)) return [];
  return dtos.map(mapOrderResponse);
}