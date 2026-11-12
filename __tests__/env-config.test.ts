import {
  resolveApiUrl,
  resolveAppEnvironment,
  normalizeGatewayBaseUrl,
  buildGatewayEndpointPath,
  resolveTimeoutMs,
  isSecureGatewayUrl,
  isMockModeEnabled,
  API_GATEWAY_URLS,
  GATEWAY_ROUTES,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_UPLOAD_TIMEOUT_MS,
  DEFAULT_PING_TIMEOUT_MS,
  ENV,
} from '@/config/env';
import { API_BASE_URL, DEFAULT_TIMEOUT_MS as CLIENT_TIMEOUT } from '@/services/api/client';

describe('Configuración de Entornos y URL de la API Gateway', () => {
  describe('resolveApiUrl y normalizeGatewayBaseUrl', () => {
    it('prioriza la URL explícita de Gateway en desarrollo y limpia barras finales', () => {
      const explicitUrl = 'http://192.168.1.100:8000/api/';
      const resolved = resolveApiUrl('development', explicitUrl, 'ios');
      expect(resolved).toBe('http://192.168.1.100:8000/api');
      expect(normalizeGatewayBaseUrl('  https://tallerconect.vercel.app/api/// ')).toBe(
        'https://tallerconect.vercel.app/api'
      );
    });

    it('rechaza HTTP y orígenes ajenos en integración/producción', () => {
      expect(() => resolveApiUrl('integration', 'http://tallerconect.vercel.app/api')).toThrow(/HTTPS/);
      expect(() => resolveApiUrl('production', 'https://otro-host.example/api')).toThrow(/origen autorizado/);
    });

    it('rechaza URLs que apuntan a OpenAPI o rutas de microservicios', () => {
      expect(() => resolveApiUrl('integration', 'https://tallerconect.vercel.app/ms1')).toThrow(/ruta \/api/);
      expect(() => resolveApiUrl('integration', 'https://tallerconect.vercel.app/api/auth')).toThrow(/ruta \/api/);
    });

    it('resuelve la URL de la nube (Vercel) para entorno de integración', () => {
      const resolved = resolveApiUrl('integration', undefined, 'ios');

      expect(resolved).toBe(API_GATEWAY_URLS.INTEGRATION);
      expect(resolved).toBe('https://tallerconect.vercel.app/api');
    });

    it('resuelve la URL de la nube para entorno de producción', () => {
      const resolved = resolveApiUrl('production', undefined, 'android');

      expect(resolved).toBe(API_GATEWAY_URLS.PRODUCTION);
    });

    it('resuelve localhost para desarrollo en Web o iOS', () => {
      const resolvedIos = resolveApiUrl('development', undefined, 'ios');
      const resolvedWeb = resolveApiUrl('development', undefined, 'web');

      expect(resolvedIos).toBe(API_GATEWAY_URLS.LOCAL);
      expect(resolvedWeb).toBe(API_GATEWAY_URLS.LOCAL);
      expect(resolvedIos).toBe('http://localhost:8000/api');
    });

    it('resuelve 10.0.2.2 para desarrollo en emulador Android', () => {
      const resolvedAndroid = resolveApiUrl('development', undefined, 'android');

      expect(resolvedAndroid).toBe(API_GATEWAY_URLS.ANDROID_EMULATOR);
      expect(resolvedAndroid).toBe('http://10.0.2.2:8000/api');
    });
  });

  describe('buildGatewayEndpointPath', () => {
    it('evita duplicar el prefijo /api cuando la URL base ya termina en /api', () => {
      expect(
        buildGatewayEndpointPath('/api/vehiculos', 'https://tallerconect.vercel.app/api')
      ).toBe('/vehiculos');
      expect(
        buildGatewayEndpointPath('ordenes/15', 'https://tallerconect.vercel.app/api/')
      ).toBe('/ordenes/15');
      expect(
        buildGatewayEndpointPath('/presupuestos', 'https://tallerconect.vercel.app/api')
      ).toBe('/presupuestos');
    });

    it('rechaza URLs absolutas para impedir que apiClient omita la Gateway', () => {
      expect(() => buildGatewayEndpointPath('https://tallerconect.vercel.app/ms3/openapi.json')).toThrow(/rutas relativas/);
    });

    it('conserva rutas relativas cuando la base no termina en /api', () => {
      expect(buildGatewayEndpointPath('/api/vehiculos', 'https://tallerconect.vercel.app')).toBe('/api/vehiculos');
    });
  });

  describe('Helpers de validación de entorno, seguridad y timeouts', () => {
    it('resuelve entornos correctamente mediante resolveAppEnvironment', () => {
      expect(resolveAppEnvironment('integration', 'development')).toBe('integration');
      expect(resolveAppEnvironment('production', 'development')).toBe('production');
      expect(resolveAppEnvironment(undefined, 'test')).toBe('test');
      expect(resolveAppEnvironment('development', 'development')).toBe('development');
    });

    it('valida timeouts personalizados y usa fallback ante valores inválidos', () => {
      expect(resolveTimeoutMs('25000', DEFAULT_TIMEOUT_MS)).toBe(25000);
      expect(resolveTimeoutMs(45000, DEFAULT_TIMEOUT_MS)).toBe(45000);
      expect(resolveTimeoutMs('invalido', DEFAULT_TIMEOUT_MS)).toBe(DEFAULT_TIMEOUT_MS);
      expect(resolveTimeoutMs(-100, DEFAULT_TIMEOUT_MS)).toBe(DEFAULT_TIMEOUT_MS);
      expect(resolveTimeoutMs('', DEFAULT_UPLOAD_TIMEOUT_MS)).toBe(DEFAULT_UPLOAD_TIMEOUT_MS);
    });

    it('exige HTTPS, origen oficial y ruta /api en integración y producción', () => {
      expect(isSecureGatewayUrl('https://tallerconect.vercel.app/api', 'integration')).toBe(true);
      expect(isSecureGatewayUrl('http://tallerconect.vercel.app/api', 'production')).toBe(false);
      expect(isSecureGatewayUrl('https://otro-host.example/api', 'integration')).toBe(false);
      expect(isSecureGatewayUrl('https://tallerconect.vercel.app/ms2', 'integration')).toBe(false);
      expect(isSecureGatewayUrl('https://tallerconect.vercel.app/api', 'production')).toBe(true);
      expect(isSecureGatewayUrl('http://localhost:8000/api', 'development')).toBe(true);
    });

    it('evalúa flags de modo simulado (mocks) con prioridad para EXPO_PUBLIC_USE_MOCK_SERVICES', () => {
      expect(isMockModeEnabled('false', 'true')).toBe(true);
      expect(isMockModeEnabled('true', 'false')).toBe(false);
      expect(isMockModeEnabled('true', undefined)).toBe(true);
      expect(isMockModeEnabled('false', undefined)).toBe(false);
    });
  });

  describe('Constantes de Timeout y Configuración Global (ENV)', () => {
    it('define timeouts estándar (15s), de subida multimedia (60s) y de ping (5s)', () => {
      expect(DEFAULT_TIMEOUT_MS).toBe(15000);
      expect(DEFAULT_UPLOAD_TIMEOUT_MS).toBe(60000);
      expect(DEFAULT_PING_TIMEOUT_MS).toBe(5000);
      expect(ENV.TIMEOUT_MS).toBe(15000);
      expect(ENV.UPLOAD_TIMEOUT_MS).toBe(60000);
      expect(ENV.PING_TIMEOUT_MS).toBe(5000);
      expect(CLIENT_TIMEOUT).toBe(15000);
    });

    it('sincroniza API_BASE_URL de apiClient con la configuración ENV.API_URL', () => {
      expect(API_BASE_URL).toBe(ENV.API_URL);
    });

    it('expone propiedades de configuración tipadas y rutas de Gateway en el objeto ENV', () => {
      expect(ENV).toHaveProperty('APP_ENV');
      expect(ENV).toHaveProperty('API_URL');
      expect(ENV).toHaveProperty('IS_DEV');
      expect(ENV).toHaveProperty('USE_MOCK_AUTH');
      expect(ENV).toHaveProperty('USE_MOCK_SERVICES');
      expect(ENV).toHaveProperty('ENABLE_NOTIFICATIONS_API');
      expect(ENV).toHaveProperty('TIMEOUT_MS');
      expect(ENV).toHaveProperty('UPLOAD_TIMEOUT_MS');
      expect(ENV).toHaveProperty('PING_TIMEOUT_MS');
      expect(ENV).toHaveProperty('IS_SECURE_GATEWAY');
      expect(ENV.ROUTES).toEqual(GATEWAY_ROUTES);
    });
  });
});
