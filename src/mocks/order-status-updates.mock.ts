import type { OrderStatusUpdateRequest } from '@/models/order.model';

export type OrderStatusUpdateCase =
  | 'solicitarRepuestos'
  | 'iniciarReparacion'
  | 'marcarListo'
  | 'cancelarConObservacion'
  | 'cancelarSinObservacion';

/**
 * Solicitudes simuladas de cambio de estado de una orden (`CambioEstadoSolicitud` en MS2).
 * Cubren las formas que envía la app; las transiciones permitidas las valida el backend.
 * `cancelarSinObservacion` es el caso que MS2 rechaza con `422`, porque exige observación al cancelar.
 */
export const mockOrderStatusUpdateRequests: Record<
  OrderStatusUpdateCase,
  OrderStatusUpdateRequest
> = {
  solicitarRepuestos: {
    targetStatus: 'esperando_repuestos',
  },
  iniciarReparacion: {
    targetStatus: 'en_reparacion',
    observation: 'Repuestos recibidos, se inicia la reparación',
  },
  marcarListo: {
    targetStatus: 'listo_para_entrega',
    observation: null,
  },
  cancelarConObservacion: {
    targetStatus: 'cancelado',
    observation: 'El cliente desiste de la reparación',
  },
  cancelarSinObservacion: {
    targetStatus: 'cancelado',
  },
};