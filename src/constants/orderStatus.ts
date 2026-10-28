/**
 * Estados posibles de una Orden de Trabajo (OT).
 * Flujo trazable: Recibido → Esperando Diagnóstico → En Reparación →
 * Esperando Repuestos → Listo para Entrega → Entregado.
 * `pausado_por_presupuesto_rechazado` es la rama alterna cuando
 * el cliente rechaza el presupuesto propuesto.
 */

export const ORDER_STATUS = {
  RECIBIDO: 'recibido',
  ESPERANDO_DIAGNOSTICO: 'esperando_diagnostico',
  ESPERANDO_APROBACION_PRESUPUESTO: 'esperando_aprobacion_presupuesto',
  PAUSADO_POR_PRESUPUESTO_RECHAZADO: 'pausado_por_presupuesto_rechazado',
  ESPERANDO_REPUESTOS: 'esperando_repuestos',
  EN_REPARACION: 'en_reparacion',
  CONTROL_CALIDAD: 'control_calidad',
  LISTO_PARA_ENTREGA: 'listo_para_entrega',
  ENTREGADO: 'entregado',
  CANCELADO: 'cancelado',
} as const;

export type WorkOrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

/**
 * Texto legible de cada estado para mostrarlo en la interfaz.
 * El modelo almacena el código (`en_reparacion`); las vistas muestran la etiqueta.
 */
export const ORDER_STATUS_LABELS: Record<WorkOrderStatus, string> = {
  [ORDER_STATUS.RECIBIDO]: 'Recibido',
  [ORDER_STATUS.ESPERANDO_DIAGNOSTICO]: 'Esperando diagnóstico',
  [ORDER_STATUS.ESPERANDO_APROBACION_PRESUPUESTO]:
    'Esperando aprobación del presupuesto',
  [ORDER_STATUS.PAUSADO_POR_PRESUPUESTO_RECHAZADO]:
    'Pausada por presupuesto rechazado',
  [ORDER_STATUS.ESPERANDO_REPUESTOS]: 'Esperando repuestos',
  [ORDER_STATUS.EN_REPARACION]: 'En reparación',
  [ORDER_STATUS.CONTROL_CALIDAD]: 'Control de calidad',
  [ORDER_STATUS.LISTO_PARA_ENTREGA]: 'Listo para entrega',
  [ORDER_STATUS.ENTREGADO]: 'Entregado',
  [ORDER_STATUS.CANCELADO]: 'Cancelado',
};

/**
 * Obtiene la etiqueta legible de un estado, tolerando valores desconocidos
 * provenientes del backend.
 */
export function getOrderStatusLabel(status: string): string {
  return ORDER_STATUS_LABELS[status as WorkOrderStatus] ?? status;
}
/**
 * Códigos numéricos de estados publicados por el backend.
 * Los estados adicionales de Victor se conservan para
 * compatibilidad con sus vistas.
 */
export const ORDER_STATUS_BY_CODE: Record<number, WorkOrderStatus> = {
  1: ORDER_STATUS.RECIBIDO,
  2: ORDER_STATUS.ESPERANDO_DIAGNOSTICO,
  3: ORDER_STATUS.ESPERANDO_APROBACION_PRESUPUESTO,
  4: ORDER_STATUS.ESPERANDO_REPUESTOS,
  5: ORDER_STATUS.EN_REPARACION,
  6: ORDER_STATUS.LISTO_PARA_ENTREGA,
  7: ORDER_STATUS.ENTREGADO,
  8: ORDER_STATUS.CANCELADO,
};
