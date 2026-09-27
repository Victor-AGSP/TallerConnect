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