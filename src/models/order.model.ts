/**
 * Estados posibles de una Orden de Trabajo (OT).
 * Flujo trazable: Recibido → Esperando Diagnóstico → En Reparación →
 * Esperando Repuestos → Listo para Entrega → Entregado.
 * `pausado_por_presupuesto_rechazado` es la rama alterna cuando
 * el cliente rechaza el presupuesto propuesto.
 */

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
