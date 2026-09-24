import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'tc_auth_token',
  USER_DATA: 'tc_user_data',
} as const;

const isWeb = Platform.OS === 'web';

export const storage = {
  async get(key: string): Promise<string | null> {
    try {
      if (isWeb) {
        return localStorage.getItem(key);
      }

      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error(
        `Error al leer la clave "${key}" de almacenamiento:`,
        error
      );

      return null;
    }
  },

  async set(key: string, value: string): Promise<void> {
    try {
      if (isWeb) {
        localStorage.setItem(key, value);
        return;
      }

      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error(
        `Error al guardar la clave "${key}" en almacenamiento:`,
        error
      );
    }
  },

  async remove(key: string): Promise<void> {
    try {
      if (isWeb) {
        localStorage.removeItem(key);
        return;
      }

      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error(
        `Error al eliminar la clave "${key}" de almacenamiento:`,
        error
      );
    }
  },

  async setObject<T>(key: string, value: T): Promise<void> {
    await this.set(key, JSON.stringify(value));
  },

  async getObject<T>(key: string): Promise<T | null> {
    try {
      const json = await this.get(key);

      if (!json) {
        return null;
      }

      return JSON.parse(json) as T;
    } catch (error) {
      console.error(
        `Error al deserializar objeto desde "${key}":`,
        error
      );

      return null;
    }
  },

  async clearSession(): Promise<void> {
    await this.remove(STORAGE_KEYS.AUTH_TOKEN);
    await this.remove(STORAGE_KEYS.USER_DATA);
  },
};