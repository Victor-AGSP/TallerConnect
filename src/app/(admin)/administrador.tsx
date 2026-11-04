import { useCallback, useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { EmptyState, ErrorMessage } from '@/components/common';
import { StatusPill } from '@/components/ui/StatusPill';
import { ORDER_STATUS_LABELS } from '@/constants/orderStatus';
import { ROLES } from '@/constants/roles';
import { colors, radius, spacing } from '@/constants/theme';
import type { WorkshopNotification } from '@/models/notification.model';
import type { WorkOrder } from '@/models/order.model';
import type { Vehicle } from '@/models/vehicle.model';
import { notificationsService } from '@/services/notifications.service';
import { ordersService } from '@/services/orders.service';
import { vehiclesService } from '@/services/vehicles.service';
import { useAuthStore } from '@/stores/authStore';

export default function AdministradorScreen() {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);

  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [notifications, setNotifications] = useState<WorkshopNotification[]>(
    [],
  );
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [vehiclesError, setVehiclesError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadDashboard = useCallback(async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    }

    setOrdersError(null);
    setVehiclesError(null);

    try {
      const [ordersResult, vehiclesResult, notificationsResult] =
        await Promise.allSettled([
          ordersService.getOrders(),
          vehiclesService.getVehicles(),
          notificationsService.getNotifications({ role: ROLES.ADMINISTRADOR }),
        ]);

      if (ordersResult.status === 'fulfilled') {
        setOrders(ordersResult.value);
      } else {
        setOrdersError(
          ordersResult.reason instanceof Error
            ? ordersResult.reason.message
            : 'No fue posible cargar las órdenes.',
        );
      }

      if (vehiclesResult.status === 'fulfilled') {
        setVehicles(vehiclesResult.value);
      } else {
        setVehiclesError(
          vehiclesResult.reason instanceof Error
            ? vehiclesResult.reason.message
            : 'No fue posible cargar los vehículos.',
        );
      }

      if (notificationsResult.status === 'fulfilled') {
        setNotifications(notificationsResult.value);
      }
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const metrics = useMemo(() => {
    const activeOrders = orders.filter(
      (order) =>
        order.status !== 'entregado' && order.status !== 'cancelado',
    );

    const awaitingApproval = orders.filter(
      (order) => order.status === 'esperando_aprobacion_presupuesto',
    );

    const assignedMechanics = new Set(
      activeOrders
        .map((order) => order.assignedMechanicId)
        .filter((id): id is string => id !== null),
    );

    return {
      vehicles: vehicles.length,
      activeOrders: activeOrders.length,
      awaitingApproval: awaitingApproval.length,
      assignedMechanics: assignedMechanics.size,
    };
  }, [orders, vehicles]);

  const vehicleById = useMemo(
    () => new Map(vehicles.map((vehicle) => [vehicle.id, vehicle])),
    [vehicles],
  );

  const recentOrders = useMemo(
    () =>
      [...orders]
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() -
            new Date(a.updatedAt).getTime(),
        )
        .slice(0, 4),
    [orders],
  );

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void loadDashboard(true)}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>TALLERCONNECT</Text>
            <Text style={styles.title}>Panel del taller</Text>
            <Text style={styles.subtitle}>
              Resumen general del funcionamiento del taller.
            </Text>
          </View>

          <Pressable
            style={styles.logoutButton}
            onPress={() => void handleLogout()}
            accessibilityRole="button"
          >
            <Text style={styles.logoutText}>Cerrar sesión</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Resumen general</Text>

        <View style={styles.metricsGrid}>
          <MetricCard
            label="Vehículos registrados"
            value={metrics.vehicles}
            accent={colors.info}
          />
          <MetricCard
            label="Órdenes activas"
            value={metrics.activeOrders}
            accent={colors.success}
          />
          <MetricCard
            label="Pendientes de aprobación"
            value={metrics.awaitingApproval}
            accent={colors.warning}
          />
          <MetricCard
            label="Mecánicos asignados"
            value={metrics.assignedMechanics}
            accent={colors.accent}
          />
        </View>

        {vehiclesError ? (
          <ErrorMessage
            title="No se pudieron cargar los vehículos"
            message={vehiclesError}
            onRetry={() => void loadDashboard()}
          />
        ) : null}

        {ordersError ? (
          <ErrorMessage
            title="No se pudieron cargar las órdenes"
            message={ordersError}
            onRetry={() => void loadDashboard()}
          />
        ) : null}

        <Text style={styles.sectionTitle}>Accesos rápidos</Text>

        <View style={styles.actions}>
          <ActionCard
            title="Vehículos"
            description="Consultar los vehículos registrados"
            icon="🚗"
            onPress={() => router.push('/(admin)/vehiculos' as never)}
          />

          <ActionCard
            title="Inventario"
            description="Revisar repuestos y proveedores"
            icon="📦"
            onPress={() => router.push('/(admin)/inventario' as never)}
          />
        </View>

        {notifications.length > 0 ? (
          <View style={styles.ordersList}>
            <Text style={styles.sectionTitle}>Avisos del taller</Text>
            {notifications.slice(0, 3).map((notice) => (
              <View key={notice.id} style={styles.orderCard}>
                <View style={styles.orderTop}>
                  <Text style={styles.orderId}>{notice.title}</Text>
                  <StatusPill
                    label={notice.read ? 'Leído' : 'Nuevo'}
                    tone={notice.priority === 'critical' ? 'danger' : 'warning'}
                  />
                </View>
                <Text style={styles.vehicleName}>{notice.message}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Órdenes recientes</Text>
          <Text style={styles.orderCount}>
            {ordersError ? 'No disponibles' : `${orders.length} registradas`}
          </Text>
        </View>

        {ordersError ? (
          <EmptyState
            title="Órdenes no disponibles"
            message="No se pudo obtener la información de las órdenes. Intenta nuevamente más tarde."
          />
        ) : recentOrders.length === 0 ? (
          <EmptyState
            title="Sin órdenes registradas"
            message="Cuando existan órdenes de trabajo, aparecerán en esta sección."
          />
        ) : (
          <View style={styles.ordersList}>
            {recentOrders.map((order) => {
              const vehicle = vehicleById.get(order.vehicleId);
              const statusLabel =
                ORDER_STATUS_LABELS[order.status] ?? order.status;

              return (
                <Pressable
                  key={order.id}
                  style={({ pressed }) => [
                    styles.orderCard,
                    pressed && styles.orderCardPressed,
                  ]}
                  onPress={() =>
                    router.push(`/(admin)/ordenes/${order.id}` as never)
                  }
                  accessibilityRole="button"
                >
                  <View style={styles.orderTop}>
                    <Text style={styles.orderId}>
                      OT {order.id.toUpperCase()}
                    </Text>
                    <Text style={styles.orderDate}>
                      {new Date(order.updatedAt).toLocaleDateString('es-CL')}
                    </Text>
                  </View>

                  <Text style={styles.vehicleName}>
                    {vehicle
                      ? `${vehicle.brand} ${vehicle.model} · ${vehicle.plate}`
                      : `Vehículo ${order.vehicleId}`}
                  </Text>

                  <View style={styles.statusContainer}>
                    <Text style={styles.statusText}>{statusLabel}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        <Text style={styles.footer}>
          Desliza hacia abajo para actualizar la información.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

interface MetricCardProps {
  label: string;
  value: number;
  accent: string;
}

function MetricCard({ label, value, accent }: MetricCardProps) {
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricAccent, { backgroundColor: accent }]} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

interface ActionCardProps {
  title: string;
  description: string;
  icon: string;
  onPress: () => void;
}

function ActionCard({
  title,
  description,
  icon,
  onPress,
}: ActionCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.actionCard,
        pressed && styles.actionCardPressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <View style={styles.actionCardTop}>
        <View style={styles.actionIcon}>
          <Text style={styles.actionIconText}>{icon}</Text>
        </View>

        <Text style={styles.actionArrow}>↗</Text>
      </View>

      <Text style={styles.actionTitle}>{title}</Text>

      <Text style={styles.actionDescription}>{description}</Text>

      <Text style={styles.actionLink}>Explorar sección →</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  title: {
    marginTop: spacing.xs,
    color: colors.primary,
    fontSize: 27,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  logoutButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  logoutText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  sectionTitle: {
    color: colors.primary,
    fontSize: 19,
    fontWeight: '900',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  metricCard: {
    width: '47%',
    flexGrow: 1,
    minHeight: 112,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricAccent: {
    width: 30,
    height: 4,
    borderRadius: radius.pill,
    marginBottom: spacing.sm,
  },
  metricValue: {
    color: colors.primary,
    fontSize: 29,
    fontWeight: '900',
  },
  metricLabel: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  actionCard: {
    flex: 1,
    minWidth: '45%',
    minHeight: 170,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'space-between',
  },
  actionCardPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
  actionCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  actionIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconText: {
    fontSize: 23,
  },
  actionArrow: {
    color: colors.accent,
    fontSize: 22,
    fontWeight: '900',
  },
  actionTitle: {
    color: colors.primary,
    fontSize: 17,
    fontWeight: '900',
  },
  actionDescription: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  actionLink: {
    marginTop: spacing.md,
    color: colors.accent,
    fontSize: 12,
    fontWeight: '900',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  orderCount: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  ordersList: {
    gap: spacing.md,
  },
  orderCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  orderCardPressed: {
    opacity: 0.75,
  },
  orderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  orderId: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '900',
  },
  orderDate: {
    color: colors.textMuted,
    fontSize: 11,
  },
  vehicleName: {
    marginTop: spacing.sm,
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  statusContainer: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  statusText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  footer: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
});
