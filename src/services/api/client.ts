import axios from 'axios';
import { attachAuthTokenInterceptor } from './interceptors';

/**
 * URL base oficial de la API Gateway 
 * Puede sobreescribirse mediante la variable de entorno EXPO_PUBLIC_API_URL.
 */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000/api';

/**
 * Timeout estándar de 10 segundos para solicitudes HTTP hacia la API Gateway.
 */
export const DEFAULT_TIMEOUT_MS = 10000;

/**
 * Cliente HTTP centralizado basado en Axios para todas las solicitudes
 * hacia la API Gateway del sistema TallerConnect.
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: DEFAULT_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Registrar interceptor de autenticación para adjuntar token Bearer automáticamente
attachAuthTokenInterceptor(apiClient);