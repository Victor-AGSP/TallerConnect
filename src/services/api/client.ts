import axios from 'axios';
import { ENV } from '@/config/env';
import {
  attachAuthTokenInterceptor,
  attachErrorInterceptor,
} from './interceptors';

/**
 * URL base oficial de la API Gateway resuelta según el entorno (Dev / Integración).
 */
export const API_BASE_URL = ENV.API_URL;

/**
 * Timeout estándar de 15 segundos para solicitudes HTTP hacia la API Gateway.
 */
export const DEFAULT_TIMEOUT_MS = ENV.TIMEOUT_MS;

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

// 1. Interceptor de peticiones: Adjuntar token Bearer automáticamente en rutas protegidas
attachAuthTokenInterceptor(apiClient);

// 2. Interceptor de respuestas: Manejo centralizado de errores ({ detail }), timeout y logout en 401/403
attachErrorInterceptor(apiClient);
