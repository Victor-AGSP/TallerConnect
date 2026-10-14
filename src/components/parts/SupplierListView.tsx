import { Pressable, StyleSheet, Text } from 'react-native';

import {
  Button,
  Card,
  EmptyState,
  ErrorMessage,
  Loading,
} from '@/components/common';
import { AppScreen } from '@/components/layout/AppScreen';
import { useDataQuery } from '@/hooks/useDataQuery';
import { colors, spacing } from '@/constants/theme';
import type { PagedList, Supplier } from '@/models/parts.model';

export interface SupplierListViewProps {
  eyebrow: string;

  /**
   * Consulta al servicio de proveedores. Debe ser estable entre
   * renderizados porque dispara la carga.
   */
  loadSuppliers: () => Promise<PagedList<Supplier>>;

  /** Abre el detalle del proveedor seleccionado. */
  onSelectSupplier: (supplierId: string) => void;
}

const FALLBACK_ERROR = 'No fue posible cargar los proveedores.';

/**
 * Listado de proveedores conectado a PartsService (MS3).
 */
export function SupplierListView({
  eyebrow,
  loadSuppliers,
  onSelectSupplier,
}: SupplierListViewProps) {
  const { data, errorMessage, isLoading, isRefreshing, refresh } =
    useDataQuery(loadSuppliers, FALLBACK_ERROR);

  const suppliers = data?.items ?? [];

  return (
    <AppScreen
      eyebrow={eyebrow}
      title="Proveedores"
      subtitle="Proveedores de repuestos del taller."
    >
      {isLoading || (isRefreshing && !data) ? (
        <Loading testID="supplier-list-loading" message="Cargando proveedores..." />
      ) : errorMessage ? (
        <ErrorMessage
          testID="supplier-list-error"
          message={errorMessage}
          onRetry={refresh}
        />
      ) : suppliers.length === 0 ? (
        <EmptyState
          testID="supplier-list-empty"
          title="Sin proveedores"
          message="Todavía no hay proveedores registrados."
          actionLabel="Actualizar"
          onAction={refresh}
        />
      ) : (
        <>
          <Button
            testID="supplier-list-refresh"
            title="Actualizar"
            variant="outline"
            loading={isRefreshing}
            onPress={refresh}
            style={styles.refreshButton}
          />

          <Text testID="supplier-list-count" style={styles.count}>
            Mostrando {suppliers.length} de {data?.total ?? suppliers.length}{' '}
            proveedores
          </Text>

          {suppliers.map((supplier) => (
            <Pressable
              key={supplier.id}
              testID={`supplier-card-${supplier.id}`}
              accessibilityRole="button"
              accessibilityLabel={`Proveedor ${supplier.name}. Contacto: ${supplier.contact}. Repuestos: ${supplier.partsCount}. Ver detalle`}
              onPress={() => onSelectSupplier(supplier.id)}
            >
              <Card>
                <Text style={styles.name}>{supplier.name}</Text>
                <Text style={styles.contact}>{supplier.contact}</Text>
                <Text style={styles.parts}>
                  {supplier.partsCount === 1
                    ? '1 repuesto'
                    : `${supplier.partsCount} repuestos`}
                </Text>
              </Card>
            </Pressable>
          ))}
        </>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  refreshButton: {
    alignSelf: 'flex-end',
    minHeight: 40,
    paddingHorizontal: spacing.md,
  },

  count: {
    color: colors.textSecondary,
    fontSize: 13,
  },

  name: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },

  contact: {
    marginTop: spacing.xs,
    color: colors.text,
    fontSize: 14,
  },

  parts: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    fontSize: 13,
  },
});
