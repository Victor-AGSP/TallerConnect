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
 * Cuerpo enviado a POST /api/ordenes para crear una orden de trabajo.
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
 * Cuerpo enviado a PATCH /api/ordenes/{id}/status para actualizar el estado.
 */
export interface UpdateOrderStatusRequestDto {
  status: WorkOrderStatus;
}