import type { WorkOrderStatus } from '@/constants/orderStatus';

export type { WorkOrderStatus };

/**
 * Representa una Orden de Trabajo (OT), la entidad central
 * del proceso de servicio técnico vehicular.
 * El cliente no forma parte de la orden: se obtiene a través
 * del vehículo asociado (`vehicleId` → `Vehicle.ownerId`).
 */

export interface WorkOrder {
  id: string;
  vehicleId: string;
  intakeId: string;
  status: WorkOrderStatus;
  assignedMechanicId: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Solicitud de cambio de estado de una orden de trabajo (`CambioEstadoSolicitud` en MS2).
 * La observación es opcional, salvo al pasar a `cancelado`, donde el backend la exige.
 */
export interface OrderStatusUpdateRequest {
  targetStatus: WorkOrderStatus;
  observation?: string | null;
}