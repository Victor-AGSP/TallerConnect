import * as SecureStore from 'expo-secure-store';
import { resetStores } from '../test-utils';
import { authService } from '@/services/auth.service';
import { mockAuthResponses } from '@/mocks/auth.mock';
import { AUTH_SESSION_STORAGE_KEY, useAuthStore } from '@/stores/authStore';
import { STORAGE_KEYS } from '@/utils/storage';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn(),
}));
jest.mock('@/services/auth.service', () => ({ authService: { login: jest.fn() } }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
const disk = new Map<string, string>();
const getItem = jest.mocked(SecureStore.getItemAsync);
const setItem = jest.mocked(SecureStore.setItemAsync);
const deleteItem = jest.mocked(SecureStore.deleteItemAsync);
const login = jest.mocked(authService.login);
const response = mockAuthResponses.cliente;
const credentials = { email: response.user.email, password: 'clave-segura' };

beforeEach(() => {
  resetStores();
  disk.clear();
  getItem.mockReset().mockImplementation(async (key) => disk.get(key) ?? null);
  setItem.mockReset().mockImplementation(async (key, value) => { disk.set(key, value); });
  deleteItem.mockReset().mockImplementation(async (key) => { disk.delete(key); });
  login.mockReset().mockResolvedValue(response);
});

it('logout invalida un login HTTP pendiente y evita que vuelva a guardar la sesión', async () => {
  const request = deferred<typeof response>();
  login.mockReturnValueOnce(request.promise);
  const pendingLogin = useAuthStore.getState().login(credentials);
  const cancelled = expect(pendingLogin).rejects.toThrow();
  await useAuthStore.getState().logout();
  request.resolve(response);
  await cancelled;
  expect(useAuthStore.getState().isAuthenticated).toBe(false);
  expect(disk.has(AUTH_SESSION_STORAGE_KEY)).toBe(false);
});

it('logout invalida una recuperación que todavía está leyendo SecureStore', async () => {
  const read = deferred<string | null>();
  const started = deferred<void>();
  getItem.mockImplementationOnce(() => { started.resolve(); return read.promise; });
  const hydration = useAuthStore.getState().hydrateSession();
  await started.promise;
  await useAuthStore.getState().logout();
  read.resolve(JSON.stringify(response));
  await hydration;
  expect(useAuthStore.getState()).toMatchObject({ isAuthenticated: false, token: null, role: null });
});

it('logout espera una escritura en curso y borra su resultado antes de terminar', async () => {
  const write = deferred<void>();
  const started = deferred<void>();
  setItem.mockImplementationOnce(async (key, value) => {
    started.resolve();
    await write.promise;
    disk.set(key, value);
  });
  const pendingLogin = useAuthStore.getState().login(credentials);
  const cancelled = expect(pendingLogin).rejects.toThrow();
  await started.promise;
  const logout = useAuthStore.getState().logout();
  write.resolve();
  await cancelled;
  await logout;
  await useAuthStore.getState().hydrateSession();
  expect(useAuthStore.getState().isAuthenticated).toBe(false);
  expect(disk.has(AUTH_SESSION_STORAGE_KEY)).toBe(false);
});

it('un nuevo login no queda borrado por un logout anterior todavía pendiente', async () => {
  const removal = deferred<void>();
  const started = deferred<void>();
  deleteItem.mockImplementationOnce(async (key) => {
    started.resolve();
    await removal.promise;
    disk.delete(key);
  });
  const logout = useAuthStore.getState().logout();
  await started.promise;
  const newLogin = useAuthStore.getState().login(credentials);
  removal.resolve();
  await Promise.all([logout, newLogin]);
  expect(useAuthStore.getState().isAuthenticated).toBe(true);
  expect(JSON.parse(disk.get(AUTH_SESSION_STORAGE_KEY)!)).toEqual(response);
});

it('intenta borrar todas las claves y permite reintentar un fallo de limpieza', async () => {
  for (const key of [AUTH_SESSION_STORAGE_KEY, ...Object.values(STORAGE_KEYS)]) disk.set(key, 'old');
  deleteItem.mockRejectedValueOnce(new Error('Device locked'));
  await useAuthStore.getState().logout();
  for (const key of [AUTH_SESSION_STORAGE_KEY, ...Object.values(STORAGE_KEYS)]) {
    expect(deleteItem).toHaveBeenCalledWith(key);
  }
  expect(useAuthStore.getState()).toMatchObject({ isAuthenticated: false, sessionIssue: { kind: 'logout' } });
  await useAuthStore.getState().logout();
  expect(disk.size).toBe(0);
  expect(useAuthStore.getState().sessionIssue).toBeNull();
});
