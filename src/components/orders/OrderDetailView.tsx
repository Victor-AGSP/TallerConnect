import { useMemo } from 'react';

import { StyleSheet, Text, View } from 'react-native';

import {
  Button,
  Card,
  EmptyState,
  ErrorMessage,
  Loading,
} from '@/components/common';
import { AppScreen } from '@/components/layout/AppScreen';
import { StatusPill, type StatusTone } from '@/components/ui/StatusPill';
import { useDataQuery } from '@/hooks/useDataQuery';
import {
  ORDER_STATUS,
  getOrderStatusLabel,
  type WorkOrderStatus,
} from '@/constants/orderStatus';
import { colors, spacing } from '@/constants/theme';
import type { WorkOrder } from '@/models/order.model';
import { formatDate } from '@/utils/formatters';

export interface OrderDetailViewProps {
  eyebrow: string;

  /** Identificador recibido en la ruta. Puede llegar vacío o ausente. */
  orderId?: string;

  /**
   * Consulta el detalle al servicio de órdenes. Debe ser estable entre
   * renderizados porque dispara la carga.
   */
  loadOrder: (id: string) => Promise<WorkOrder>;
}

const FALLBACK_ERROR = 'No fue posible cargar la orden de trabajo.';

/** Tono visual de cada estado de la orden. */
const STATUS_TONES: Record<WorkOrderStatus, StatusTone> = {
  [ORDER_STATUS.RECIBIDO]: 'info',
  [ORDER_STATUS.ESPERANDO_DIAGNOSTICO]: 'info',
  [ORDER_STATUS.ESPERANDO_APROBACION_PRESUPUESTO]: 'warning',
  [ORDER_STATUS.PAUSADO_POR_PRESUPUESTO_RECHAZADO]: 'danger',
  [ORDER_STATUS.ESPERANDO_REPUESTOS]: 'warning',
  [ORDER_STATUS.EN_REPARACION]: 'warning',
  [ORDER_STATUS.CONTROL_CALIDAD]: 'info',
  [ORDER_STATUS.LISTO_PARA_ENTREGA]: 'success',
  [ORDER_STATUS.ENTREGADO]: 'success',
  [ORDER_STATUS.CANCELADO]: 'danger',
};

/**
 * Detalle de una orden de trabajo conectado a OrdersService.
 *
 * Cubre los estados de la consulta: identificador ausente en la ruta,
 * carga, error del servicio (incluida una orden inexistente, que el
 * backend responde como recurso no encontrado) y detalle disponible.
 */
export function OrderDetailView({
  eyebrow,
  orderId,
  loadOrder,
}: OrderDetailViewProps) {
  // Sin identificador en la ruta no hay nada que consultar.
  const query = useMemo(
    () => (orderId ? () => loadOrder(orderId) : null),
    [loadOrder, orderId],
  );

  const {
    data: order,
    errorMessage,
    isLoading,
    isRefreshing,
    refresh,
  } = useDataQuery(query, FALLBACK_ERROR);

  return (
    <AppScreen
      eyebrow={eyebrow}
      title={order ? `Orden ${order.id}` : 'Orden de trabajo'}
      subtitle="Detalle de la orden de trabajo y su estado actual."
    >
      {!orderId ? (
        <EmptyState
          testID="order-detail-missing-id"
          title="Orden no encontrada"
          message="No se indicó qué orden de trabajo se quiere consultar."
        />
      ) : isLoading ? (
        <Loading testID="order-detail-loading" message="Cargando orden..." />
      ) : errorMessage ? (
        <ErrorMessage
          testID="order-detail-error"
          message={errorMessage}
          onRetry={refresh}
        />
      ) : order ? (
        <>
          <Button
            testID="order-detail-refresh"
            title="Actualizar"
            variant="outline"
            loading={isRefreshing}
            onPress={refresh}
            style={styles.refreshButton}
          />

          <OrderDetailCard order={order} />
        </>
      ) : null}
    </AppScreen>
  );
}

function OrderDetailCard({ order }: { order: WorkOrder }) {
  const statusLabel = getOrderStatusLabel(order.status);
  const tone = STATUS_TONES[order.status] ?? 'info';

  return (
    <Card testID={`order-detail-${order.id}`}>
      <View style={styles.header}>
        <Text
          accessibilityRole="header"
          style={styles.orderNumber}
        >
          {order.id}
        </Text>

        <StatusPill
          label={statusLabel}
          tone={tone}
          accessibilityLabel={`Estado de la orden: ${statusLabel}`}
        />
      </View>

      <View style={styles.rows}>
        <DetailRow label="Vehículo" value={order.vehicleId} />
        <DetailRow label="Ingreso" value={order.intakeId} />
        <DetailRow
          label="Mecánico asignado"
          value={order.assignedMechanicId ?? 'Sin asignar'}
        />
        <DetailRow label="Cliente" value={order.clientId} />
        <DetailRow label="Creada por" value={order.createdById} />
        <DetailRow label="Fecha de creación" value={formatDate(order.createdAt)} />
        <DetailRow
          label="Última actualización"
          value={formatDate(order.updatedAt)}
        />
      </View>
    </Card>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}`}
      style={styles.row}
    >
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  refreshButton: {
    alignSelf: 'flex-end',
    minHeight: 40,
    paddingHorizontal: spacing.md,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },

  orderNumber: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },

  rows: {
    marginTop: spacing.md,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  rowLabel: {
    color: colors.textSecondary,
    fontSize: 13,
  },

  rowValue: {
    flexShrink: 1,
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'right',
  },
});
