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

  const defaultIso = '1970-01-01T00:00:00.000Z';

  return {
    id: String(dto.id),
    vehicleId: String(dto.vehicle_id),
    intakeId: dto.intake_id ? String(dto.intake_id) : `ing-${dto.id}`,
    clientId: String(dto.client_id),
    createdById: dto.created_by_id ? String(dto.created_by_id) : String(dto.client_id),
    status,
    assignedMechanicId: dto.assigned_mechanic_id != null
      ? String(dto.assigned_mechanic_id)
      : null,
    createdAt: dto.created_at ?? defaultIso,
    updatedAt: dto.updated_at ?? defaultIso,
  };
}

/**
 * Mapea una lista de órdenes devueltas por la API Gateway.
 */
export function mapOrdersResponseList(dtos: OrderResponseDto[]): WorkOrder[] {
  if (!Array.isArray(dtos)) return [];
  return dtos.map(mapOrderResponse);
}
