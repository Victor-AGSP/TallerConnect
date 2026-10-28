import { useCallback, useEffect, useRef, useState } from 'react';

export interface DataQueryResult<T> {
  data: T | null;
  errorMessage: string | null;

  /** Primera carga de la consulta. */
  isLoading: boolean;

  /** Actualización solicitada manualmente sobre datos ya cargados. */
  isRefreshing: boolean;

  /** Vuelve a ejecutar la consulta (actualización manual o reintento). */
  refresh: () => Promise<void>;
}

/**
 * Ejecuta una consulta a la capa de servicios y expone su estado junto con
 * una actualización manual reutilizable como reintento ante errores.
 *
 * Una consulta ya en curso descarta las siguientes hasta que termina, de modo
 * que un reintento repetido o varios gestos de actualización no generan
 * peticiones duplicadas. El reintento automático ante fallos transitorios de
 * red lo aplica el cliente HTTP (`attachRetryInterceptor`); aquí no se
 * reintenta por cuenta propia para no encadenar bucles de reintento.
 *
 * @param query Consulta estable entre renderizados, o `null` si no hay nada
 *   que consultar todavía (en ese caso no se realiza ninguna petición).
 * @param fallbackErrorMessage Mensaje a mostrar si el error no aporta uno.
 */
export function useDataQuery<T>(
  query: (() => Promise<T>) | null,
  fallbackErrorMessage: string,
): DataQueryResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(query));
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isMountedRef = useRef(true);
  const isQueryingRef = useRef(false);

  // Se reafirma el montaje en cada ciclo del efecto: si React desmonta y
  // vuelve a montar el componente, la referencia debe volver a ser válida
  // para que la consulta pueda actualizar el estado.
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const run = useCallback(
    async (mode: 'initial' | 'refresh') => {
      if (!query) return;

      // Evita peticiones duplicadas mientras una consulta sigue en curso.
      if (isQueryingRef.current) return;
      isQueryingRef.current = true;

      if (mode === 'refresh') {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setErrorMessage(null);

      try {
        const result = await query();

        if (!isMountedRef.current) return;

        setData(result);
      } catch (error: unknown) {
        if (!isMountedRef.current) return;

        setData(null);
        setErrorMessage(
          error instanceof Error && error.message
            ? error.message
            : fallbackErrorMessage,
        );
      } finally {
        isQueryingRef.current = false;

        if (isMountedRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [query, fallbackErrorMessage],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- La consulta inicial controla su estado de carga.
    void run('initial');
  }, [run]);

  const refresh = useCallback(() => run('refresh'), [run]);

  return { data, errorMessage, isLoading, isRefreshing, refresh };
}
