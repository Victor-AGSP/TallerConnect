import { WorkOrder, WorkOrderStatus } from '@/models/order.model';
import { OrderResponseDto } from '@/dto/order.dto';
import { ORDER_STATUS } from '@/constants/orderStatus';

const VALID_STATUSES: readonly string[] = Object.values(ORDER_STATUS);

/**
 * Valida si un texto corresponde a un WorkOrderStatus de la aplicación.
 */
export function isValidOrderStatus(status: unknown): status is WorkOrderStatus {
  return typeof status === 'string' && VALID_STATUSES.includes(status);
}

/**
 * Mapea una orden devuelta por la API Gateway (snake_case) al modelo WorkOrder de la app (camelCase).
 */
export function mapOrderResponse(dto: OrderResponseDto): WorkOrder {
  const status: WorkOrderStatus = isValidOrderStatus(dto.status)
    ? dto.status
    : ORDER_STATUS.ESPERANDO_DIAGNOSTICO;

  return {
    id: String(dto.id),
    vehicleId: String(dto.vehicle_id),
    clientId: String(dto.client_id),
    status,
    assignedMechanicId: dto.assigned_mechanic_id
      ? String(dto.assigned_mechanic_id)
      : undefined,
    description: dto.description ?? undefined,
    createdAt: dto.created_at ?? undefined,
    updatedAt: dto.updated_at ?? undefined,
  };
}

/**
 * Mapea una lista de órdenes devueltas por la API Gateway.
 */
export function mapOrdersResponseList(dtos: OrderResponseDto[]): WorkOrder[] {
  if (!Array.isArray(dtos)) return [];
  return dtos.map(mapOrderResponse);
}
