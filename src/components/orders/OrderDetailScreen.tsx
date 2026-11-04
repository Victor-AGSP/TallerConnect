import { EvidenceCapturePanel } from '@/components/evidence/EvidenceCapturePanel';
import { OrderEvidenceList } from '@/components/evidence/OrderEvidenceList';
import { MechanicUpdatePanel, acceptsEvidence } from '@/components/orders/MechanicUpdatePanel';

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
import type { UserRole } from '@/constants/roles';
import type { WorkOrder } from '@/models/order.model';
import type { Vehicle } from '@/models/vehicle.model';
import { ordersService } from '@/services/orders.service';
import { vehiclesService } from '@/services/vehicles.service';

interface OrderDetailScreenProps {
  orderId: string;
  role: UserRole;
}

function getStatusLabel(status: WorkOrder['status']): string {
  const labels: Record<WorkOrder['status'], string> = {
    recibido: 'Recibido',
    esperando_diagnostico: 'Esperando diagnóstico',
    esperando_aprobacion_presupuesto: 'Esperando aprobación',
    esperando_repuestos: 'Esperando repuestos',
    pausado_por_presupuesto_rechazado: 'Presupuesto rechazado',
    control_calidad: 'Control de calidad',
    en_reparacion: 'En reparación',
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

  return date.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function OrderDetailScreen(props: OrderDetailScreenProps) {
  return <OrderDetailScreenContent key={props.orderId} {...props} />;
}

function OrderDetailScreenContent({
  orderId,
  role,
}: OrderDetailScreenProps) {
  const router = useRouter();
  const [order, setOrder] = useState<WorkOrder | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadDetail = useCallback(() => ordersService.getOrderById(orderId)
    .then(async (orderResult) => {
      setOrder(orderResult);
      try {
        setVehicle(await vehiclesService.getVehicleById(String(orderResult.vehicleId)));
      } catch {
        setVehicle(null);
      }
    })
    .catch((error: unknown) => {
      setErrorMessage(error instanceof Error ? error.message : 'No fue posible cargar la orden de trabajo.');
    })
    .finally(() => {
      setIsLoading(false);
      setIsRefreshing(false);
    }), [orderId]);

  const reload = (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setErrorMessage(null);

    void loadDetail();
  };

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
            void reload();
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
              void reload(true);
            }}
          />
        }
        contentContainerStyle={styles.content}
        testID="order-detail"
      >
        <Card style={styles.statusCard}>
          <Text style={styles.statusLabel}>ESTADO ACTUAL</Text>
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
              <InfoRow label="Patente" value={vehicle.plate} />
              <InfoRow
                label="Marca"
                value={vehicle.brand || 'Sin información'}
              />
              <InfoRow
                label="Modelo"
                value={vehicle.model || 'Sin información'}
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
            <InfoRow label="ID de orden" value={`#${order.id}`} />

            {role !== 'cliente' && (
              <>
                <InfoRow
                  label="ID de ingreso"
                  value={String(order.intakeId)}
                />
                <InfoRow
                  label="Mecánico asignado"
                  value={
                    order.assignedMechanicId
                      ? String(order.assignedMechanicId)
                      : 'Sin mecánico asignado'
                  }
                />
              </>
            )}

            {role === 'administrador' && (
              <>
                <InfoRow
                  label="ID del cliente"
                  value={
                    vehicle?.ownerId != null
                      ? String(vehicle.ownerId)
                      : 'Sin información'
                  }
                />
                <InfoRow
                  label="Creada por"
                  value={String(order.createdById)}
                />
              </>
            )}

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

        {role === 'cliente' || role === 'administrador' ? (
          <Button
            title="Ver presupuesto"
            onPress={() => router.push({
              pathname: role === 'cliente' ? '/mis-ordenes/[id]/presupuesto' : '/ordenes/[id]/presupuesto',
              params: { id: order.id },
            })}
          />
        ) : null}
        {role === 'mecanico' ? (
          <>
            <MechanicUpdatePanel key={`update-${order.id}`} order={order} />
            {acceptsEvidence(order.status) ? <EvidenceCapturePanel key={`capture-${order.id}`} orderId={order.id} /> : null}
          </>
        ) : null}
        <OrderEvidenceList key={`evidence-${order.id}`} orderId={order.id} role={role} />

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

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
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
