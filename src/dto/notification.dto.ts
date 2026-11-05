import type { UserRole as Role } from '@/constants/roles';
import {
  NotificationCategory,
  NotificationPriority,
} from '@/models/notification.model';

/**
 * DTO de aviso/notificación devuelto por la API Gateway (`/api/notificaciones`)
 * cuando el contrato está disponible. Admite campos en español e inglés para
 * compatibilidad entre iteraciones del contrato.
 */
export interface NotificationResponseDto {
  notificacion_id?: number | string;
  id?: number | string;
  titulo?: string;
  title?: string;
  mensaje?: string;
  message?: string;
  categoria?: string;
  category?: string;
  prioridad?: string;
  priority?: string;
  leida?: boolean;
  is_read?: boolean;
  read?: boolean;
  creado_en?: string;
  created_at?: string;
  rol_destino?: string | null;
  target_role?: string | null;
  orden_id?: number | string | null;
  order_id?: number | string | null;
  vehiculo_id?: number | string | null;
  vehicle_id?: number | string | null;
  presupuesto_id?: number | string | null;
  budget_id?: number | string | null;
  repuesto_id?: number | string | null;
  part_id?: number | string | null;
}

/**
 * Parámetros de consulta para filtrar avisos y notificaciones.
 */
export interface NotificationQueryParamsDto {
  categoria?: NotificationCategory;
  category?: NotificationCategory;
  solo_no_leidas?: boolean;
  unreadOnly?: boolean;
  rol?: Role | 'all';
  role?: Role | 'all';
  orden_id?: number | string;
  orderId?: string;
  skip?: number;
  limit?: number;
}

/**
 * Respuesta al marcar una o todas las notificaciones como leídas.
 */
export interface MarkNotificationReadResponseDto {
  notificacion_id?: number | string;
  leida?: boolean;
  actualizadas?: number;
}
