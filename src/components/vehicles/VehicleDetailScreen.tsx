import { useCallback, useEffect, useState } from 'react';

import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useRouter } from 'expo-router';

import {
  Button,
  Card,
  EmptyState,
  ErrorMessage,
  Loading,
} from '@/components/common';

import { AppScreen } from '@/components/layout/AppScreen';

import { colors, radius, spacing } from '@/constants/theme';

import type { UserRole } from '@/constants/roles';

import type { Vehicle } from '@/models/vehicle.model';

import type { WorkOrder } from '@/models/order.model';

import { vehiclesService } from '@/services/vehicles.service';

import { ordersService } from '@/services/orders.service';

interface VehicleDetailScreenProps {
  role: UserRole;
  vehicleId: string;
}

function getVehicleDetailPath(
  role: UserRole,
  vehicleId: string,
) {
  return `/(cliente)/vehiculos/${vehicleId}`;
}

function getOrderDetailPath(
  role: UserRole,
  orderId: string,
) {
  switch (role) {
    case 'cliente':
      return `/(cliente)/ordenes/${orderId}`;

    case 'mecanico':
      return `/(mecanico)/ordenes/${orderId}`;

    case 'administrador':
      return `/(admin)/ordenes/${orderId}`;

    default:
      return `/(cliente)/ordenes/${orderId}`;
  }
}

function getRoleTitle(role: UserRole): string {
  switch (role) {
    case 'cliente':
      return 'Detalle de mi vehículo';

    case 'mecanico':
      return 'Detalle del vehículo';

    case 'administrador':
      return 'Detalle del vehículo';

    default:
      return 'Detalle del vehículo';
  }
}

function getRoleSubtitle(role: UserRole): string {
  switch (role) {
    case 'cliente':
      return 'Información del vehículo asociado a tu cuenta.';

    case 'mecanico':
      return 'Información del vehículo relacionado con tus órdenes.';

    case 'administrador':
      return 'Información completa del vehículo registrado.';

    default:
      return 'Información del vehículo.';
  }
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Sin información';
  }

  return date.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getStatusLabel(status: WorkOrder['status']): string {
  const labels: Record<WorkOrder['status'], string> = {
    recibido: 'Recibido',
    esperando_diagnostico: 'Esperando diagnóstico',
    esperando_aprobacion_presupuesto:
      'Esperando aprobación de presupuesto',
    pausado_por_presupuesto_rechazado:
      'Presupuesto rechazado',
    esperando_repuestos: 'Esperando repuestos',
    en_reparacion: 'En reparación',
    control_calidad: 'Control de calidad',
    listo_para_entrega: 'Listo para entrega',
    entregado: 'Entregado',
    cancelado: 'Cancelado',
  };

  return labels[status] ?? status;
}

export function VehicleDetailScreen({
  role,
  vehicleId,
}: VehicleDetailScreenProps) {
  const router = useRouter();

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [orders, setOrders] = useState<WorkOrder[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(
    async (refresh = false) => {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setErrorMessage(null);

      try {
        const [vehicleResult, ordersResult] =
          await Promise.all([
            vehiclesService.getVehicleById(vehicleId),
            ordersService.getOrders(),
          ]);

        setVehicle(vehicleResult);

        const vehicleOrders = ordersResult.filter(
          (order) => order.vehicleId === vehicleResult.id,
        );

        setOrders(vehicleOrders);
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : 'No fue posible cargar el detalle del vehículo.';

        setErrorMessage(message);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [vehicleId],
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  if (isLoading) {
    return (
      <AppScreen
        eyebrow="Vehículos"
        title="Detalle"
        subtitle="Cargando información..."
      >
        <Loading
          message="Cargando vehículo..."
          testID="vehicle-detail-loading"
        />
      </AppScreen>
    );
  }

  if (errorMessage || !vehicle) {
    return (
      <AppScreen
        eyebrow="Vehículos"
        title="Detalle"
        subtitle={getRoleSubtitle(role)}
      >
        <ErrorMessage
          title="No se pudo cargar el vehículo"
          message={
            errorMessage ??
            'El vehículo solicitado no está disponible.'
          }
          onRetry={() => {
            void loadData();
          }}
          retryLabel="Reintentar"
          testID="vehicle-detail-error"
        />

        <Button
          title="Volver a vehículos"
          variant="outline"
          onPress={() => {
            router.back();
          }}
          testID="vehicle-detail-back"
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen
      eyebrow="Vehículos"
      title={getRoleTitle(role)}
      subtitle={getRoleSubtitle(role)}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        testID="vehicle-detail"
      >
        <Card style={styles.vehicleCard}>
          <View style={styles.header}>
            <View style={styles.identity}>
              <Text style={styles.label}>
                PATENTE
              </Text>

              <Text style={styles.plate}>
                {vehicle.plate}
              </Text>
            </View>

            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                VEHÍCULO
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoGrid}>
            <InfoItem
              label="Marca"
              value={vehicle.brand || 'Sin información'}
            />

            <InfoItem
              label="Modelo"
              value={vehicle.model || 'Sin información'}
            />

            <InfoItem
              label="Año"
              value={
                vehicle.year !== null
                  ? String(vehicle.year)
                  : 'Sin información'
              }
            />

            <InfoItem
              label="Kilometraje"
              value={
                vehicle.mileage !== null
                  ? `${vehicle.mileage.toLocaleString(
                      'es-CL',
                    )} km`
                  : 'Sin información'
              }
            />

            <InfoItem
              label="Identificador"
              value={vehicle.id}
            />
          </View>
        </Card>

        <Button
          title={
            isRefreshing
              ? 'Actualizando...'
              : 'Actualizar datos'
          }
          loading={isRefreshing}
          variant="outline"
          onPress={() => {
            void loadData(true);
          }}
          testID="vehicle-detail-refresh"
        />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Órdenes de trabajo
          </Text>

          <Text style={styles.sectionSubtitle}>
            {orders.length === 0
              ? 'No hay órdenes asociadas.'
              : `${orders.length} ${
                  orders.length === 1
                    ? 'orden asociada'
                    : 'órdenes asociadas'
                }`}
          </Text>
        </View>

        {orders.length === 0 ? (
          <EmptyState
            title="Sin órdenes de trabajo"
            message="Este vehículo no tiene órdenes visibles para tu cuenta."
            testID="vehicle-detail-orders-empty"
          />
        ) : (
          orders.map((order) => (
            <Card
              key={order.id}
              style={styles.orderCard}
            >
              <View style={styles.orderHeader}>
                <View style={styles.orderIdentity}>
                  <Text style={styles.orderLabel}>
                    ORDEN DE TRABAJO
                  </Text>

                  <Text style={styles.orderId}>
                    #{order.id}
                  </Text>
                </View>

                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>
                    {getStatusLabel(order.status)}
                  </Text>
                </View>
              </View>

              <View style={styles.orderInfo}>
                <InfoItem
                  label="Fecha de creación"
                  value={formatDate(order.createdAt)}
                />

                <InfoItem
                  label="Última actualización"
                  value={formatDate(order.updatedAt)}
                />
              </View>

              <Button
                title="Ver detalle de la orden"
                onPress={() => {
                  router.push(
                    getOrderDetailPath(
                      role,
                      order.id,
                    ) as never,
                  );
                }}
                testID={`vehicle-order-${order.id}`}
              />
            </Card>
          ))
        )}

        <Button
          title="Volver a vehículos"
          variant="outline"
          onPress={() => {
            router.back();
          }}
          testID="vehicle-detail-back-bottom"
        />
      </ScrollView>
    </AppScreen>
  );
}

interface InfoItemProps {
  label: string;
  value: string;
}

function InfoItem({
  label,
  value,
}: InfoItemProps) {
  return (
    <View style={styles.infoItem}>
      <Text style={styles.infoLabel}>
        {label}
      </Text>

      <Text style={styles.infoValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },

  vehicleCard: {
    borderRadius: radius.lg,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },

  identity: {
    flex: 1,
  },

  label: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },

  plate: {
    marginTop: spacing.xs,
    color: colors.primary,
    fontSize: 28,
    fontWeight: '900',
  },

  badge: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primarySoft,
  },

  badgeText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
  },

  divider: {
    height: 1,
    marginVertical: spacing.md,
    backgroundColor: colors.border,
  },

  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing.lg,
  },

  infoItem: {
    width: '50%',
    paddingRight: spacing.sm,
  },

  infoLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  infoValue: {
    marginTop: spacing.xs,
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },

  sectionHeader: {
    marginTop: spacing.sm,
  },

  sectionTitle: {
    color: colors.primary,
    fontSize: 21,
    fontWeight: '900',
  },

  sectionSubtitle: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: 14,
  },

  orderCard: {
    borderRadius: radius.lg,
  },

  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },

  orderIdentity: {
    flex: 1,
  },

  orderLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  orderId: {
    marginTop: spacing.xs,
    color: colors.primary,
    fontSize: 22,
    fontWeight: '900',
  },

  statusBadge: {
    maxWidth: 150,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.infoSoft,
  },

  statusText: {
    color: colors.info,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },

  orderInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.lg,
    rowGap: spacing.md,
  },
});