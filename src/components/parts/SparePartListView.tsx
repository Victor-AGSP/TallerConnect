import { StyleSheet, Text } from 'react-native';

import {
  Button,
  EmptyState,
  ErrorMessage,
  Loading,
} from '@/components/common';
import { AppScreen } from '@/components/layout/AppScreen';
import { SparePartCard } from '@/components/parts/SparePartCard';
import { useDataQuery } from '@/hooks/useDataQuery';
import { colors, spacing } from '@/constants/theme';
import type { PagedList, SparePart } from '@/models/parts.model';

export interface SparePartListViewProps {
  eyebrow: string;

  /**
   * Consulta al servicio de repuestos. Debe ser estable entre renderizados
   * porque dispara la carga.
   */
  loadSpareParts: () => Promise<PagedList<SparePart>>;
}

const FALLBACK_ERROR = 'No fue posible cargar los repuestos.';

/**
 * Listado de repuestos conectado a PartsService (MS3).
 */
export function SparePartListView({
  eyebrow,
  loadSpareParts,
}: SparePartListViewProps) {
  const { data, errorMessage, isLoading, isRefreshing, refresh } =
    useDataQuery(loadSpareParts, FALLBACK_ERROR);

  const parts = data?.items ?? [];

  return (
    <AppScreen
      eyebrow={eyebrow}
      title="Repuestos"
      subtitle="Inventario de repuestos con su proveedor y stock."
    >
      {isLoading || (isRefreshing && !data) ? (
        <Loading testID="spare-part-list-loading" message="Cargando repuestos..." />
      ) : errorMessage ? (
        <ErrorMessage
          testID="spare-part-list-error"
          message={errorMessage}
          onRetry={refresh}
        />
      ) : parts.length === 0 ? (
        <EmptyState
          testID="spare-part-list-empty"
          title="Sin repuestos"
          message="Todavía no hay repuestos registrados en el inventario."
          actionLabel="Actualizar"
          onAction={refresh}
        />
      ) : (
        <>
          <Button
            testID="spare-part-list-refresh"
            title="Actualizar"
            variant="outline"
            loading={isRefreshing}
            onPress={refresh}
            style={styles.refreshButton}
          />

          <Text testID="spare-part-list-count" style={styles.count}>
            Mostrando {parts.length} de {data?.total ?? parts.length} repuestos
          </Text>

          {parts.map((part) => (
            <SparePartCard key={part.id} part={part} />
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
});
