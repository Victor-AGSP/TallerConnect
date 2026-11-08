import { Fragment, useCallback } from 'react';
import { useLocalSearchParams } from 'expo-router';

import { EvidenceCapturePanel } from '@/components/evidence/EvidenceCapturePanel';
import { OrderEvidenceList } from '@/components/evidence/OrderEvidenceList';
import {
  MechanicUpdatePanel,
  acceptsEvidence,
} from '@/components/orders/MechanicUpdatePanel';
import { OrderDetailView } from '@/components/orders/OrderDetailView';
import type { WorkOrder } from '@/models/order.model';
import { ordersService } from '@/services/orders.service';

/**
 * Detalle de una orden de trabajo asignada al mecánico autenticado.
 * Consulta GET /api/ordenes/{id} mediante OrdersService, registra avances en
 * la bitácora (MS2) y permite adjuntar evidencia fotográfica (MS4) a esa orden.
 */
export default function OrdenAsignadaScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();

  const loadOrder = useCallback(
    (orderId: string) => ordersService.getOrderById(orderId),
    [],
  );

  // `key` reinicia formularios, selección y envíos al cambiar de orden.
  const renderSections = useCallback(
    (order: WorkOrder) => (
      <Fragment key={order.id}>
        <MechanicUpdatePanel order={order} />
        {acceptsEvidence(order.status) ? <EvidenceCapturePanel orderId={order.id} /> : null}
        <OrderEvidenceList orderId={order.id} role="mecanico" />
      </Fragment>
    ),
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
