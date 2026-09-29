import { WorkOrderStatus } from '@/constants/orderStatus';

/**
 * Representa la respuesta devuelta por GET /api/orders y GET /api/orders/{id}.
 * Refleja la estructura de la API Gateway en snake_case.
 */
export interface OrderResponseDto {
  id: number | string;
  vehicle_id: number | string;
  client_id: number | string;
  assigned_mechanic_id?: number | string | null;
  status: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Cuerpo enviado a POST /api/orders para crear una orden de trabajo.
 */
export interface CreateOrderRequestDto {
  vehicle_id: number | string;
  client_id: number | string;
  description?: string;
}

/**
 * Cuerpo enviado a PATCH /api/orders/{id}/status para actualizar el estado.
 */
export interface UpdateOrderStatusRequestDto {
  status: WorkOrderStatus;
}
