import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/common';
import { StatusPill } from '@/components/ui/StatusPill';
import { colors, spacing } from '@/constants/theme';
import type { SparePart } from '@/models/parts.model';

function formatThreshold(part: SparePart): string {
  if (part.effectiveThreshold == null) return 'Sin umbral';
  return part.ownThreshold != null
    ? `Umbral ${part.effectiveThreshold} (propio)`
    : `Umbral ${part.effectiveThreshold} (general)`;
}

/**
 * Tarjeta de un repuesto con su proveedor, stock y umbral.
 */
export function SparePartCard({
  part,
  showSupplier = true,
}: {
  part: SparePart;
  showSupplier?: boolean;
}) {
  const stockLabel = part.belowThreshold ? 'Stock bajo' : 'Stock suficiente';
  const threshold = formatThreshold(part);

  return (
    <Card
      testID={`spare-part-card-${part.id}`}
      accessible
      accessibilityLabel={`Repuesto ${part.name}. ${
        showSupplier ? `Proveedor: ${part.supplierName}. ` : ''
      }Stock: ${part.stock}. ${threshold}. ${stockLabel}`}
    >
      <View style={styles.header}>
        <Text style={styles.name}>{part.name}</Text>
        <StatusPill
          label={stockLabel}
          tone={part.belowThreshold ? 'danger' : 'success'}
        />
      </View>

      {showSupplier ? (
        <Text style={styles.supplier}>{part.supplierName}</Text>
      ) : null}

      <View style={styles.specs}>
        <Text style={styles.spec}>Stock: {part.stock}</Text>
        <Text style={styles.specSeparator}>·</Text>
        <Text style={styles.spec}>{threshold}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },

  name: {
    flexShrink: 1,
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },

  supplier: {
    marginTop: spacing.xs,
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },

  specs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },

  spec: {
    color: colors.textSecondary,
    fontSize: 13,
  },

  specSeparator: {
    color: colors.border,
    fontSize: 13,
  },
});
