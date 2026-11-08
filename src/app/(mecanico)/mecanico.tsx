import { useCallback, useMemo } from 'react';
import { useRouter } from 'expo-router';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, EmptyState, ErrorMessage, Loading } from '@/components/common';
import { ORDER_STATUS, getOrderStatusLabel } from '@/constants/orderStatus';
import { colors, radius, spacing } from '@/constants/theme';
import { useDataQuery } from '@/hooks/useDataQuery';
import { ordersService } from '@/services/orders.service';
import { useAuthStore } from '@/stores/authStore';

export default function MecanicoScreen() {
  const router = useRouter();
  const userId = useAuthStore((state) => state.user?.id);
  const logout = useAuthStore((state) => state.logout);

  const fetchOrders = useCallback(
    () => ordersService.getOrders(),
    [],
  );

  const {
    data,
    errorMessage,
    isLoading,
    isRefreshing,
    refresh,
  } = useDataQuery(
    fetchOrders,
    'No fue posible consultar las órdenes asignadas.',
  );

  const assigned = useMemo(() => {
    if (userId == null) return [];

    return (data ?? [])
      .filter(
        (order) =>
          order.assignedMechanicId != null &&
          String(order.assignedMechanicId) === String(userId),
      )
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() -
          new Date(a.updatedAt).getTime(),
      );
  }, [data, userId]);

  const stats = useMemo(() => ({
    total: assigned.length,
    active: assigned.filter(
      (order) =>
        order.status !== ORDER_STATUS.ENTREGADO &&
        order.status !== ORDER_STATUS.CANCELADO,
    ).length,
    repair: assigned.filter(
      (order) => order.status === ORDER_STATUS.EN_REPARACION,
    ).length,
    ready: assigned.filter(
      (order) => order.status === ORDER_STATUS.LISTO_PARA_ENTREGA,
    ).length,
  }), [assigned]);

  const handleLogout = useCallback(async () => {
    await logout();
    router.replace('/login');
  }, [logout, router]);

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => { void refresh(); }}
          />
        }
      >
        <Text style={styles.eyebrow}>TALLERCONNECT</Text>
        <Text accessibilityRole="header" style={styles.title}>
          Mis órdenes
        </Text>
        <Text style={styles.subtitle}>
          Consulta tus órdenes reales y registra los avances del taller.
        </Text>

        {errorMessage ? (
          <ErrorMessage
            message={errorMessage}
            onRetry={() => { void refresh(); }}
          />
        ) : isLoading && !data ? (
          <Loading message="Cargando órdenes asignadas..." />
        ) : (
          <>
            <View style={styles.grid}>
              <Metric label="Órdenes asignadas" value={stats.total} />
              <Metric label="Órdenes activas" value={stats.active} />
              <Metric label="En reparación" value={stats.repair} />
              <Metric label="Listas para entrega" value={stats.ready} />
            </View>

            <Text accessibilityRole="header" style={styles.sectionTitle}>
              Mis órdenes recientes
            </Text>

            {assigned.length === 0 ? (
              <EmptyState
                title="Sin órdenes asignadas"
                message="No existen órdenes asociadas a tu usuario."
              />
            ) : (
              assigned.slice(0, 5).map((order) => (
                <Pressable
                  key={order.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Abrir orden ${order.id}`}
                  onPress={() => router.push({
                    pathname: '/(mecanico)/ordenes/[id]' as never,
                    params: { id: order.id },
                  })}
                  style={styles.orderCard}
                >
                  <View style={styles.orderHeader}>
                    <Text style={styles.orderNumber}>
                      OT #{order.id}
                    </Text>
                    <Text style={styles.arrow}>›</Text>
                  </View>
                  <Text style={styles.info}>
                    Estado: {getOrderStatusLabel(order.status)}
                  </Text>
                  <Text style={styles.info}>
                    Vehículo ID: {order.vehicleId}
                  </Text>
                  <Text style={styles.link}>Ver detalle de la orden →</Text>
                </Pressable>
              ))
            )}
          </>
        )}

        <View style={styles.actions}>
          <Button
            title="Ver mis órdenes asignadas"
            onPress={() =>
              router.push('/(mecanico)/ordenes' as never)
            }
          />
          <Button
            title="Ver repuestos y proveedores"
            onPress={() =>
              router.push('/(mecanico)/inventario' as never)
            }
          />
          <Button
            title="Ver vehículos asignados"
            onPress={() =>
              router.push('/(mecanico)/vehiculos-asignados' as never)
            }
          />
          <Button
            title="Cerrar sesión"
            variant="outline"
            onPress={() => { void handleLogout(); }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}`}
      style={styles.metric}
    >
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.accent,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.primary,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 21,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metric: {
    width: '47%',
    flexGrow: 1,
    minHeight: 100,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  metricValue: {
    fontSize: 27,
    fontWeight: '900',
    color: colors.primary,
  },
  metricLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: colors.primary,
    marginTop: spacing.sm,
  },
  orderCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderNumber: {
    fontSize: 19,
    fontWeight: '900',
    color: colors.primary,
  },
  arrow: {
    fontSize: 25,
    color: colors.accent,
  },
  info: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  link: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.accent,
    marginTop: spacing.sm,
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
});
