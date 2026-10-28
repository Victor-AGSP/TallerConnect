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
import { useLoadMore } from '@/hooks/useLoadMore';
import { colors, spacing } from '@/constants/theme';
import type { PagedList, SparePart } from '@/models/parts.model';

export interface SparePartListViewProps {
  eyebrow: string;

  /**
   * Consulta al servicio de repuestos. Debe ser estable entre renderizados
   * porque dispara la carga.
   */
  loadSpareParts: () => Promise<PagedList<SparePart>>;

  /** Página posterior desde `offset`. Sin ella solo se muestra la primera página. */
  loadMoreSpareParts?: (offset: number) => Promise<PagedList<SparePart>>;
}

const FALLBACK_ERROR = 'No fue posible cargar los repuestos.';

/**
 * Listado de repuestos conectado a PartsService (MS3).
 */
export function SparePartListView({
  eyebrow,
  loadSpareParts,
  loadMoreSpareParts,
}: SparePartListViewProps) {
  const { data, errorMessage, isLoading, isRefreshing, refresh } =
    useDataQuery(loadSpareParts, FALLBACK_ERROR);

  const {
    items: parts,
    total,
    hasMore,
    isLoadingMore,
    loadMoreError,
    loadMore,
  } = useLoadMore(data, loadMoreSpareParts, FALLBACK_ERROR);

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
            Mostrando {parts.length} de {total} repuestos
          </Text>

          {parts.map((part) => (
            <SparePartCard key={part.id} part={part} />
          ))}

          {loadMoreError ? (
            <Text testID="spare-part-list-load-more-error" accessibilityRole="alert" style={styles.error}>
              {loadMoreError}
            </Text>
          ) : null}

          {hasMore ? (
            <Button
              testID="spare-part-list-load-more"
              title={loadMoreError ? 'Reintentar cargar más' : 'Cargar más repuestos'}
              variant="outline"
              loading={isLoadingMore}
              disabled={isRefreshing}
              onPress={() => {
                void loadMore();
              }}
            />
          ) : null}
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

  error: {
    color: colors.danger,
    fontSize: 13,
  },
});
