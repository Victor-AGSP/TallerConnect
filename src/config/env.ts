import { Platform } from 'react-native';

/**
 * Entornos soportados por la aplicación TallerConnect.
 */
export type AppEnvironment = 'development' | 'integration' | 'production' | 'test';

/**
 * URLs oficiales de la API Gateway según el entorno.
 */
export const API_GATEWAY_URLS = {
  // Entorno de integración desplegado en Vercel
  INTEGRATION: 'https://tallerconect.vercel.app/api',
  // Entorno de producción
  PRODUCTION: 'https://tallerconect.vercel.app/api',
  // Entorno local para Web e iOS Simulator
  LOCAL: 'http://localhost:8000/api',
  // Entorno local para emuladores Android (10.0.2.2 mapea al localhost del host)
  ANDROID_EMULATOR: 'http://10.0.2.2:8000/api',
} as const;

/**
 * Timeout por defecto para solicitudes hacia la API Gateway (15 segundos).
 */
export const DEFAULT_TIMEOUT_MS = 15000;

/**
 * Resuelve la URL base de la API Gateway considerando:
 * 1. Variable explícita EXPO_PUBLIC_API_URL (máxima prioridad)
 * 2. Entorno configurado (development vs integration / production)
 * 3. Plataforma del dispositivo (manejo de Android Emulator)
 */
export function resolveApiUrl(
  configuredEnv?: string,
  explicitUrl?: string,
  platformOs?: string
): string {
  // 1. Si se especificó una URL explícita (ej. IP local en .env), usarla directamente
  if (explicitUrl && explicitUrl.trim() !== '') {
    return explicitUrl.trim();
  }

  const env = (configuredEnv ?? '').toLowerCase();

  // 2. Entornos de integración o producción apuntan a la nube
  if (env === 'integration' || env === 'production') {
    return API_GATEWAY_URLS.INTEGRATION;
  }

  // 3. Entorno de desarrollo: distinguir Android Emulator de Web/iOS
  const os = platformOs ?? Platform?.OS;
  if (os === 'android') {
    return API_GATEWAY_URLS.ANDROID_EMULATOR;
  }

  return API_GATEWAY_URLS.LOCAL;
}

/**
 * Detecta el entorno activo actual.
 */
function resolveAppEnvironment(): AppEnvironment {
  const envVar = (process.env.EXPO_PUBLIC_APP_ENV ?? '').toLowerCase();

  if (envVar === 'integration') return 'integration';
  if (envVar === 'production') return 'production';
  if (envVar === 'test' || process.env.NODE_ENV === 'test') return 'test';

  return 'development';
}

const currentEnv = resolveAppEnvironment();

/**
 * Configuración centralizada e inmutable de variables de entorno de TallerConnect.
 */
export const ENV = {
  /**
   * Entorno actual de ejecución.
   */
  APP_ENV: currentEnv,

  /**
   * URL base de la API Gateway resuelta para el entorno actual.
   */
  API_URL: resolveApiUrl(
    currentEnv,
    process.env.EXPO_PUBLIC_API_URL,
    Platform?.OS
  ),

  /**
   * Indica si la aplicación está en modo desarrollo o pruebas.
   */
  IS_DEV: currentEnv === 'development' || currentEnv === 'test',

  /**
   * Indica si se deben utilizar datos de prueba locales (mocks) en lugar de la API Gateway.
   */
  USE_MOCK_AUTH: process.env.EXPO_PUBLIC_USE_MOCK_AUTH === 'true',

  /**
   * Timeout estándar para peticiones de red en milisegundos.
   */
  TIMEOUT_MS: DEFAULT_TIMEOUT_MS,
} as const;
