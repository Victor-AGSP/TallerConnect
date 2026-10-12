import { useCallback } from 'react';
import { useLocalSearchParams } from 'expo-router';

import { OrderDetailView } from '@/components/orders/OrderDetailView';
import { ordersService } from '@/services/orders.service';

/**
 * Detalle de una orden de trabajo para el cliente autenticado.
 * Consulta GET /api/ordenes/{id} mediante OrdersService.
 */
export default function MiOrdenScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();

  const loadOrder = useCallback(
    (orderId: string) => ordersService.getOrderById(orderId),
    [],
  );

  return (
    <OrderDetailView
      eyebrow="Portal del cliente"
      orderId={id}
      loadOrder={loadOrder}
    />
  );
}
