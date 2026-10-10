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
