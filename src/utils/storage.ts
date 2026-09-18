import * as SecureStore from 'expo-secure-store';

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'tc_auth_token',
  USER_DATA: 'tc_user_data',
} as const;

export const storage = {
  /**
   * Obtiene un valor de texto de SecureStore.
   */
  async get(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error(`Error al leer la clave "${key}" de SecureStore:`, error);
      return null;
    }
  },

  /**
   * Guarda un valor de texto en SecureStore.
   */
  async set(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error(`Error al guardar la clave "${key}" en SecureStore:`, error);
    }
  },

  /**
   * Elimina una clave de SecureStore.
   */
  async remove(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error(`Error al eliminar la clave "${key}" de SecureStore:`, error);
    }
  },

  /**
   * Guarda un objeto serializado como JSON en SecureStore.
   */
  async setObject<T>(key: string, value: T): Promise<void> {
    try {
      const json = JSON.stringify(value);
      await this.set(key, json);
    } catch (error) {
      console.error(`Error al serializar y guardar objeto en "${key}":`, error);
    }
  },

  /**
   * Lee y deserializa un objeto JSON desde SecureStore.
   */
  async getObject<T>(key: string): Promise<T | null> {
    try {
      const json = await this.get(key);
      if (!json) return null;
      return JSON.parse(json) as T;
    } catch (error) {
      console.error(`Error al deserializar objeto desde "${key}":`, error);
      return null;
    }
  },

  /**
   * Limpia todos los datos de sesión almacenados en el dispositivo.
   */
  async clearSession(): Promise<void> {
    await this.remove(STORAGE_KEYS.AUTH_TOKEN);
    await this.remove(STORAGE_KEYS.USER_DATA);
  },
};
