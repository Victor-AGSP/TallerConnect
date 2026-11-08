import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'tc_auth_token',
  USER_DATA: 'tc_user_data',
} as const;

export class StorageError extends Error {
  constructor(operation: string) {
    super(`No se pudo ${operation} la sesión en el dispositivo. Inténtalo nuevamente.`);
    this.name = 'StorageError';
  }
}

export const storage = {
  async get(key: string): Promise<string | null> {
    try {
      return Platform.OS === 'web'
        ? localStorage.getItem(key)
        : await SecureStore.getItemAsync(key);
    } catch {
      throw new StorageError('leer');
    }
  },

  async set(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web') localStorage.setItem(key, value);
      else await SecureStore.setItemAsync(key, value);
    } catch {
      throw new StorageError('guardar');
    }
  },

  async remove(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') localStorage.removeItem(key);
      else await SecureStore.deleteItemAsync(key);
    } catch {
      throw new StorageError('eliminar');
    }
  },

  async setObject<T>(key: string, value: T): Promise<void> {
    await this.set(key, JSON.stringify(value));
  },

  async getObject<T>(key: string): Promise<T | null> {
    const json = await this.get(key);
    try {
      return json ? (JSON.parse(json) as T) : null;
    } catch {
      return null;
    }
  },

  async clearSession(): Promise<void> {
    const results = await Promise.allSettled([
      this.remove(STORAGE_KEYS.AUTH_TOKEN),
      this.remove(STORAGE_KEYS.USER_DATA),
    ]);
    if (results.some((result) => result.status === 'rejected')) {
      throw new StorageError('eliminar');
    }
  },
};
