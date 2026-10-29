import { useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { OrderEvidenceList } from '@/components/evidence/OrderEvidenceList';
import { OrderDetailView } from '@/components/orders/OrderDetailView';
import type { WorkOrder } from '@/models/order.model';
import { ordersService } from '@/services/orders.service';

/**
 * Detalle de una orden de trabajo para el cliente autenticado.
 * Consulta GET /api/ordenes/{id} mediante OrdersService y enlaza a su
 * presupuesto (MS3) y a sus evidencias (MS4).
 */
export default function MiOrdenScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();

  const loadOrder = useCallback(
    (orderId: string) => ordersService.getOrderById(orderId),
    [],
  );

  const openBudget = useCallback(() => {
    if (id) router.push({ pathname: '/mis-ordenes/[id]/presupuesto', params: { id } });
  }, [id, router]);

  // Evidencias visibles según el alcance que MS4 aplica a este rol.
  const renderSections = useCallback(
    (order: WorkOrder) => (
      <OrderEvidenceList key={order.id} orderId={order.id} role="cliente" />
    ),
    [],
  );

  return (
    <OrderDetailView
      eyebrow="Portal del cliente"
      orderId={id}
      loadOrder={loadOrder}
      onOpenBudget={openBudget}
      renderSections={renderSections}
    />
  );
}
