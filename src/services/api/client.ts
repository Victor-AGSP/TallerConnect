import axios from 'axios';

import { storage, STORAGE_KEYS } from '@/utils/storage';

/**
 * URL base de la API.
 *
 * Producción:
 * https://tallerconect.vercel.app/api
 *
 * Se permite sobrescribir mediante:
 *
 * EXPO_PUBLIC_API_URL
 */
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  'https://tallerconect.vercel.app/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,

  timeout: 15000,

  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

/**
 * ============================================================
 * REQUEST INTERCEPTOR
 * ============================================================
 *
 * Antes de cada petición protegida:
 *
 * 1. Busca el JWT almacenado.
 * 2. Si existe, agrega:
 *
 *    Authorization: Bearer <token>
 *
 * Esto evita tener que escribir manualmente el header
 * en cada servicio.
 */
apiClient.interceptors.request.use(
  async (config) => {
    const token = await storage.get(
      STORAGE_KEYS.AUTH_TOKEN
    );

    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * ============================================================
 * RESPONSE INTERCEPTOR
 * ============================================================
 *
 * Si el backend responde 401:
 *
 * - el JWT ya no es válido, o
 * - la sesión expiró.
 *
 * Eliminamos la sesión almacenada para evitar
 * seguir utilizando un token inválido.
 */
apiClient.interceptors.response.use(
  (response) => response,

  async (error) => {
    if (error.response?.status === 401) {
      await storage.clearSession();
    }

    return Promise.reject(error);
  }
);