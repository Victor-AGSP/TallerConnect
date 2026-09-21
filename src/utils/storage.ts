import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export const storage = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === 'web') return null;

    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error(`Error al leer la clave ${key} de SecureStore:`, error);
      return null;
    }
  },

  async set(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') return;

    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error(`Error al guardar la clave ${key} en SecureStore:`, error);
    }
  },

  async remove(key: string): Promise<void> {
    if (Platform.OS === 'web') return;

    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error(`Error al eliminar la clave ${key} de SecureStore:`, error);
    }
  },
};
