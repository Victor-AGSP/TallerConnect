import type { WorkOrderStatus } from '@/constants/orderStatus';

/**
 * Aviso de un repuesto con stock bajo su umbral efectivo
 * (`AlertaRepuesto` en `GET /api/inventario/alertas`, MS3).
 * `missingUnits` son las unidades que faltan para alcanzar el umbral.
 */
export interface LowStockNotice {
  type: 'low_stock';
  partId: string;
  partName: string;
  providerName: string;
  stock: number;
  effectiveThreshold: number;
  missingUnits: number;
}

/**
 * Aviso de una solicitud de cancelación pendiente de revisión
 * (`SolicitudCancelacionRespuesta` en `GET /api/ordenes/cancelaciones/pendientes`, MS2).
 * `orderStatusAtRequest` es el estado que tenía la orden cuando el cliente pidió cancelarla.
 */
export interface PendingCancellationNotice {
  type: 'pending_cancellation';
  requestId: string;
  orderId: string;
  clientUserId: string;
  orderStatusAtRequest: WorkOrderStatus;
  reason: string;
  requestedAt: string;
}

/**
 * Aviso de mecánicos que superan el límite de órdenes activas
 * (`CapacidadMecanicoRespuesta` en `GET /api/ordenes/configuracion/capacidad/mecanicos`, MS2).
 * El contrato no declara cómo se identifica cada mecánico, así que el aviso solo indica cuántos son.
 */
export interface MechanicsOverLimitNotice {
  type: 'mechanics_over_limit';
  maxActiveOrdersPerMechanic: number | null;
  mechanicsOverLimit: number;
}

/**
 * Aviso de que se superó el cupo diario de ingresos físicos
 * (`CupoDiarioIngresosRespuesta` en `GET /api/ordenes/configuracion/capacidad/ingresos-diarios`, MS2).
 * `localDate` es una fecha sin hora (`YYYY-MM-DD`) y no se convierte con `new Date()`.
 */
export interface DailyIntakeExceededNotice {
  type: 'daily_intake_exceeded';
  localDate: string;
  maxDailyIntakes: number | null;
  registeredIntakes: number;
}

/**
 * Aviso entregado por los servicios. El backend no tiene un servicio de notificaciones:
 * cada tipo de aviso proviene de una respuesta distinta y conserva solo los datos que esa respuesta entrega.
 */
export type Notice =
  | LowStockNotice
  | PendingCancellationNotice
  | MechanicsOverLimitNotice
  | DailyIntakeExceededNotice;

/**
 * Tipos de aviso que reconoce la app.
 */
export type NoticeType = Notice['type'];