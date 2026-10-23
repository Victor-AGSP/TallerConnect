import { WorkOrder, WorkOrderStatus } from '@/models/order.model';
import { OrderResponseDto } from '@/dto/order.dto';
import { ORDER_STATUS } from '@/constants/orderStatus';

const VALID_STATUSES: readonly string[] = Object.values(ORDER_STATUS);

/**
 * Mapeo oficial de códigos numéricos de estado (OrdenRespuesta.estado_codigo en MS2) a estados de la aplicación:
 * 1 = Recibido; 2 = Esperando diagnóstico; 3 = Esperando aprobación de presupuesto;
 * 4 = Esperando repuestos; 5 = En reparación; 6 = Listo; 7 = Entregado; 8 = Cancelado.
 */
export const CODE_TO_STATUS: Record<number, WorkOrderStatus> = {
  1: ORDER_STATUS.RECIBIDO,
  2: ORDER_STATUS.ESPERANDO_DIAGNOSTICO,
  3: ORDER_STATUS.ESPERANDO_APROBACION_PRESUPUESTO,
  4: ORDER_STATUS.ESPERANDO_REPUESTOS,
  5: ORDER_STATUS.EN_REPARACION,
  6: ORDER_STATUS.LISTO_PARA_ENTREGA,
  7: ORDER_STATUS.ENTREGADO,
  8: ORDER_STATUS.CANCELADO,
  9: ORDER_STATUS.CANCELADO,
};

/**
 * Mapeo inverso de WorkOrderStatus al código numérico esperado por MS2 (estado_destino).
 */
export const STATUS_TO_CODE: Record<WorkOrderStatus, number> = {
  [ORDER_STATUS.RECIBIDO]: 1,
  [ORDER_STATUS.ESPERANDO_DIAGNOSTICO]: 2,
  [ORDER_STATUS.ESPERANDO_APROBACION_PRESUPUESTO]: 3,
  [ORDER_STATUS.PAUSADO_POR_PRESUPUESTO_RECHAZADO]: 3,
  [ORDER_STATUS.ESPERANDO_REPUESTOS]: 4,
  [ORDER_STATUS.EN_REPARACION]: 5,
  [ORDER_STATUS.CONTROL_CALIDAD]: 5,
  [ORDER_STATUS.LISTO_PARA_ENTREGA]: 6,
  [ORDER_STATUS.ENTREGADO]: 7,
  [ORDER_STATUS.CANCELADO]: 8,
};

/**
 * Valida si un texto corresponde a un WorkOrderStatus de la aplicación.
 */
export function isValidOrderStatus(status: unknown): status is WorkOrderStatus {
  return typeof status === 'string' && VALID_STATUSES.includes(status);
}

/**
 * Mapea una orden devuelta por la API Gateway (tanto ordenes en español como inglés) al modelo WorkOrder.
 */
export function mapOrderResponse(dto: OrderResponseDto): WorkOrder {
  let status: WorkOrderStatus = ORDER_STATUS.ESPERANDO_DIAGNOSTICO;

  if (isValidOrderStatus(dto.status)) {
    status = dto.status;
  } else if (dto.estado_codigo != null && CODE_TO_STATUS[dto.estado_codigo]) {
    status = CODE_TO_STATUS[dto.estado_codigo];
  }

  const id = String(dto.orden_id ?? dto.id ?? '');
  const vehicleId = String(dto.vehiculo_id ?? dto.vehicle_id ?? '');
  const intakeId = String(dto.ingreso_id ?? dto.intake_id ?? `ing-${id}`);
  const clientId = String(dto.cliente_id ?? dto.client_id ?? dto.creado_por_id ?? dto.created_by_id ?? '1');
  const createdById = String(dto.creado_por_id ?? dto.created_by_id ?? clientId);

  const rawMechanic = dto.mecanico_actual_id !== undefined ? dto.mecanico_actual_id : dto.assigned_mechanic_id;
  const assignedMechanicId = rawMechanic != null ? String(rawMechanic) : null;

  const defaultIso = '1970-01-01T00:00:00.000Z';
  const createdAt = dto.creado_en || dto.created_at || defaultIso;
  const updatedAt = dto.actualizado_en || dto.updated_at || createdAt;

  return {
    id,
    vehicleId,
    intakeId,
    clientId,
    createdById,
    status,
    assignedMechanicId,
    createdAt,
    updatedAt,
  };
}

/**
 * Mapea una lista de órdenes devueltas por la API Gateway.
 */
export function mapOrdersResponseList(dtos: OrderResponseDto[]): WorkOrder[] {
  if (!Array.isArray(dtos)) return [];
  return dtos.map(mapOrderResponse);
}
