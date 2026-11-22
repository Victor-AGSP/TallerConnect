import { create, AxiosError, AxiosHeaders } from 'axios';
import { attachHttpTraceInterceptor, safeHttpTarget } from '@/services/api/trace';

describe('Traza HTTP sin datos de autenticación', () => {
  afterEach(() => jest.restoreAllMocks());

  it('conserva /api y elimina query, fragmento y credenciales de URL', () => {
    expect(safeHttpTarget('https://user:private@example.test/api', '/auth/me?token=private#private'))
      .toBe('https://example.test/api/auth/me');
    expect(safeHttpTarget('', 'https://user:private@example.test/api/auth/me?secret=private'))
      .toBe('https://example.test/api/auth/me');
    expect(safeHttpTarget('', 'invalid')).toBe('[destino no disponible]');
  });

  it.each([200, 401, 503, null])('registra solo método, destino y estado %s', async (status) => {
    const log = jest.spyOn(console, 'info').mockImplementation(() => {});
    const client = create({
      baseURL: 'https://example.test/api',
      adapter: async (config) => {
        const response = { config, status: status ?? 0, statusText: '', headers: {}, data: 'PRIVATE_RESPONSE' };
        if (status !== 200) throw new AxiosError('PRIVATE_ERROR', 'ERR_TEST', config,
          undefined, status === null ? undefined : response);
        return response;
      },
    });
    attachHttpTraceInterceptor(client);
    const request = client.post('/auth/login?secret=PRIVATE_QUERY', { password: 'PRIVATE_BODY' }, {
      headers: new AxiosHeaders({ Authorization: 'Bearer PRIVATE_HEADER' }),
    });
    if (status === 200) await expect(request).resolves.toHaveProperty('status', 200);
    else await expect(request).rejects.toBeInstanceOf(AxiosError);
    expect(log.mock.calls).toEqual([['[HTTP]', 'POST', 'https://example.test/api/auth/login', status ?? 'NETWORK_ERROR']]);
    expect(JSON.stringify(log.mock.calls)).not.toContain('PRIVATE');
  });
});
