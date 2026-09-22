import type { WorkOrderStatus } from '@/constants/orderStatus'; 

export type { WorkOrderStatus };

/**
 * Representa una Orden de Trabajo (OT), la entidad central
 * del proceso de servicio técnico vehicular.
 */

export interface WorkOrder {
  id: string;
  vehicleId: string;
  status: WorkOrderStatus;
  assignedMechanicId?: string;
  clientId: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}