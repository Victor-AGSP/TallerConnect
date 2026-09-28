import type { AuthService } from '@/services/auth.service';
import { loginResponsePayloads } from '@/mocks/payloads/auth.payload';

jest.mock('@/services/api/client', () => ({ apiClient: { post: jest.fn() } }));

const originalMode = process.env.EXPO_PUBLIC_USE_MOCK_AUTH;
let service: AuthService;
let post: jest.Mock;

function loadService(mode: string) {
  process.env.EXPO_PUBLIC_USE_MOCK_AUTH = mode;
  jest.isolateModules(() => {
    service = require('@/services/auth.service').authService;
    post = require('@/services/api/client').apiClient.post;
    post.mockReset();
  });
}

beforeEach(() => loadService('false'));
afterEach(() => {
  jest.useRealTimers();
  if (originalMode === undefined) delete process.env.EXPO_PUBLIC_USE_MOCK_AUTH;
  else process.env.EXPO_PUBLIC_USE_MOCK_AUTH = originalMode;
});

it.each(Object.entries(loginResponsePayloads))('integra la respuesta HTTP del rol %s', async (role, payload) => {
  post.mockResolvedValueOnce({ data: payload });
  const response = await service.login({ email: ' cliente@pruebas.cl ', password: 'clave-simulada' });
  expect(post).toHaveBeenCalledWith('/auth/login', {
    email: 'cliente@pruebas.cl', password: 'clave-simulada',
  });
  expect(response).toMatchObject({
    token: payload.access_token,
    user: { id: String(payload.user.id), name: payload.user.full_name, role },
  });
});

const valid = loginResponsePayloads.cliente;
it.each([
  ['rol desconocido', { ...valid, user: { ...valid.user, roles: ['supervisor'] } }],
  ['roles vacíos', { ...valid, user: { ...valid.user, roles: [] } }],
  ['usuario inactivo', { ...valid, user: { ...valid.user, is_active: false } }],
  ['id ausente', { ...valid, user: { ...valid.user, id: undefined } }],
  ['id nulo', { ...valid, user: { ...valid.user, id: null } }],
  ['token vacío', { ...valid, access_token: '' }],
])('rechaza una respuesta HTTP con %s', async (_label, payload) => {
  post.mockResolvedValueOnce({ data: payload });
  await expect(service.login({ email: 'cliente@pruebas.cl', password: 'clave-simulada' })).rejects.toThrow();
});

it('propaga un error HTTP para que el store y la pantalla gestionen el fallo', async () => {
  const failure = new Error('HTTP 401');
  post.mockRejectedValueOnce(failure);
  await expect(service.login({ email: 'cliente@pruebas.cl', password: 'incorrecta' })).rejects.toBe(failure);
});

it.each([
  ['cliente@demo.local', 'cliente'],
  ['mecanico@demo.local', 'mecanico'],
  ['admin@demo.local', 'administrador'],
])('el modo demo resuelve %s sin llamar a HTTP', async (email, role) => {
  loadService('true');
  jest.useFakeTimers();
  const result = service.login({ email, password: '123456' });
  await jest.runAllTimersAsync();
  await expect(result).resolves.toMatchObject({ user: { role } });
  expect(post).not.toHaveBeenCalled();
});
