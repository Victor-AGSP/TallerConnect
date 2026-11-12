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
 * Prefijos oficiales de rutas expuestos por la API Gateway para los microservicios.
 */
export const GATEWAY_ROUTES = {
  AUTH: '/auth',
  VEHICLES: '/vehiculos',
  ORDERS: '/ordenes',
  BUDGETS: '/presupuestos',
  PARTS: '/repuestos',
  PROVIDERS: '/proveedores',
  EVIDENCES: '/evidencias',
  NOTIFICATIONS: '/notificaciones',
} as const;

/**
 * Timeout por defecto para solicitudes estándar hacia la API Gateway (15 segundos).
 */
export const DEFAULT_TIMEOUT_MS = 15000;

/**
 * Timeout extendido para subida de archivos multimedia hacia MS4 (60 segundos).
 */
export const DEFAULT_UPLOAD_TIMEOUT_MS = 60000;

/**
 * Timeout para sondas ligeras de verificación de conectividad (5 segundos).
 */
export const DEFAULT_PING_TIMEOUT_MS = 5000;

/**
 * Normaliza la URL base de la API Gateway eliminando barras diagonales finales redundantes.
 */
export function normalizeGatewayBaseUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) {
    return API_GATEWAY_URLS.LOCAL;
  }
  return trimmed.replace(/\/+$/, '');
}

/**
 * Normaliza una ruta relativa de endpoint para evitar duplicar el prefijo `/api`
 * cuando `baseURL` ya finaliza en `/api` (ej. `/api/vehiculos` -> `/vehiculos`).
 */
export function buildGatewayEndpointPath(
  endpoint: string,
  baseUrl: string = API_GATEWAY_URLS.INTEGRATION
): string {
  const trimmed = endpoint.trim();
  if (!trimmed) {
    return '/';
  }

  if (/^https?:\/\//i.test(trimmed)) {
    throw new Error(
      'apiClient solo admite rutas relativas; las solicitudes deben pasar por la API Gateway configurada.'
    );
  }

  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const normalizedBase = normalizeGatewayBaseUrl(baseUrl);

  if (/\/api$/i.test(normalizedBase) && /^\/api(\/|$)/i.test(withLeadingSlash)) {
    const stripped = withLeadingSlash.replace(/^\/api/i, '');
    return stripped.startsWith('/') ? stripped : `/${stripped}`;
  }

  return withLeadingSlash;
}

/**
 * Resuelve un valor numérico de timeout en milisegundos desde variables de entorno.
 */
export function resolveTimeoutMs(
  rawValue?: string | number,
  fallbackMs: number = DEFAULT_TIMEOUT_MS
): number {
  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return fallbackMs;
  }
  const parsed = typeof rawValue === 'number' ? rawValue : Number(String(rawValue).trim());
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallbackMs;
  }
  return Math.floor(parsed);
}

/**
 * Verifica si la URL de la API Gateway cumple el requisito de seguridad HTTPS
 * fuera de entornos locales de desarrollo o pruebas.
 */
export function isSecureGatewayUrl(
  url: string,
  env: AppEnvironment = 'development'
): boolean {
  try {
    const parsed = new URL(normalizeGatewayBaseUrl(url));
    const pathname = parsed.pathname.replace(/\/+$/, '') || '/';
    if (
      pathname !== '/api' ||
      parsed.username !== '' ||
      parsed.password !== '' ||
      parsed.search !== '' ||
      parsed.hash !== ''
    ) return false;

    if (env === 'integration' || env === 'production') {
      const officialUrl = new URL(
        env === 'integration' ? API_GATEWAY_URLS.INTEGRATION : API_GATEWAY_URLS.PRODUCTION
      );
      return parsed.protocol === 'https:' && parsed.origin === officialUrl.origin;
    }
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Determina si los servicios deben operar con adaptadores simulados (mocks)
 * según las variables de entorno configuradas.
 */
export function isMockModeEnabled(
  mockAuthFlag: string | undefined = process.env.EXPO_PUBLIC_USE_MOCK_AUTH,
  mockServicesFlag: string | undefined = process.env.EXPO_PUBLIC_USE_MOCK_SERVICES
): boolean {
  if (mockServicesFlag !== undefined && mockServicesFlag.trim() !== '') {
    return mockServicesFlag.trim().toLowerCase() === 'true';
  }
  return (mockAuthFlag ?? '').trim().toLowerCase() === 'true';
}

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
  const rawEnv = (configuredEnv ?? '').toLowerCase();
  const env: AppEnvironment =
    rawEnv === 'integration' || rawEnv === 'production' || rawEnv === 'test'
      ? rawEnv
      : 'development';

  let candidate: string;
  if (explicitUrl && explicitUrl.trim() !== '') {
    candidate = normalizeGatewayBaseUrl(explicitUrl);
  } else if (env === 'integration') {
    candidate = API_GATEWAY_URLS.INTEGRATION;
  } else if (env === 'production') {
    candidate = API_GATEWAY_URLS.PRODUCTION;
  } else {
    const os = platformOs ?? Platform?.OS;
    candidate = os === 'android'
      ? API_GATEWAY_URLS.ANDROID_EMULATOR
      : API_GATEWAY_URLS.LOCAL;
  }

  if (!isSecureGatewayUrl(candidate, env)) {
    throw new Error(
      `URL de API Gateway no válida para el entorno "${env}". Usa el origen autorizado y la ruta /api; integración y producción requieren HTTPS.`
    );
  }
  return normalizeGatewayBaseUrl(candidate);
}

/**
 * Detecta el entorno activo actual.
 */
export function resolveAppEnvironment(
  rawEnv: string | undefined = process.env.EXPO_PUBLIC_APP_ENV,
  nodeEnv: string | undefined = process.env.NODE_ENV
): AppEnvironment {
  const envVar = (rawEnv ?? '').toLowerCase().trim();

  if (envVar === 'integration') return 'integration';
  if (envVar === 'production') return 'production';
  if (envVar === 'test' || nodeEnv === 'test') return 'test';

  return 'development';
}

const currentEnv = resolveAppEnvironment();
const resolvedApiUrl = resolveApiUrl(
  currentEnv,
  process.env.EXPO_PUBLIC_API_URL,
  Platform?.OS
);

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
  API_URL: resolvedApiUrl,

  /**
   * Indica si la aplicación está en modo desarrollo o pruebas.
   */
  IS_DEV: currentEnv === 'development' || currentEnv === 'test',

  /**
   * Indica si se deben utilizar datos de prueba locales (mocks) en autenticación.
   */
  USE_MOCK_AUTH: process.env.EXPO_PUBLIC_USE_MOCK_AUTH === 'true',

  /**
   * Indica si los servicios de dominio deben operar con adaptadores simulados (mocks).
   */
  USE_MOCK_SERVICES: isMockModeEnabled(),

  /**
   * Indica si el contrato HTTP de avisos/notificaciones está habilitado en la Gateway.
   */
  ENABLE_NOTIFICATIONS_API: process.env.EXPO_PUBLIC_ENABLE_NOTIFICATIONS_API === 'true',

  /**
   * Timeout estándar para peticiones de red en milisegundos.
   */
  TIMEOUT_MS: resolveTimeoutMs(process.env.EXPO_PUBLIC_API_TIMEOUT_MS, DEFAULT_TIMEOUT_MS),

  /**
   * Timeout extendido para subida de archivos multimedia (multipart/form-data).
   */
  UPLOAD_TIMEOUT_MS: resolveTimeoutMs(
    process.env.EXPO_PUBLIC_UPLOAD_TIMEOUT_MS,
    DEFAULT_UPLOAD_TIMEOUT_MS
  ),

  /**
   * Timeout para verificación rápida de conectividad con la API Gateway.
   */
  PING_TIMEOUT_MS: DEFAULT_PING_TIMEOUT_MS,

  /**
   * Indica si la URL actual de la Gateway cumple con el esquema seguro esperado.
   */
  IS_SECURE_GATEWAY: isSecureGatewayUrl(resolvedApiUrl, currentEnv),

  /**
   * Prefijos oficiales de rutas en la API Gateway.
   */
  ROUTES: GATEWAY_ROUTES,
} as const;
