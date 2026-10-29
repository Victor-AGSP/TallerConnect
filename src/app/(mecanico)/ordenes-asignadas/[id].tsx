import { useCallback } from 'react';
import { useLocalSearchParams } from 'expo-router';

import { EvidenceCapturePanel } from '@/components/evidence/EvidenceCapturePanel';
import { OrderDetailView } from '@/components/orders/OrderDetailView';
import type { WorkOrder } from '@/models/order.model';
import { ordersService } from '@/services/orders.service';

/**
 * Detalle de una orden de trabajo asignada al mecánico autenticado.
 * Consulta GET /api/ordenes/{id} mediante OrdersService y permite adjuntar
 * evidencia fotográfica (MS4) a esa orden.
 */
export default function OrdenAsignadaScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();

  const loadOrder = useCallback(
    (orderId: string) => ordersService.getOrderById(orderId),
    [],
  );

  // `key` reinicia la selección y el envío al cambiar de orden.
  const renderSections = useCallback(
    (order: WorkOrder) => <EvidenceCapturePanel key={order.id} orderId={order.id} />,
    [],
  );

  return (
    <OrderDetailView
      eyebrow="Área de trabajo"
      orderId={id}
      loadOrder={loadOrder}
      renderSections={renderSections}
    />
  );
}
