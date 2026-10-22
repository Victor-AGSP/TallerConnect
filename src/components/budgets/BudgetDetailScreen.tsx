
import { useRouter } from 'expo-router';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppScreen } from '@/components/layout/AppScreen';
import { Button, Card } from '@/components/common';
import { colors, radius, spacing } from '@/constants/theme';

const budgetItems = [
  { id: '1', name: 'Filtro de aceite', quantity: 1, price: 15000 },
  { id: '2', name: 'Aceite de motor', quantity: 4, price: 8500 },
  { id: '3', name: 'Mantención preventiva', quantity: 1, price: 45000 },
];

const formatCLP = (amount: number) =>
  amount.toLocaleString('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  });

const total = budgetItems.reduce(
  (sum, item) => sum + item.quantity * item.price,
  0,
);

export function BudgetDetailScreen() {
  const router = useRouter();

  return (
    <AppScreen
      eyebrow="Portal del cliente"
      title="Detalle del presupuesto"
      subtitle="Revisa los trabajos y repuestos considerados para tu vehículo."
    >
      <Card style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.label}>ORDEN DE TRABAJO</Text>
            <Text style={styles.orderNumber}>OT-00124</Text>
          </View>

          <View style={styles.status}>
            <Text style={styles.statusText}>Aprobado</Text>
          </View>
        </View>

        <View style={styles.separator} />

        <InfoRow label="Fecha" value="21/10/2026" />
        <InfoRow label="Versión" value="2" />
        <InfoRow label="Vehículo" value="AB-CD-12" />
      </Card>

      <Text style={styles.sectionTitle}>Detalle de los trabajos</Text>

      {budgetItems.map((item) => (
        <Card key={item.id} style={styles.itemCard}>
          <Text style={styles.itemName}>{item.name}</Text>

          <View style={styles.itemRow}>
            <Text style={styles.muted}>
              {item.quantity} × {formatCLP(item.price)}
            </Text>
            <Text style={styles.itemTotal}>
              {formatCLP(item.quantity * item.price)}
            </Text>
          </View>
        </Card>
      ))}

      <Card style={styles.totalCard}>
        <Text style={styles.label}>TOTAL DEL PRESUPUESTO</Text>
        <Text style={styles.total}>{formatCLP(total)}</Text>
        <Text style={styles.note}>
          Información de demostración. Los valores todavía no provienen
          de un servicio conectado al backend.
        </Text>
      </Card>

      <Button
        title="Volver al inicio"
        variant="outline"
        onPress={() => router.back()}
        style={styles.backButton}
      />
    </AppScreen>
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
    <View style={styles.infoRow}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
  status: {
    backgroundColor: colors.successSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  statusText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '800',
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
  note: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.md,
  },
  backButton: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
});
