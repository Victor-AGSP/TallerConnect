import {
  OrderStatusUpdateRequest,
  WorkOrder,
  WorkOrderStatus,
} from '@/models/order.model';
import { OrderResponseDto, UpdateOrderStatusRequestDto } from '@/dto/order.dto';
import { ORDER_STATUS, ORDER_STATUS_BY_CODE } from '@/constants/orderStatus';

/**
 * Catálogo oficial de códigos numéricos de estado (OrdenRespuesta.estado_codigo en MS2) a estados de la aplicación.
 */
export const CODE_TO_STATUS: Record<number, WorkOrderStatus> = ORDER_STATUS_BY_CODE;

/**
 * Mapeo inverso de WorkOrderStatus al código numérico esperado por MS2 (estado_destino).
 */
export const STATUS_TO_CODE: Record<WorkOrderStatus, number> = {
  [ORDER_STATUS.RECIBIDO]: 1,
  [ORDER_STATUS.ESPERANDO_DIAGNOSTICO]: 2,
  [ORDER_STATUS.ESPERANDO_APROBACION_PRESUPUESTO]: 3,
  [ORDER_STATUS.ESPERANDO_REPUESTOS]: 4,
  [ORDER_STATUS.EN_REPARACION]: 5,
  [ORDER_STATUS.LISTO_PARA_ENTREGA]: 6,
  [ORDER_STATUS.ENTREGADO]: 7,
  [ORDER_STATUS.CANCELADO]: 8,
};

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
    assignedMechanicId:
      dto.mecanico_actual_id !== null ? String(dto.mecanico_actual_id) : null,
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

/**
 * Mapea una solicitud de cambio de estado de la app al cuerpo CambioEstadoSolicitud esperado por MS2.
 * `observacion` solo se envía cuando fue indicada.
 */
export function mapOrderStatusUpdateRequest(
  request: OrderStatusUpdateRequest
): UpdateOrderStatusRequestDto {
  const payload: UpdateOrderStatusRequestDto = {
    estado_destino: STATUS_TO_CODE[request.targetStatus],
  };
  if (request.observation !== undefined) {
    payload.observacion = request.observation;
  }
  return payload;
}