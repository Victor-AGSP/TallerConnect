import { useCallback, useRef, useState } from 'react';

import type { PagedList } from '@/models/parts.model';

export interface LoadMoreResult<T> {
  /** Primera página seguida de las páginas posteriores, sin duplicados. */
  items: T[];

  /** Total informado por la última página recibida. */
  total: number;

  /** Quedan registros en el servidor por consultar. */
  hasMore: boolean;

  isLoadingMore: boolean;
  loadMoreError: string | null;

  /** Consulta la página siguiente; se ignora si ya hay una en curso. */
  loadMore: () => Promise<void>;
}

/** Páginas posteriores acumuladas sobre una primera página concreta. */
interface ExtraPages<T> {
  source: PagedList<T> | null;
  extra: T[];
  latestTotal: number | null;
  exhausted: boolean;
  isLoadingMore: boolean;
  loadMoreError: string | null;
}

function emptyPages<T>(source: PagedList<T> | null): ExtraPages<T> {
  return {
    source,
    extra: [],
    latestTotal: null,
    exhausted: false,
    isLoadingMore: false,
    loadMoreError: null,
  };
}

/**
 * Carga incremental sobre un listado paginado del MS3 (`desde`/`limite`).
 *
 * `firstPage` es la página que entrega `useDataQuery`: cuando cambia (carga
 * inicial, actualización o reintento) se descartan las páginas posteriores,
 * incluida una respuesta que llegue tarde. La siguiente página se pide desde
 * la cantidad de registros ya mostrados, y los repetidos (el inventario puede
 * cambiar entre consultas) se descartan por `id`.
 */
export function useLoadMore<T extends { id: string }>(
  firstPage: PagedList<T> | null,
  loadPage: ((offset: number) => Promise<PagedList<T>>) | undefined,
  fallbackErrorMessage: string,
): LoadMoreResult<T> {
  const [stored, setStored] = useState<ExtraPages<T>>(() => emptyPages(firstPage));
  // El acumulado solo vale para la primera página con la que se construyó.
  const pages = stored.source === firstPage ? stored : emptyPages(firstPage);

  const inFlightFor = useRef<PagedList<T> | null>(null);

  const items = firstPage ? mergeById(firstPage.items, pages.extra) : [];
  const total = pages.latestTotal ?? firstPage?.total ?? 0;
  const hasMore =
    Boolean(firstPage && loadPage) && !pages.exhausted && items.length < total;

  const loadMore = useCallback(async () => {
    if (!loadPage || !firstPage || inFlightFor.current === firstPage) return;
    const source = firstPage;
    inFlightFor.current = source;

    const known = mergeById(source.items, pages.extra);
    setStored({ ...pages, isLoadingMore: true, loadMoreError: null });

    // Solo se aplica si la primera página sigue siendo la misma.
    const update = (change: (current: ExtraPages<T>) => ExtraPages<T>) =>
      setStored((current) => (current.source === source ? change(current) : current));

    try {
      const page = await loadPage(known.length);
      const knownIds = new Set(known.map((item) => item.id));
      const fresh = page.items.filter((item) => !knownIds.has(item.id));

      update((current) => ({
        ...current,
        extra: [...current.extra, ...fresh],
        latestTotal: page.total,
        // Una página sin registros nuevos indica que no hay más que mostrar.
        exhausted: fresh.length === 0,
        isLoadingMore: false,
      }));
    } catch (error: unknown) {
      update((current) => ({
        ...current,
        isLoadingMore: false,
        loadMoreError:
          error instanceof Error && error.message ? error.message : fallbackErrorMessage,
      }));
    } finally {
      if (inFlightFor.current === source) inFlightFor.current = null;
    }
  }, [fallbackErrorMessage, firstPage, loadPage, pages]);

  return {
    items,
    total,
    hasMore,
    isLoadingMore: pages.isLoadingMore,
    loadMoreError: pages.loadMoreError,
    loadMore,
  };
}

function mergeById<T extends { id: string }>(first: T[], extra: T[]): T[] {
  const seen = new Set(first.map((item) => item.id));
  return [...first, ...extra.filter((item) => !seen.has(item.id))];
}
