import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { storage, StorageError, STORAGE_KEYS } from '@/utils/storage';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn(),
}));

const originalPlatform = Object.getOwnPropertyDescriptor(Platform, 'OS')!;
const originalLocalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
const disk = new Map<string, string>();
const web = {
  getItem: jest.fn((key: string) => disk.get(key) ?? null),
  setItem: jest.fn((key: string, value: string) => { disk.set(key, value); }),
  removeItem: jest.fn((key: string) => { disk.delete(key); }),
};

beforeEach(() => {
  disk.clear();
  jest.clearAllMocks();
  jest.mocked(SecureStore.getItemAsync).mockImplementation(async (key) => disk.get(key) ?? null);
  jest.mocked(SecureStore.setItemAsync).mockImplementation(async (key, value) => { disk.set(key, value); });
  jest.mocked(SecureStore.deleteItemAsync).mockImplementation(async (key) => { disk.delete(key); });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: web });
});
afterEach(() => {
  Object.defineProperty(Platform, 'OS', originalPlatform);
  if (originalLocalStorage) Object.defineProperty(globalThis, 'localStorage', originalLocalStorage);
  else Reflect.deleteProperty(globalThis, 'localStorage');
});

describe.each(['ios', 'web'])('almacenamiento de sesión en %s', (platform) => {
  beforeEach(() => Object.defineProperty(Platform, 'OS', { configurable: true, value: platform }));

  it('guarda, recupera y elimina objetos sin tocar datos ajenos', async () => {
    disk.set('preferencias', 'conservar');
    await storage.setObject(STORAGE_KEYS.USER_DATA, { id: '1' });
    await storage.set(STORAGE_KEYS.AUTH_TOKEN, 'token-de-prueba');
    expect(await storage.getObject(STORAGE_KEYS.USER_DATA)).toEqual({ id: '1' });
    expect(await storage.get(STORAGE_KEYS.AUTH_TOKEN)).toBe('token-de-prueba');
    await storage.clearSession();
    expect([...disk.entries()]).toEqual([['preferencias', 'conservar']]);
    if (platform === 'web') expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    else expect(web.setItem).not.toHaveBeenCalled();
  });

  it('distingue JSON corrupto de un fallo de lectura', async () => {
    disk.set('invalid', '{');
    expect(await storage.getObject('invalid')).toBeNull();
    expect(await storage.getObject('missing')).toBeNull();
  });

  it.each(['get', 'set', 'remove'] as const)('propaga un fallo de %s sin exponer detalles nativos', async (operation) => {
    const failure = new Error('dato-sensible-del-driver');
    if (platform === 'web') {
      const method = { get: web.getItem, set: web.setItem, remove: web.removeItem }[operation];
      method.mockImplementationOnce(() => { throw failure; });
    } else {
      const method = {
        get: jest.mocked(SecureStore.getItemAsync),
        set: jest.mocked(SecureStore.setItemAsync),
        remove: jest.mocked(SecureStore.deleteItemAsync),
      }[operation];
      method.mockRejectedValueOnce(failure);
    }
    const result = operation === 'set' ? storage.set('key', 'value') : storage[operation]('key');
    await expect(result).rejects.toBeInstanceOf(StorageError);
    await expect(result).rejects.not.toThrow('dato-sensible-del-driver');
  });
});
