
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  Button,
  EmptyState,
  ErrorMessage,
  Loading,
} from '@/components/common';
import { AppScreen } from '@/components/layout/AppScreen';
import { StatusPill } from '@/components/ui/StatusPill';
import { ORDER_STATUS_LABELS } from '@/constants/orderStatus';
import { colors, radius, spacing } from '@/constants/theme';
import type { WorkOrder } from '@/models/order.model';
import type { Vehicle } from '@/models/vehicle.model';
import { ordersService } from '@/services/orders.service';
import { vehiclesService } from '@/services/vehicles.service';

type OrderFilter = 'todas' | 'activas' | 'finalizadas';

export default function AdminOrdersScreen() {
  const router = useRouter();

  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [vehiclesError, setVehiclesError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<OrderFilter>('todas');

  const loadData = useCallback(async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setOrdersError(null);
    setVehiclesError(null);

    try {
      const [ordersResult, vehiclesResult] = await Promise.allSettled([
        ordersService.getOrders(),
        vehiclesService.getVehicles(),
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
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => loadData());
  }, [loadData]);

  const vehicleById = useMemo(
    () => new Map(vehicles.map((vehicle) => [vehicle.id, vehicle])),
    [vehicles],
  );

  const filteredOrders = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return [...orders]
      .filter((order) => {
        if (
          filter === 'activas' &&
          (order.status === 'entregado' || order.status === 'cancelado')
        ) {
          return false;
        }

        if (
          filter === 'finalizadas' &&
          order.status !== 'entregado' &&
          order.status !== 'cancelado'
        ) {
          return false;
        }

        if (!normalizedSearch) {
          return true;
        }

        const vehicle = vehicleById.get(order.vehicleId);
        const statusLabel =
          ORDER_STATUS_LABELS[order.status] ?? order.status;

        const searchableText = [
          order.id,
          order.vehicleId,
          vehicle?.plate,
          vehicle?.brand,
          vehicle?.model,
          statusLabel,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return searchableText.includes(normalizedSearch);
      })
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() -
          new Date(a.updatedAt).getTime(),
      );
  }, [orders, vehicleById, search, filter]);

  const openOrderDetail = (orderId: string) => {
    router.push(`/(admin)/ordenes/${orderId}` as never);
  };

  if (isLoading) {
    return (
      <AppScreen
        eyebrow="Administración"
        title="Órdenes de trabajo"
        subtitle="Consulta y seguimiento de las órdenes del taller."
      >
        <Loading
          message="Cargando órdenes de trabajo..."
          testID="admin-orders-loading"
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen
      eyebrow="Administración"
      title="Órdenes de trabajo"
      subtitle="Consulta y seguimiento de las órdenes registradas en el taller."
    >
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{orders.length}</Text>
          <Text style={styles.summaryLabel}>Total de órdenes</Text>
        </View>

        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>
            {
              orders.filter(
                (order) =>
                  order.status !== 'entregado' &&
                  order.status !== 'cancelado',
              ).length
            }
          </Text>
          <Text style={styles.summaryLabel}>En proceso</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Text style={styles.searchLabel}>Buscar órdenes</Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="ID, patente, vehículo o estado..."
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Buscar órdenes"
          testID="admin-orders-search"
        />
      </View>

      <View style={styles.filters}>
        <FilterButton
          label="Todas"
          selected={filter === 'todas'}
          onPress={() => setFilter('todas')}
        />
        <FilterButton
          label="Activas"
          selected={filter === 'activas'}
          onPress={() => setFilter('activas')}
        />
        <FilterButton
          label="Finalizadas"
          selected={filter === 'finalizadas'}
          onPress={() => setFilter('finalizadas')}
        />
      </View>

      {ordersError ? (
        <ErrorMessage
          title="No se pudieron cargar las órdenes"
          message={ordersError}
          onRetry={() => void loadData()}
          retryLabel="Reintentar"
          testID="admin-orders-error"
        />
      ) : (
        <>
          {vehiclesError ? (
            <Text style={styles.warningText}>
              No fue posible cargar los datos de los vehículos. Se mostrarán
              los identificadores disponibles.
            </Text>
          ) : null}

          <View style={styles.resultsHeader}>
            <Text style={styles.resultsTitle}>Resultados</Text>
            <Text style={styles.resultsCount}>
              {filteredOrders.length} órdenes
            </Text>
          </View>

          {filteredOrders.length === 0 ? (
            <EmptyState
              title={
                orders.length === 0
                  ? 'Sin órdenes registradas'
                  : 'No se encontraron órdenes'
              }
              message={
                orders.length === 0
                  ? 'Cuando existan órdenes de trabajo, aparecerán en esta sección.'
                  : 'Prueba con otro término de búsqueda o cambia el filtro seleccionado.'
              }
              testID="admin-orders-empty"
            />
          ) : (
            <View style={styles.list}>
              {filteredOrders.map((order) => {
                const vehicle = vehicleById.get(order.vehicleId);

                return (
                  <Pressable
                    key={order.id}
                    style={({ pressed }) => [
                      styles.orderCard,
                      pressed && styles.orderCardPressed,
                    ]}
                    onPress={() => openOrderDetail(order.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Ver orden ${order.id}`}
                    testID={`admin-order-${order.id}`}
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.orderIdentity}>
                        <Text style={styles.orderLabel}>ORDEN DE TRABAJO</Text>
                        <Text style={styles.orderId}>
                          {order.id.toUpperCase()}
                        </Text>
                      </View>

                      <Text style={styles.arrow}>›</Text>
                    </View>

                    <View style={styles.divider} />

                    <Text style={styles.vehicleName}>
                      {vehicle
                        ? `${vehicle.brand} ${vehicle.model}`
                        : `Vehículo ${order.vehicleId}`}
                    </Text>

                    <Text style={styles.vehiclePlate}>
                      {vehicle?.plate ?? 'Patente no disponible'}
                    </Text>

                    <View style={styles.cardFooter}>
                      <StatusPill
                        label={
                          ORDER_STATUS_LABELS[order.status] ?? order.status
                        }
                        tone={
                          order.status === 'entregado'
                            ? 'success'
                            : order.status === 'cancelado'
                              ? 'danger'
                              : order.status ===
                                  'esperando_aprobacion_presupuesto'
                                ? 'warning'
                                : 'info'
                        }
                      />

                      <Text style={styles.orderDate}>
                        {Number.isNaN(new Date(order.updatedAt).getTime())
                          ? 'Fecha no disponible'
                          : new Date(order.updatedAt).toLocaleDateString(
                              'es-CL',
                            )}
                      </Text>
                    </View>

                    <View style={styles.mechanicRow}>
                      <Text style={styles.mechanicLabel}>Responsable:</Text>
                      <Text style={styles.mechanicValue}>
                        {order.assignedMechanicId
                          ? `Mecánico ${order.assignedMechanicId}`
                          : 'Sin mecánico asignado'}
                      </Text>
                    </View>

                    <Text style={styles.detailLink}>Ver detalle de la orden →</Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </>
      )}

      <Button
        title={isRefreshing ? 'Actualizando...' : 'Actualizar información'}
        onPress={() => void loadData(true)}
        variant="outline"
        disabled={isRefreshing}
      />
    </AppScreen>
  );
}

interface FilterButtonProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

function FilterButton({ label, selected, onPress }: FilterButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.filterButton,
        selected && styles.filterButtonSelected,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Text
        style={[
          styles.filterText,
          selected && styles.filterTextSelected,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  summary: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  summaryItem: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryValue: {
    color: colors.primary,
    fontSize: 27,
    fontWeight: '900',
  },
  summaryLabel: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  searchContainer: {
    gap: spacing.xs,
  },
  searchLabel: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  searchInput: {
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 14,
  },
  filters: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  filterButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
  },
  filterTextSelected: {
    color: colors.surface,
  },
  warningText: {
    color: colors.warning,
    fontSize: 12,
    lineHeight: 18,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultsTitle: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '900',
  },
  resultsCount: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  list: {
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
    transform: [{ scale: 0.99 }],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderIdentity: {
    flex: 1,
  },
  orderLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  orderId: {
    marginTop: spacing.xs,
    color: colors.primary,
    fontSize: 18,
    fontWeight: '900',
  },
  arrow: {
    color: colors.accent,
    fontSize: 30,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    marginVertical: spacing.md,
    backgroundColor: colors.border,
  },
  vehicleName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  vehiclePlate: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: 13,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  orderDate: {
    color: colors.textMuted,
    fontSize: 11,
  },
  mechanicRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  mechanicLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  mechanicValue: {
    color: colors.text,
    fontSize: 12,
  },
  detailLink: {
    marginTop: spacing.md,
    color: colors.accent,
    fontSize: 12,
    fontWeight: '900',
  },
});
