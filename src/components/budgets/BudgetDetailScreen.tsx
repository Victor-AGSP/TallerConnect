import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import {
  Button,
  Card,
  EmptyState,
  ErrorMessage,
  Loading,
} from '@/components/common';
import { AppScreen } from '@/components/layout/AppScreen';
import { formatBudgetAmount } from '@/components/orders/OrderBudgetView';
import { StatusPill, type StatusTone } from '@/components/ui/StatusPill';
import { colors, spacing } from '@/constants/theme';
import { useDataQuery } from '@/hooks/useDataQuery';
import type { Budget, BudgetVersionStatus } from '@/models/budget.model';
import { budgetsService } from '@/services/budgets.service';
import { ordersService } from '@/services/orders.service';
import { formatDate } from '@/utils/formatters';

interface LoadedClientBudget {
  orderId: string;
  budget: Budget;
}

const FALLBACK_ERROR = 'No fue posible cargar el presupuesto.';

const VERSION_STATUS: Record<
  BudgetVersionStatus,
  { label: string; tone: StatusTone }
> = {
  borrador: { label: 'Borrador', tone: 'info' },
  enviada: { label: 'Esperando decisión', tone: 'warning' },
  aprobada: { label: 'Aprobado', tone: 'success' },
  rechazada: { label: 'Rechazado', tone: 'danger' },
};

export function BudgetDetailScreen() {
  const router = useRouter();

  const loadLatestBudget = useCallback(async (): Promise<LoadedClientBudget | null> => {
    const orders = await ordersService.getOrders();
    const sortedOrders = [...orders].sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );

    for (const order of sortedOrders) {
      const budget = await budgetsService.getBudgetForOrder(order.id);
      if (budget && budget.versions.length > 0) {
        return { orderId: order.id, budget };
      }
    }

    return null;
  }, []);

  const { data, errorMessage, isLoading, isRefreshing, refresh } = useDataQuery(
    loadLatestBudget,
    FALLBACK_ERROR,
  );

  const budget = data?.budget ?? null;
  const version = budget
    ? budget.versions[budget.versions.length - 1]
    : undefined;
  const status = version ? VERSION_STATUS[version.status] : null;

  return (
    <AppScreen
      eyebrow="Portal del cliente"
      title="Detalle del presupuesto"
      subtitle="Revisa los trabajos y repuestos considerados para tu vehículo."
    >
      {isLoading || (isRefreshing && !data) ? (
        <Loading
          testID="budget-detail-loading"
          message="Cargando presupuesto..."
        />
      ) : errorMessage ? (
        <ErrorMessage
          testID="budget-detail-error"
          title="No se pudo cargar el presupuesto"
          message={errorMessage}
          onRetry={refresh}
        />
      ) : !data || !budget || !version ? (
        <EmptyState
          testID="budget-detail-empty"
          title="Sin presupuesto"
          message="Todavía no tienes un presupuesto disponible en tus órdenes."
          actionLabel="Actualizar"
          onAction={refresh}
        />
      ) : (
        <>
          <Button
            testID="budget-detail-refresh"
            title="Actualizar presupuesto"
            variant="outline"
            loading={isRefreshing}
            disabled={isRefreshing}
            onPress={refresh}
            style={styles.refreshButton}
          />

          <Card testID={`budget-detail-${budget.id}`} style={styles.card}>
            <View style={styles.headerRow}>
              <View style={styles.headerText}>
                <Text style={styles.label}>ORDEN DE TRABAJO</Text>
                <Text style={styles.orderNumber}>OT #{data.orderId}</Text>
              </View>

              {status ? (
                <StatusPill
                  label={status.label}
                  tone={status.tone}
                  accessibilityLabel={`Estado del presupuesto: ${status.label}`}
                />
              ) : null}
            </View>

            <View style={styles.separator} />

            <InfoRow label="Fecha" value={formatDate(version.createdAt)} />
            <InfoRow label="Versión" value={String(version.number)} />
            <InfoRow
              label="Presupuesto"
              value={`#${budget.id}`}
            />
          </Card>

          <Text style={styles.sectionTitle}>Detalle de los trabajos</Text>

          {version.items.length > 0 ? (
            version.items.map((item) => (
              <Card key={item.id} style={styles.itemCard}>
                <Text style={styles.itemName}>{item.description}</Text>

                <View style={styles.itemRow}>
                  <Text style={styles.muted}>
                    {item.quantity} × {formatBudgetAmount(item.unitPrice)}
                  </Text>
                  <Text style={styles.itemTotal}>
                    {formatBudgetAmount(item.subtotal)}
                  </Text>
                </View>
              </Card>
            ))
          ) : (
            <Card style={styles.itemCard}>
              <Text style={styles.muted}>
                No hay trabajos registrados en esta versión del presupuesto.
              </Text>
            </Card>
          )}

          <Card style={styles.totalCard}>
            <Text style={styles.label}>TOTAL DEL PRESUPUESTO</Text>
            <Text style={styles.total}>
              {formatBudgetAmount(version.total)}
            </Text>
          </Card>
        </>
      )}

      <Button
        title="Volver al inicio"
        variant="outline"
        onPress={() => router.back()}
        style={styles.backButton}
      />
    </AppScreen>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  refreshButton: {
    alignSelf: 'flex-end',
    minHeight: 40,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  card: {
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  orderNumber: {
    marginTop: spacing.xs,
    color: colors.primary,
    fontSize: 22,
    fontWeight: '900',
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  infoValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
  },
  sectionTitle: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '900',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  itemCard: {
    marginBottom: spacing.md,
  },
  itemName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  muted: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  itemTotal: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  totalCard: {
    backgroundColor: colors.primarySoft,
    marginTop: spacing.xs,
  },
  total: {
    color: colors.primary,
    fontSize: 30,
    fontWeight: '900',
    marginTop: spacing.sm,
  },
  backButton: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
});
