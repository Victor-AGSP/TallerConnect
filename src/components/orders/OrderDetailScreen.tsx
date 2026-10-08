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
  ErrorMessage,
  Loading,
} from '@/components/common';

import { AppScreen } from '@/components/layout/AppScreen';

import {
  colors,
  radius,
  spacing,
} from '@/constants/theme';

import type { UserRole } from '@/constants/roles';

import type { WorkOrder } from '@/models/order.model';

import type { Vehicle } from '@/models/vehicle.model';

import { ordersService } from '@/services/orders.service';

import { vehiclesService } from '@/services/vehicles.service';

interface OrderDetailScreenProps {
  role: UserRole;
  orderId: string;
}

function getRoleSubtitle(role: UserRole): string {
  switch (role) {
    case 'cliente':
      return 'Información de una orden asociada a tu cuenta.';

    case 'mecanico':
      return 'Información de una orden visible para tu rol.';

    case 'administrador':
      return 'Información operativa de la orden.';

    default:
      return 'Información de la orden.';
  }
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

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Sin información';
  }

  return date.toLocaleString('es-CL', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function OrderDetailScreen({
  role,
  orderId,
}: OrderDetailScreenProps) {
  const router = useRouter();

  const [order, setOrder] =
    useState<WorkOrder | null>(null);

  const [vehicle, setVehicle] =
    useState<Vehicle | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const loadData = useCallback(
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

        try {
          const vehicleResult =
            await vehiclesService.getVehicleById(
              orderResult.vehicleId,
            );

          setVehicle(vehicleResult);
        } catch {
          setVehicle(null);
        }
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : 'No fue posible cargar la orden.';

        setErrorMessage(message);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [orderId],
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  if (isLoading) {
    return (
      <AppScreen
        eyebrow="Órdenes"
        title="Detalle de orden"
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
        eyebrow="Órdenes"
        title="Detalle de orden"
        subtitle={getRoleSubtitle(role)}
      >
        <ErrorMessage
          title="No se pudo cargar la orden"
          message={
            errorMessage ??
            'La orden solicitada no está disponible.'
          }
          onRetry={() => {
            void loadData();
          }}
          retryLabel="Reintentar"
          testID="order-detail-error"
        />

        <Button
          title="Volver"
          variant="outline"
          onPress={() => {
            router.back();
          }}
          testID="order-detail-back"
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen
      eyebrow="Órdenes"
      title={`Orden #${order.id}`}
      subtitle={getRoleSubtitle(role)}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        testID="order-detail"
      >
        <Card style={styles.statusCard}>
          <Text style={styles.sectionLabel}>
            ESTADO ACTUAL
          </Text>

          <Text style={styles.status}>
            {getStatusLabel(order.status)}
          </Text>

          <View style={styles.statusIndicator} />
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>
            Información de la orden
          </Text>

          <View style={styles.infoList}>
            <InfoRow
              label="Identificador"
              value={`#${order.id}`}
            />

            <InfoRow
              label="Vehículo"
              value={
                vehicle
                  ? `${vehicle.plate} · ${vehicle.brand} ${vehicle.model}`
                  : `ID ${order.vehicleId}`
              }
            />

            <InfoRow
              label="Cliente"
              value={order.clientId}
            />

            <InfoRow
              label="Mecánico asignado"
              value={
                order.assignedMechanicId ??
                'Sin asignar'
              }
            />

            <InfoRow
              label="Ingreso"
              value={order.intakeId}
            />

            <InfoRow
              label="Creada"
              value={formatDate(order.createdAt)}
            />

            <InfoRow
              label="Última actualización"
              value={formatDate(order.updatedAt)}
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
          testID="order-detail-refresh"
        />

        <Button
          title="Volver"
          variant="outline"
          onPress={() => {
            router.back();
          }}
          testID="order-detail-back-bottom"
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
  },

  sectionLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },

  status: {
    marginTop: spacing.sm,
    color: colors.primary,
    fontSize: 24,
    fontWeight: '900',
  },

  statusIndicator: {
    width: 48,
    height: 4,
    marginTop: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },

  card: {
    borderRadius: radius.lg,
  },

  sectionTitle: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: '900',
    marginBottom: spacing.md,
  },

  infoList: {
    gap: spacing.md,
  },

  infoRow: {
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  infoLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  infoValue: {
    marginTop: spacing.xs,
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
});