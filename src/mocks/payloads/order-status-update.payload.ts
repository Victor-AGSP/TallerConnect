import type { UpdateOrderStatusRequestDto } from '@/dto/order.dto';
import type { OrderStatusUpdateCase } from '@/mocks/order-status-updates.mock';

/**
 * Cuerpos de `CambioEstadoSolicitud` (`PATCH /api/ordenes/{orden_id}/estado` en MS2) que corresponden
 * a cada solicitud de `mockOrderStatusUpdateRequests`. `observacion` solo aparece cuando fue indicada.
 */
export const orderStatusUpdatePayloads: Record<
  OrderStatusUpdateCase,
  UpdateOrderStatusRequestDto
> = {
  solicitarRepuestos: { estado_destino: 4 },
  iniciarReparacion: {
    estado_destino: 5,
    observacion: 'Repuestos recibidos, se inicia la reparación',
  },
  marcarListo: { estado_destino: 6, observacion: null },
  cancelarConObservacion: {
    estado_destino: 8,
    observacion: 'El cliente desiste de la reparación',
  },
  cancelarSinObservacion: { estado_destino: 8 },
};