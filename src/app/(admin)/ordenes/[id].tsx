import { useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { OrderDetailView } from '@/components/orders/OrderDetailView';
import { ordersService } from '@/services/orders.service';

/**
 * Detalle de una orden de trabajo para la administración del taller.
 * Consulta GET /api/ordenes/{id} mediante OrdersService y enlaza a su
 * presupuesto (MS3).
 */
export default function OrdenScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();

  const loadOrder = useCallback(
    (orderId: string) => ordersService.getOrderById(orderId),
    [],
  );

  const openBudget = useCallback(() => {
    if (id) router.push({ pathname: '/ordenes/[id]/presupuesto', params: { id } });
  }, [id, router]);

  return (
    <OrderDetailView
      eyebrow="Administración"
      orderId={id}
      loadOrder={loadOrder}
      onOpenBudget={openBudget}
    />
  );
}
