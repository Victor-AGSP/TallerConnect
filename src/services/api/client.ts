import axios from 'axios';

import {
  storage,
  STORAGE_KEYS,
} from '@/utils/storage';

/**
 * URL base de la API.
 *
 * Se puede sobrescribir mediante:
 *
 * EXPO_PUBLIC_API_URL
 */
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  'https://tallerconect.vercel.app/api';

export const apiClient =
  axios.create({
    baseURL: API_BASE_URL,

    timeout: 15000,

    headers: {
      'Content-Type':
        'application/json',

      Accept:
        'application/json',
    },
  });

/**
 * ============================================================
 * REQUEST INTERCEPTOR
 * ============================================================
 *
 * Agrega automáticamente:
 *
 * Authorization: Bearer <token>
 */
apiClient.interceptors.request.use(
  async (config) => {
    const token =
      await storage.get(
        STORAGE_KEYS.AUTH_TOKEN
      );

    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  },

  (error) => {
    return Promise.reject(
      error
    );
  }
);

/**
 * ============================================================
 * RESPONSE INTERCEPTOR
 * ============================================================
 *
 * Si el backend responde 401,
 * limpiamos la sesión.
 */
apiClient.interceptors.response.use(
  (response) => response,

  async (error) => {
    if (
      error.response?.status ===
      401
    ) {
      await storage.clearSession();
    }

    return Promise.reject(
      error
    );
  }
);