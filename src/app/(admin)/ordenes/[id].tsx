import { useCallback } from 'react';
import { useLocalSearchParams } from 'expo-router';

import { OrderDetailView } from '@/components/orders/OrderDetailView';
import { ordersService } from '@/services/orders.service';

/**
 * Detalle de una orden de trabajo para la administración del taller.
 * Consulta GET /api/ordenes/{id} mediante OrdersService.
 */
export default function OrdenScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();

  const loadOrder = useCallback(
    (orderId: string) => ordersService.getOrderById(orderId),
    [],
  );

  return (
    <OrderDetailView
      eyebrow="Administración"
      orderId={id}
      loadOrder={loadOrder}
    />
  );
}
