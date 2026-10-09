import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  Button,
  Card,
  ErrorMessage,
  Loading,
} from '@/components/common';

import { AppScreen } from '@/components/layout/AppScreen';
import { colors, radius, spacing } from '@/constants/theme';

import type { WorkOrder } from '@/models/order.model';
import type { Vehicle } from '@/models/vehicle.model';

import { ordersService } from '@/services/orders.service';
import { vehiclesService } from '@/services/vehicles.service';

interface OrderDetailScreenProps {
  orderId: string;
}

function getStatusLabel(
  status: WorkOrder['status'],
): string {
  const labels: Record<WorkOrder['status'], string> = {
    recibido: 'Recibido',
    esperando_diagnostico: 'Esperando diagnóstico',
    esperando_aprobacion_presupuesto:
      'Esperando aprobación',
    pausado_por_presupuesto_rechazado:
      'Presupuesto rechazado',
    esperando_repuestos: 'Esperando repuestos',
    en_reparacion: 'En reparación',
    control_calidad: 'Control de calidad',
    listo_para_entrega: 'Listo para entrega',
    entregado: 'Entregado',
    cancelado: 'Cancelado',
  };

  return labels[status];
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

export function OrderDetailScreen({
  orderId,
}: OrderDetailScreenProps) {
  const router = useRouter();

  const [order, setOrder] = useState<WorkOrder | null>(
    null,
  );

  const [vehicle, setVehicle] =
    useState<Vehicle | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const loadDetail = useCallback(
    async (refresh = false) => {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setErrorMessage(null);

      try {
        const orderResult =
          await ordersService.getOrderById(orderId);

        setOrder(orderResult);

        const vehicleResult =
          await vehiclesService.getVehicleById(
            orderResult.vehicleId,
          );

        setVehicle(vehicleResult);
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : 'No fue posible cargar la orden de trabajo.';

        setErrorMessage(message);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [orderId],
  );

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  if (isLoading) {
    return (
      <AppScreen
        eyebrow="Orden de trabajo"
        title="Detalle"
        subtitle="Cargando información..."
      >
        <Loading
          message="Cargando orden..."
          testID="order-detail-loading"
        />
      </AppScreen>
    );
  }

  if (errorMessage || !order) {
    return (
      <AppScreen
        eyebrow="Orden de trabajo"
        title="Detalle"
        subtitle="No fue posible mostrar la información solicitada."
      >
        <ErrorMessage
          title="No se pudo cargar la orden"
          message={
            errorMessage ??
            'La orden solicitada no existe o no está disponible para tu cuenta.'
          }
          onRetry={() => {
            void loadDetail();
          }}
          retryLabel="Reintentar"
          testID="order-detail-error"
        />

        <Button
          title="Volver"
          variant="outline"
          onPress={() => router.back()}
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen
      eyebrow="Orden de trabajo"
      title={`Orden #${order.id}`}
      subtitle={getStatusLabel(order.status)}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              void loadDetail(true);
            }}
          />
        }
        contentContainerStyle={styles.content}
        testID="order-detail"
      >
        <Card style={styles.statusCard}>
          <Text style={styles.statusLabel}>
            ESTADO ACTUAL
          </Text>

          <Text style={styles.statusValue}>
            {getStatusLabel(order.status)}
          </Text>
        </Card>

        <Card
          title="Vehículo"
          subtitle="Vehículo asociado a esta orden"
        >
          {vehicle ? (
            <View style={styles.vehicleInfo}>
              <InfoRow
                label="Patente"
                value={vehicle.plate}
              />

              <InfoRow
                label="Marca"
                value={
                  vehicle.brand || 'Sin información'
                }
              />

              <InfoRow
                label="Modelo"
                value={
                  vehicle.model || 'Sin información'
                }
              />

              <InfoRow
                label="Año"
                value={
                  vehicle.year !== null
                    ? String(vehicle.year)
                    : 'Sin información'
                }
              />
            </View>
          ) : (
            <Text style={styles.mutedText}>
              No fue posible obtener el vehículo asociado.
            </Text>
          )}
        </Card>

        <Card
          title="Información de la orden"
          subtitle="Datos registrados en el sistema"
        >
          <View style={styles.infoList}>
            <InfoRow
              label="ID de orden"
              value={`#${order.id}`}
            />

            <InfoRow
              label="ID de ingreso"
              value={order.intakeId}
            />

            <InfoRow
              label="Cliente"
              value={order.clientId}
            />

            <InfoRow
              label="Mecánico asignado"
              value={
                order.assignedMechanicId ??
                'Sin mecánico asignado'
              }
            />

            <InfoRow
              label="Creada por"
              value={order.createdById}
            />

            <InfoRow
              label="Fecha de creación"
              value={formatDate(order.createdAt)}
            />

            <InfoRow
              label="Última actualización"
              value={formatDate(order.updatedAt)}
            />
          </View>
        </Card>

        <Button
          title="Volver"
          variant="outline"
          onPress={() => router.back()}
        />
      </ScrollView>
    </AppScreen>
  );
}

interface InfoRowProps {
  label: string;
  value: string;
}

function InfoRow({
  label,
  value,
}: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
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

  statusCard: {
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
  },

  statusLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  statusValue: {
    marginTop: spacing.xs,
    color: colors.primary,
    fontSize: 22,
    fontWeight: '900',
  },

  vehicleInfo: {
    gap: spacing.md,
  },

  infoList: {
    gap: spacing.md,
  },

  infoRow: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
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
    fontSize: 15,
    fontWeight: '700',
  },

  mutedText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
});