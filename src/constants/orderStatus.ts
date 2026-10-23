/**
 * Estados de una Orden de Trabajo (OT) expuestos por el backend
 * mediante el campo `estado_codigo`.
 * La app solo representa estos estados: las transiciones permitidas
 * entre ellos las valida el backend.
 */

export const ORDER_STATUS = {
  RECIBIDO: 'recibido',
  ESPERANDO_DIAGNOSTICO: 'esperando_diagnostico',
  ESPERANDO_APROBACION_PRESUPUESTO: 'esperando_aprobacion_presupuesto',
  ESPERANDO_REPUESTOS: 'esperando_repuestos',
  EN_REPARACION: 'en_reparacion',
  LISTO_PARA_ENTREGA: 'listo_para_entrega',
  ENTREGADO: 'entregado',
  CANCELADO: 'cancelado',
} as const;

export type WorkOrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

/**
 * Catálogo oficial del backend: código numérico (`estado_codigo`) → estado de la app.
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

/**
 * Nombres oficiales de cada estado, tal como los define el backend.
 */
export const ORDER_STATUS_LABELS: Record<WorkOrderStatus, string> = {
  recibido: 'Recibido',
  esperando_diagnostico: 'Esperando diagnóstico',
  esperando_aprobacion_presupuesto: 'Esperando aprobación de presupuesto',
  esperando_repuestos: 'Esperando repuestos',
  en_reparacion: 'En reparación',
  listo_para_entrega: 'Listo',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};