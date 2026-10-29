
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { AppScreen } from '@/components/layout/AppScreen';
import { ordersService } from '@/services/orders.service';
import { useAuthStore } from '@/stores/authStore';
import type { WorkOrder } from '@/models/order.model';
import {
  ORDER_STATUS_LABELS,
} from '@/constants/orderStatus';

const COLORS = {
  blue: '#15283F',
  orange: '#F26A2E',
  background: '#F5F7FA',
  white: '#FFFFFF',
  secondary: '#F0F4F8',
  text: '#263445',
  muted: '#66758A',
  border: '#DCE4EC',
  danger: '#B42318',
};

export default function AssignedOrdersScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const result = await ordersService.getOrders();
      setOrders(result);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'No fue posible cargar las órdenes asignadas.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const assignedOrders = useMemo(() => {
    if (!user?.id) {
      return [];
    }

    return orders.filter(
      (order) =>
        order.assignedMechanicId !== null &&
        String(order.assignedMechanicId) === String(user.id),
    );
  }, [orders, user?.id]);

  const openOrder = (orderId: string) => {
    router.push({
      pathname: '/(mecanico)/ordenes/[id]',
      params: { id: orderId },
    });
  };

  return (
    <AppScreen title="Mis órdenes asignadas">
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadOrders(true)}
            tintColor={COLORS.orange}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>TALLERCONNECT</Text>
          <Text style={styles.title}>Mis órdenes</Text>
          <Text style={styles.subtitle}>
            Revisa los trabajos que tienes asignados y entra a cada orden
            para consultar sus detalles.
          </Text>
        </View>

        <View style={styles.summary}>
          <View style={styles.summaryIcon}>
            <Text style={styles.summaryIconText}>OT</Text>
          </View>

          <View style={styles.summaryTextContainer}>
            <Text style={styles.summaryLabel}>Órdenes asignadas</Text>
            <Text style={styles.summaryDescription}>
              Trabajos asociados a tu usuario
            </Text>
          </View>

          <Text style={styles.summaryCount}>
            {loading ? '—' : assignedOrders.length}
          </Text>
        </View>

        {loading ? (
          <View style={styles.stateContainer}>
            <ActivityIndicator size="large" color={COLORS.orange} />
            <Text style={styles.stateText}>Cargando tus órdenes...</Text>
          </View>
        ) : error ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>No pudimos cargar las órdenes</Text>
            <Text style={styles.stateText}>{error}</Text>

            <Pressable
              accessibilityRole="button"
              onPress={() => void loadOrders()}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Reintentar</Text>
            </Pressable>
          </View>
        ) : assignedOrders.length === 0 ? (
          <View style={styles.stateCard}>
            <Text style={styles.emptyIcon}>✓</Text>
            <Text style={styles.stateTitle}>
              No tienes órdenes asignadas
            </Text>
            <Text style={styles.stateText}>
              Cuando se asigne una orden a tu usuario, aparecerá en esta
              pantalla.
            </Text>

            <Pressable
              accessibilityRole="button"
              onPress={() => void loadOrders(true)}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>
                Actualizar listado
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.list}>
            <Text style={styles.sectionTitle}>Tus trabajos</Text>

            {assignedOrders.map((order) => {
              const statusLabel =
                ORDER_STATUS_LABELS[order.status] ?? order.status;

              return (
                <Pressable
                  key={order.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Abrir orden ${order.id}, estado ${statusLabel}`}
                  onPress={() => openOrder(order.id)}
                  style={({ pressed }) => [
                    styles.orderCard,
                    pressed && styles.orderCardPressed,
                  ]}
                >
                  <View style={styles.orderTop}>
                    <View style={styles.orderNumberContainer}>
                      <Text style={styles.orderCaption}>ORDEN DE TRABAJO</Text>
                      <Text style={styles.orderNumber}>#{order.id}</Text>
                    </View>

                    <View style={styles.arrowCircle}>
                      <Text style={styles.arrow}>›</Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <Text style={styles.detailLabel}>Estado actual</Text>

                  <View style={styles.statusContainer}>
                    <View style={styles.statusDot} />
                    <Text style={styles.statusText}>{statusLabel}</Text>
                  </View>

                  <View style={styles.metadata}>
                    <View style={styles.metadataItem}>
                      <Text style={styles.metadataLabel}>Vehículo ID</Text>
                      <Text style={styles.metadataValue}>
                        {order.vehicleId || 'No disponible'}
                      </Text>
                    </View>

                    <View style={styles.metadataItem}>
                      <Text style={styles.metadataLabel}>Ingreso</Text>
                      <Text style={styles.metadataValue}>
                        {order.intakeId || 'No disponible'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.openDetail}>
                    Ver detalle de la orden →
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <Text style={styles.footer}>
          Desliza hacia abajo para actualizar el listado.
        </Text>
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 32,
    backgroundColor: COLORS.background,
  },
  header: {
    marginBottom: 22,
  },
  eyebrow: {
    color: COLORS.orange,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: 8,
  },
  title: {
    color: COLORS.blue,
    fontSize: 29,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.blue,
    borderRadius: 18,
    padding: 17,
    marginBottom: 26,
  },
  summaryIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: COLORS.orange,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  summaryIconText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '900',
  },
  summaryTextContainer: {
    flex: 1,
  },
  summaryLabel: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  summaryDescription: {
    color: '#D5DFEA',
    fontSize: 12,
    marginTop: 4,
  },
  summaryCount: {
    color: COLORS.white,
    fontSize: 27,
    fontWeight: '800',
    marginLeft: 8,
  },
  list: {
    gap: 14,
  },
  sectionTitle: {
    color: COLORS.blue,
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 2,
  },
  orderCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  orderCardPressed: {
    opacity: 0.78,
  },
  orderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderNumberContainer: {
    flex: 1,
  },
  orderCaption: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 5,
  },
  orderNumber: {
    color: COLORS.blue,
    fontSize: 21,
    fontWeight: '800',
  },
  arrowCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: {
    color: COLORS.blue,
    fontSize: 27,
    lineHeight: 30,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 15,
  },
  detailLabel: {
    color: COLORS.muted,
    fontSize: 12,
    marginBottom: 8,
  },
  statusContainer: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF2E9',
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.orange,
    marginRight: 7,
  },
  statusText: {
    color: COLORS.blue,
    fontSize: 12,
    fontWeight: '700',
  },
  metadata: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  metadataItem: {
    flex: 1,
    minWidth: 0,
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    padding: 11,
  },
  metadataLabel: {
    color: COLORS.muted,
    fontSize: 11,
    marginBottom: 5,
  },
  metadataValue: {
    color: COLORS.blue,
    fontSize: 13,
    fontWeight: '700',
  },
  openDetail: {
    color: COLORS.orange,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 17,
  },
  stateContainer: {
    alignItems: 'center',
    paddingVertical: 38,
  },
  stateCard: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: 22,
    alignItems: 'center',
  },
  stateTitle: {
    color: COLORS.blue,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 9,
  },
  stateText: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyIcon: {
    color: COLORS.orange,
    fontSize: 34,
    fontWeight: '800',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: COLORS.orange,
    borderRadius: 12,
    paddingHorizontal: 22,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryButton: {
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: COLORS.blue,
    fontSize: 13,
    fontWeight: '800',
  },
  footer: {
    color: COLORS.muted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 24,
  },
});
