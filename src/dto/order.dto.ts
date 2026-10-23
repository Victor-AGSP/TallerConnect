import { WorkOrderStatus } from '@/constants/orderStatus';

/**
 * Orden de trabajo devuelta por la API Gateway (`OrdenRespuesta` del contrato MS2).
 */
export interface OrderResponseDto {
  orden_id: number;
  vehiculo_id: number;
  ingreso_id: number;
  estado_codigo: number;
  mecanico_actual_id: number | null;
  creado_por_id: number;
  creado_en: string;
  actualizado_en: string;
}

/**
 * Cuerpo enviado a POST /api/ordenes para crear una orden de trabajo (OrdenCrear en MS2).
 */
export interface CreateOrderRequestDto {
  vehicle_id?: number | string;
  vehiculo_id?: number | string;
  client_id?: number | string;
  cliente_id?: number | string;
  intake_id?: number | string;
  description?: string;
}

/**
 * Cuerpo enviado para actualizar el estado de una orden.
 * Soporta tanto status textual como CambioEstadoSolicitud (estado_destino, observacion) de MS2.
 */
export interface UpdateOrderStatusRequestDto {
  status?: WorkOrderStatus;
  estado_destino?: number;
  observacion?: string | null;
}

/**
 * Cuerpo enviado a PUT /api/ordenes/{orden_id}/mecanico (AsignacionMecanicoActualizar en MS2).
 */
export interface AssignMechanicRequestDto {
  mecanico_id: number | string;
  observacion?: string | null;
}

/**
 * Parámetros de consulta de GET /api/ordenes/{orden_id} definidos en el contrato OpenAPI de MS2.
 */
export interface OrderDetailQueryParamsDto {
  solo_propietario?: boolean;
}

/**
 * Parámetros de consulta tipados para filtrar o paginar listados de órdenes de trabajo.
 */
export interface OrderQueryParamsDto {
  vehiculo_id?: number | string;
  vehicleId?: string;
  cliente_id?: number | string;
  clientId?: string;
  creado_por_id?: number | string;
  createdById?: string;
  mecanico_actual_id?: number | string;
  assignedMechanicId?: string;
  estado_codigo?: number;
  status?: WorkOrderStatus;
  solo_propietario?: boolean;
  skip?: number;
  limit?: number;
}

/**
 * Representa un registro de historial de estados devuelto por GET /api/ordenes/{orden_id}/historial (HistorialEstadoRespuesta en MS2).
 */
export interface OrderHistoryEntryDto {
  historial_id: number;
  orden_id: number;
  estado_anterior: number | null;
  estado_nuevo: number;
  actor_usuario_id: number | null;
  origen: 'usuario' | 'sistema';
  fecha_hora: string;
  observacion: string | null;
}
