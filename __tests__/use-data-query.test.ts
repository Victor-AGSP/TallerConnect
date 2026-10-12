import { act, cleanup, renderHook, waitFor } from '../test-utils';
import { useDataQuery } from '@/hooks/useDataQuery';

/**
 * Mecanismo de consulta compartido por las vistas de datos.
 *
 * Verifica la carga inicial, la actualización manual reutilizada como
 * reintento y la prevención de peticiones duplicadas mientras una consulta
 * sigue en curso.
 *
 * Toda interacción se envuelve en un `act` esperado: dejar promesas
 * pendientes fuera de `act` impide que los montajes siguientes ejecuten sus
 * efectos.
 */

const FALLBACK = 'No fue posible completar la consulta.';

/** Promesa controlable para mantener una consulta en curso. */
function deferred<T>() {
  let resolve: (value: T) => void = () => {};

  const promise = new Promise<T>((res) => {
    resolve = res;
  });

  return { promise, resolve };
}

afterEach(() => cleanup());

describe('useDataQuery: carga inicial', () => {
  it('no realiza ninguna petición si no hay consulta', async () => {
    const { result } = await renderHook(() =>
      useDataQuery<string[]>(null, FALLBACK),
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.data).toBeNull();
    expect(result.current.errorMessage).toBeNull();
  });

  it('expone los datos devueltos por la consulta', async () => {
    const query = jest.fn<Promise<string[]>, []>().mockResolvedValue(['a']);

    const { result } = await renderHook(() => useDataQuery(query, FALLBACK));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toEqual(['a']);
    expect(result.current.errorMessage).toBeNull();
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('expone el mensaje del error propagado por la consulta', async () => {
    const query = jest
      .fn<Promise<string[]>, []>()
      .mockRejectedValue(new Error('Backend no disponible.'));

    const { result } = await renderHook(() => useDataQuery(query, FALLBACK));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.errorMessage).toBe('Backend no disponible.');
    expect(result.current.data).toBeNull();
  });

  it('recurre al mensaje propio si el error no aporta ninguno', async () => {
    const query = jest
      .fn<Promise<string[]>, []>()
      .mockRejectedValue(new Error(''));

    const { result } = await renderHook(() => useDataQuery(query, FALLBACK));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.errorMessage).toBe(FALLBACK);
  });

  it('no reintenta por su cuenta ante un error', async () => {
    const query = jest
      .fn<Promise<string[]>, []>()
      .mockRejectedValue(new Error('Backend no disponible.'));

    const { result } = await renderHook(() => useDataQuery(query, FALLBACK));

    await waitFor(() => expect(result.current.errorMessage).not.toBeNull());

    expect(query).toHaveBeenCalledTimes(1);
  });
});

describe('useDataQuery: actualización manual', () => {
  it('vuelve a consultar sin volver al estado de carga inicial', async () => {
    const pending = deferred<string[]>();
    const query = jest
      .fn<Promise<string[]>, []>()
      .mockResolvedValueOnce(['a'])
      .mockReturnValueOnce(pending.promise);

    const { result } = await renderHook(() => useDataQuery(query, FALLBACK));

    await waitFor(() => expect(result.current.data).toEqual(['a']));

    await act(async () => {
      const refreshing = result.current.refresh();

      // Mientras la consulta sigue en curso no se repite la carga inicial.
      expect(result.current.isLoading).toBe(false);

      pending.resolve(['b']);
      await refreshing;
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.data).toEqual(['b']);
    expect(query).toHaveBeenCalledTimes(2);
  });

  it('sirve como reintento tras un error', async () => {
    const query = jest
      .fn<Promise<string[]>, []>()
      .mockRejectedValueOnce(new Error('Backend no disponible.'))
      .mockResolvedValueOnce(['a']);

    const { result } = await renderHook(() => useDataQuery(query, FALLBACK));

    await waitFor(() => expect(result.current.errorMessage).not.toBeNull());

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.errorMessage).toBeNull();
    expect(result.current.data).toEqual(['a']);
    expect(query).toHaveBeenCalledTimes(2);
  });

  it('no consulta nada si no hay consulta configurada', async () => {
    const { result } = await renderHook(() =>
      useDataQuery<string[]>(null, FALLBACK),
    );

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.data).toBeNull();
    expect(result.current.errorMessage).toBeNull();
  });
});

describe('useDataQuery: prevención de peticiones duplicadas', () => {
  it('descarta las consultas solicitadas mientras una sigue en curso', async () => {
    const pending = deferred<string[]>();
    const query = jest
      .fn<Promise<string[]>, []>()
      .mockResolvedValueOnce(['a'])
      .mockReturnValueOnce(pending.promise);

    const { result } = await renderHook(() => useDataQuery(query, FALLBACK));

    await waitFor(() => expect(result.current.data).toEqual(['a']));

    await act(async () => {
      // Tres solicitudes solapadas: solo la primera llega a la consulta.
      const first = result.current.refresh();
      const second = result.current.refresh();
      const third = result.current.refresh();

      pending.resolve(['b']);

      await Promise.all([first, second, third]);
    });

    expect(query).toHaveBeenCalledTimes(2);
    expect(result.current.data).toEqual(['b']);
  });

  it('vuelve a aceptar consultas cuando la anterior termina', async () => {
    const query = jest
      .fn<Promise<string[]>, []>()
      .mockResolvedValueOnce(['a'])
      .mockResolvedValueOnce(['b'])
      .mockResolvedValueOnce(['c']);

    const { result } = await renderHook(() => useDataQuery(query, FALLBACK));

    await waitFor(() => expect(result.current.data).toEqual(['a']));

    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.data).toEqual(['b']);

    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.data).toEqual(['c']);

    expect(query).toHaveBeenCalledTimes(3);
  });
});
