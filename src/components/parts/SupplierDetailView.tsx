import { useMemo } from 'react';

import { StyleSheet, Text } from 'react-native';

import {
  Button,
  Card,
  EmptyState,
  ErrorMessage,
  Loading,
} from '@/components/common';
import { AppScreen } from '@/components/layout/AppScreen';
import { SparePartCard } from '@/components/parts/SparePartCard';
import { useDataQuery } from '@/hooks/useDataQuery';
import { colors, spacing } from '@/constants/theme';
import type { SupplierDetail } from '@/models/parts.model';

export interface SupplierDetailViewProps {
  eyebrow: string;

  /** Identificador recibido en la ruta. Puede llegar vacío o ausente. */
  supplierId?: string;

  /**
   * Consulta el detalle al servicio. Debe ser estable entre renderizados
   * porque dispara la carga.
   */
  loadSupplier: (id: string) => Promise<SupplierDetail>;
}

const FALLBACK_ERROR = 'No fue posible cargar el proveedor.';

/**
 * Detalle de un proveedor con los repuestos que suministra (MS3).
 */
export function SupplierDetailView({
  eyebrow,
  supplierId,
  loadSupplier,
}: SupplierDetailViewProps) {
  const query = useMemo(
    () => (supplierId ? () => loadSupplier(supplierId) : null),
    [loadSupplier, supplierId],
  );

  const { data: supplier, errorMessage, isLoading, isRefreshing, refresh } =
    useDataQuery(query, FALLBACK_ERROR);

  return (
    <AppScreen
      eyebrow={eyebrow}
      title={supplier ? supplier.name : 'Proveedor'}
      subtitle="Datos de contacto y repuestos suministrados."
    >
      {!supplierId ? (
        <EmptyState
          testID="supplier-detail-missing-id"
          title="Proveedor no encontrado"
          message="No se indicó qué proveedor se quiere consultar."
        />
      ) : isLoading || (isRefreshing && !supplier) ? (
        <Loading testID="supplier-detail-loading" message="Cargando proveedor..." />
      ) : errorMessage ? (
        <ErrorMessage
          testID="supplier-detail-error"
          message={errorMessage}
          onRetry={refresh}
        />
      ) : supplier ? (
        <>
          <Button
            testID="supplier-detail-refresh"
            title="Actualizar"
            variant="outline"
            loading={isRefreshing}
            onPress={refresh}
            style={styles.refreshButton}
          />

          <Card
            testID={`supplier-detail-${supplier.id}`}
            accessible
            accessibilityLabel={`Contacto: ${supplier.contact}`}
          >
            <Text style={styles.label}>CONTACTO</Text>
            <Text style={styles.contact}>{supplier.contact}</Text>
          </Card>

          {supplier.parts.length === 0 ? (
            <EmptyState
              testID="supplier-detail-no-parts"
              title="Sin repuestos"
              message="Este proveedor no tiene repuestos registrados."
            />
          ) : (
            supplier.parts.map((part) => (
              <SparePartCard key={part.id} part={part} showSupplier={false} />
            ))
          )}
        </>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  refreshButton: {
    alignSelf: 'flex-end',
    minHeight: 40,
    paddingHorizontal: spacing.md,
  },

  label: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  contact: {
    marginTop: spacing.xs,
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
});
