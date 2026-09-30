import { WorkOrderStatus } from '@/constants/orderStatus';

/**
 * Representa la respuesta devuelta por GET /api/ordenes y GET /api/ordenes/{id}.
 * Tolera tanto el formato en español de Vercel/FastAPI (orden_id, vehiculo_id, estado_codigo)
 * como nombres estándar en inglés (id, vehicle_id, status).
 */
export interface OrderResponseDto {
  id?: number | string;
  orden_id?: number | string;
  vehicle_id?: number | string;
  vehiculo_id?: number | string;
  client_id?: number | string;
  cliente_id?: number | string;
  intake_id?: number | string;
  ingreso_id?: number | string;
  created_by_id?: number | string;
  creado_por_id?: number | string;
  assigned_mechanic_id?: number | string | null;
  mecanico_actual_id?: number | string | null;
  status?: string;
  estado_codigo?: number;
  description?: string | null;
  created_at?: string;
  creado_en?: string;
  updated_at?: string;
  actualizado_en?: string;
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
