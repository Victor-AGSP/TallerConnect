export type WorkOrderStatus =
  | 'recibido'
  | 'esperando_diagnostico'
  | 'esperando_aprobacion_presupuesto'
  | 'pausado_por_presupuesto_rechazado'
  | 'esperando_repuestos'
  | 'en_reparacion'
  | 'control_calidad'
  | 'listo_para_entrega'
  | 'entregado'
  | 'cancelado';

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
