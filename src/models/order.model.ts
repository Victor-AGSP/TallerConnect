import type { WorkOrderStatus } from '@/constants/orderStatus';

export type { WorkOrderStatus };

/**
 * Representa una Orden de Trabajo (OT), la entidad central
 * del proceso de servicio técnico vehicular.
 */

export interface WorkOrder {
  id: string;
  vehicleId: string;
  intakeId: string;
  status: WorkOrderStatus;
  assignedMechanicId: string | null;
  clientId: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}
