import { useCallback, useMemo } from 'react';
import { useRouter } from 'expo-router';
import {
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Button,
  Card,
  EmptyState,
  ErrorMessage,
  Loading,
} from '@/components/common';
import { StatusPill, type StatusTone } from '@/components/ui/StatusPill';
import {
  ORDER_STATUS,
  getOrderStatusLabel,
  type WorkOrderStatus,
} from '@/constants/orderStatus';
import { colors, radius, spacing } from '@/constants/theme';
import { useDataQuery } from '@/hooks/useDataQuery';
import type { WorkOrder } from '@/models/order.model';
import type { Vehicle } from '@/models/vehicle.model';
import { ordersService } from '@/services/orders.service';
import { vehiclesService } from '@/services/vehicles.service';
import { useAuthStore } from '@/stores/authStore';
import { formatDate } from '@/utils/formatters';

interface ClientDashboardData {
  orders: WorkOrder[];
  vehicles: Vehicle[];
}

function getOrderStatusTone(status: WorkOrderStatus): StatusTone {
  switch (status) {
    case ORDER_STATUS.LISTO_PARA_ENTREGA:
    case ORDER_STATUS.ENTREGADO:
      return 'success';
    case ORDER_STATUS.ESPERANDO_APROBACION_PRESUPUESTO:
    case ORDER_STATUS.ESPERANDO_REPUESTOS:
      return 'warning';
    case ORDER_STATUS.PAUSADO_POR_PRESUPUESTO_RECHAZADO:
    case ORDER_STATUS.CANCELADO:
      return 'danger';
    case ORDER_STATUS.EN_REPARACION:
    case ORDER_STATUS.CONTROL_CALIDAD:
    case ORDER_STATUS.ESPERANDO_DIAGNOSTICO:
    default:
      return 'info';
  }
}

interface TimelineStage {
  title: string;
  detail: string;
  completed?: boolean;
  active?: boolean;
}

function buildOrderTimeline(status: WorkOrderStatus): TimelineStage[] {
  switch (status) {
    case ORDER_STATUS.RECIBIDO:
      return [
        { title: 'Vehículo recibido', detail: 'Ingreso registrado en taller', active: true },
        { title: 'Diagnóstico', detail: 'Pendiente de revisión' },
        { title: 'Reparación', detail: 'Pendiente' },
        { title: 'Entrega', detail: 'Pendiente' },
      ];
    case ORDER_STATUS.ESPERANDO_DIAGNOSTICO:
    case ORDER_STATUS.ESPERANDO_APROBACION_PRESUPUESTO:
    case ORDER_STATUS.PAUSADO_POR_PRESUPUESTO_RECHAZADO:
      return [
        { title: 'Vehículo recibido', detail: 'Registro completado', completed: true },
        {
          title: 'Diagnóstico',
          detail:
            status === ORDER_STATUS.ESPERANDO_APROBACION_PRESUPUESTO
              ? 'Esperando aprobación del presupuesto'
              : status === ORDER_STATUS.PAUSADO_POR_PRESUPUESTO_RECHAZADO
                ? 'Presupuesto rechazado'
                : 'Diagnóstico en curso',
          active: true,
        },
        { title: 'Reparación', detail: 'Pendiente' },
        { title: 'Entrega', detail: 'Pendiente' },
      ];
    case ORDER_STATUS.ESPERANDO_REPUESTOS:
    case ORDER_STATUS.EN_REPARACION:
    case ORDER_STATUS.CONTROL_CALIDAD:
      return [
        { title: 'Vehículo recibido', detail: 'Registro completado', completed: true },
        { title: 'Diagnóstico', detail: 'Revisión finalizada', completed: true },
        {
          title: 'Reparación',
          detail:
            status === ORDER_STATUS.ESPERANDO_REPUESTOS
              ? 'Esperando repuestos'
              : 'Trabajo actualmente en curso',
          active: true,
        },
        { title: 'Entrega', detail: 'Pendiente' },
      ];
    case ORDER_STATUS.LISTO_PARA_ENTREGA:
      return [
        { title: 'Vehículo recibido', detail: 'Registro completado', completed: true },
        { title: 'Diagnóstico', detail: 'Revisión finalizada', completed: true },
        { title: 'Reparación', detail: 'Trabajo finalizado', completed: true },
        { title: 'Entrega', detail: 'Vehículo listo para retiro', active: true },
      ];
    case ORDER_STATUS.ENTREGADO:
      return [
        { title: 'Vehículo recibido', detail: 'Registro completado', completed: true },
        { title: 'Diagnóstico', detail: 'Revisión finalizada', completed: true },
        { title: 'Reparación', detail: 'Trabajo finalizado', completed: true },
        { title: 'Entrega', detail: 'Vehículo entregado', completed: true },
      ];
    case ORDER_STATUS.CANCELADO:
      return [
        { title: 'Vehículo recibido', detail: 'Registro completado', completed: true },
        { title: 'Diagnóstico', detail: 'Orden cancelada' },
        { title: 'Reparación', detail: 'Cancelada' },
        { title: 'Entrega', detail: 'Cancelada' },
      ];
    default:
      return [
        { title: 'Vehículo recibido', detail: 'Registro completado', completed: true },
        { title: 'Diagnóstico', detail: 'En evaluación', active: true },
        { title: 'Reparación', detail: 'Pendiente' },
        { title: 'Entrega', detail: 'Pendiente' },
      ];
  }
}

export default function ClienteScreen() {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);

  const fetchClientSummary = useCallback(async (): Promise<ClientDashboardData> => {
    const [ordersResult, vehiclesResult] = await Promise.all([
      ordersService.getOrders(),
      Promise.resolve(vehiclesService.getMyVehicles?.())
        .then((list) => (Array.isArray(list) ? list : []))
        .catch(() => [] as Vehicle[]),
    ]);

    const sortedOrders = [...(Array.isArray(ordersResult) ? ordersResult : [])].sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );

    return {
      orders: sortedOrders,
      vehicles: vehiclesResult,
    };
  }, []);

  const {
    data,
    errorMessage,
    isLoading,
    isRefreshing,
    refresh,
  } = useDataQuery(
    fetchClientSummary,
    'No fue posible consultar el resumen de tu taller.',
  );

  const orders = useMemo(() => data?.orders ?? [], [data]);
  const vehicles = useMemo(() => data?.vehicles ?? [], [data]);

  const vehicleById = useMemo(
    () => new Map(vehicles.map((vehicle) => [String(vehicle.id), vehicle])),
    [vehicles],
  );

  const activeOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          order.status !== ORDER_STATUS.ENTREGADO &&
          order.status !== ORDER_STATUS.CANCELADO,
      ),
    [orders],
  );

  const stats = useMemo(
    () => ({
      totalOrders: orders.length,
      activeOrders: activeOrders.length,
      awaitingApproval: orders.filter(
        (order) =>
          order.status === ORDER_STATUS.ESPERANDO_APROBACION_PRESUPUESTO,
      ).length,
      vehicles: vehicles.length,
    }),
    [activeOrders.length, orders, vehicles.length],
  );

  const featuredOrder = activeOrders[0] ?? orders[0] ?? null;
  const featuredVehicle = featuredOrder
    ? vehicleById.get(String(featuredOrder.vehicleId))
    : undefined;

  const handleLogout = useCallback(async () => {
    await logout();
    router.replace('/login');
  }, [logout, router]);

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={
          Platform.OS === 'ios' ? 'interactive' : 'on-drag'
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              void refresh();
            }}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Portal del cliente</Text>

          <Text accessibilityRole="header" style={styles.title}>
            Mi taller
          </Text>

          <Text style={styles.subtitle}>
            Consulta el estado de tu vehículo, órdenes de trabajo y la
            información asociada al servicio.
          </Text>
        </View>

        {errorMessage ? (
          <ErrorMessage
            testID="cliente-summary-error"
            message={errorMessage}
            onRetry={() => {
              void refresh();
            }}
          />
        ) : isLoading && !data ? (
          <Loading
            testID="cliente-summary-loading"
            message="Cargando resumen de tu taller..."
          />
        ) : (
          <>
            <View style={styles.grid} testID="cliente-summary-metrics">
              <Metric
                label="Órdenes registradas"
                value={String(stats.totalOrders)}
              />
              <Metric
                label="Órdenes activas"
                value={String(stats.activeOrders)}
              />
              <Metric
                label="Por aprobar"
                value={String(stats.awaitingApproval)}
              />
              <Metric
                label="Vehículos registrados"
                value={String(stats.vehicles)}
              />
            </View>

            {featuredOrder ? (
              <>
                <Card style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderText}>
                      <Text
                        accessibilityRole="header"
                        style={styles.cardTitle}
                      >
                        Vehículo en servicio
                      </Text>

                      <Text style={styles.cardSubtitle}>
                        Orden OT #{featuredOrder.id}
                      </Text>
                    </View>

                    <StatusPill
                      label={getOrderStatusLabel(featuredOrder.status)}
                      tone={getOrderStatusTone(featuredOrder.status)}
                      accessibilityLabel={`Estado del vehículo: ${getOrderStatusLabel(featuredOrder.status)}`}
                    />
                  </View>

                  <View style={styles.vehicleBox}>
                    <View
                      accessible
                      accessibilityLabel={`Patente: ${featuredVehicle?.plate?.trim() || `Vehículo #${featuredOrder.vehicleId}`}`}
                    >
                      <Text style={styles.smallLabel}>PATENTE</Text>

                      <Text
                        style={styles.vehiclePlate}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {featuredVehicle?.plate?.trim() ||
                          `#${featuredOrder.vehicleId}`}
                      </Text>
                    </View>

                    <View
                      accessible
                      accessibilityLabel={`Vehículo: ${
                        [
                          featuredVehicle?.brand?.trim(),
                          featuredVehicle?.model?.trim(),
                        ]
                          .filter(Boolean)
                          .join(' ') || 'Sin marca ni modelo registrados'
                      }`}
                      style={styles.vehicleInfo}
                    >
                      <Text style={styles.smallLabel}>VEHÍCULO</Text>

                      <Text
                        style={styles.vehicleService}
                        numberOfLines={2}
                        ellipsizeMode="tail"
                      >
                        {[
                          featuredVehicle?.brand?.trim(),
                          featuredVehicle?.model?.trim(),
                        ]
                          .filter(Boolean)
                          .join(' ') || 'Sin marca ni modelo registrados'}
                      </Text>
                    </View>
                  </View>
                </Card>

                <Card style={styles.card}>
                  <Text
                    accessibilityRole="header"
                    style={styles.cardTitle}
                  >
                    Seguimiento de la orden
                  </Text>

                  <Text style={styles.cardSubtitle}>
                    Estado actual del servicio.
                  </Text>

                  <View style={styles.timeline}>
                    {buildOrderTimeline(featuredOrder.status).map((stage) => (
                      <TimelineItem
                        key={stage.title}
                        title={stage.title}
                        detail={stage.detail}
                        completed={stage.completed}
                        active={stage.active}
                      />
                    ))}
                  </View>
                </Card>

                <Card style={styles.card}>
                  <Text
                    accessibilityRole="header"
                    style={styles.cardTitle}
                  >
                    Orden de trabajo
                  </Text>

                  <View style={styles.orderInfo}>
                    <InfoRow
                      label="Número"
                      value={`OT #${featuredOrder.id}`}
                    />
                    <InfoRow
                      label="Estado"
                      value={getOrderStatusLabel(featuredOrder.status)}
                    />
                    <InfoRow
                      label="Última actualización"
                      value={formatDate(featuredOrder.updatedAt)}
                    />
                    <InfoRow
                      label="Técnico"
                      value={
                        featuredOrder.assignedMechanicId
                          ? `Mecánico #${featuredOrder.assignedMechanicId}`
                          : 'Sin mecánico asignado'
                      }
                    />
                  </View>
                </Card>
              </>
            ) : null}

            <Text accessibilityRole="header" style={styles.sectionTitle}>
              Mis órdenes recientes
            </Text>

            {orders.length === 0 ? (
              <EmptyState
                testID="cliente-orders-empty"
                title="Sin órdenes registradas"
                message="No existen órdenes de trabajo asociadas a tu cuenta."
              />
            ) : (
              orders.slice(0, 5).map((order) => {
                const vehicle = vehicleById.get(String(order.vehicleId));
                const vehicleLabel = vehicle?.plate?.trim()
                  ? `Patente ${vehicle.plate.trim()}`
                  : `Vehículo #${order.vehicleId}`;

                return (
                  <Pressable
                    key={order.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Abrir orden ${order.id}`}
                    onPress={() =>
                      router.push({
                        pathname: '/(cliente)/mis-ordenes/[id]' as never,
                        params: { id: order.id },
                      })
                    }
                    style={styles.orderCard}
                  >
                    <View style={styles.orderHeader}>
                      <Text style={styles.orderNumber}>OT #{order.id}</Text>
                      <Text style={styles.arrow}>›</Text>
                    </View>
                    <Text
                      style={styles.info}
                      numberOfLines={2}
                      ellipsizeMode="tail"
                    >
                      Estado: {getOrderStatusLabel(order.status)}
                    </Text>
                    <Text
                      style={styles.info}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {vehicleLabel}
                    </Text>
                    <Text style={styles.link}>Ver detalle de la orden →</Text>
                  </Pressable>
                );
              })
            )}
          </>
        )}

        <Button
          title="Ver mis vehículos"
          onPress={() => router.push('/(cliente)/mis-vehiculos' as never)}
          style={styles.navButton}
        />

        <Button
          title="Cerrar sesión"
          variant="outline"
          onPress={() => {
            void handleLogout();
          }}
          style={styles.logoutButton}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ==========================================
   COMPONENTES
   ========================================== */

function TimelineItem({
  title,
  detail,
  completed = false,
  active = false,
}: {
  title: string;
  detail: string;
  completed?: boolean;
  active?: boolean;
}) {
  const state = completed
    ? 'Completado'
    : active
      ? 'En curso'
      : 'Pendiente';

  return (
    <View
      accessible
      accessibilityLabel={`Etapa: ${title}. ${detail}. Estado: ${state}`}
      style={styles.timelineRow}
    >
      <View
        style={[
          styles.timelineDot,
          completed && styles.timelineCompleted,
          active && styles.timelineActive,
        ]}
      />

      <View style={styles.timelineText}>
        <Text style={styles.timelineTitle} numberOfLines={2}>
          {title}
        </Text>

        <Text style={styles.timelineDetail} numberOfLines={2}>
          {detail}
        </Text>
      </View>
    </View>
  );
}

function Metric({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}`}
      style={styles.metric}
    >
      <Text style={styles.metricValue} numberOfLines={1}>
        {value}
      </Text>

      <Text style={styles.metricLabel} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}`}
      style={styles.infoRow}
    >
      <Text style={styles.infoLabel}>{label}</Text>

      <Text style={styles.infoValue} numberOfLines={2} ellipsizeMode="tail">
        {value}
      </Text>
    </View>
  );
}

/* ==========================================
   TEMA Y ESTILOS
   ========================================== */

const localTheme = {
  background: colors.background,
  surface: colors.surface,
  surfaceSoft: colors.surfaceSoft,
  border: colors.border,
  primary: colors.primary,
  text: colors.text,
  textSecondary: colors.textSecondary,
  textMuted: colors.textSecondary,
  accent: colors.accent,
  success: colors.success,
  warning: colors.warning,
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: localTheme.background,
  },
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  header: {
    marginTop: spacing.xs,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: localTheme.accent,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: localTheme.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: localTheme.textSecondary,
    marginTop: 6,
    lineHeight: 21,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: localTheme.primary,
    marginTop: spacing.xs,
  },
  card: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: localTheme.surface,
    borderWidth: 1,
    borderColor: localTheme.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    color: localTheme.text,
    fontSize: 18,
    fontWeight: '900',
  },
  cardSubtitle: {
    color: localTheme.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  vehicleBox: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: localTheme.surfaceSoft,
    borderWidth: 1,
    borderColor: localTheme.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  vehicleInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  smallLabel: {
    color: localTheme.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  vehiclePlate: {
    color: localTheme.primary,
    fontSize: 22,
    fontWeight: '900',
    marginTop: 4,
    letterSpacing: 1.2,
  },
  vehicleService: {
    color: localTheme.text,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 4,
    textAlign: 'right',
  },
  timeline: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: localTheme.border,
    marginTop: 4,
  },
  timelineCompleted: {
    backgroundColor: localTheme.success,
  },
  timelineActive: {
    backgroundColor: localTheme.warning,
  },
  timelineText: {
    flex: 1,
  },
  timelineTitle: {
    color: localTheme.text,
    fontWeight: '800',
    fontSize: 14,
  },
  timelineDetail: {
    color: localTheme.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  metric: {
    width: '47%',
    flexGrow: 1,
    minHeight: 96,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: localTheme.surface,
    borderWidth: 1,
    borderColor: localTheme.border,
    justifyContent: 'center',
  },
  metricValue: {
    color: localTheme.primary,
    fontSize: 22,
    fontWeight: '900',
  },
  metricLabel: {
    color: localTheme.textSecondary,
    fontSize: 12,
    marginTop: 6,
    fontWeight: '600',
  },
  orderInfo: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: localTheme.border,
  },
  infoLabel: {
    color: localTheme.textSecondary,
    fontSize: 13,
  },
  infoValue: {
    flex: 1,
    textAlign: 'right',
    color: localTheme.text,
    fontWeight: '800',
    fontSize: 13,
  },
  orderCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: localTheme.surface,
    borderWidth: 1,
    borderColor: localTheme.border,
    gap: spacing.xs,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderNumber: {
    fontSize: 17,
    fontWeight: '900',
    color: localTheme.primary,
  },
  arrow: {
    fontSize: 20,
    fontWeight: '900',
    color: localTheme.accent,
  },
  info: {
    fontSize: 13,
    color: localTheme.textSecondary,
  },
  link: {
    marginTop: spacing.xs,
    fontSize: 13,
    fontWeight: '800',
    color: localTheme.accent,
  },
  navButton: {
    marginTop: spacing.xs,
  },
  logoutButton: {
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    borderColor: colors.border,
  },
});
