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
    it('prioriza la URL explícita (EXPO_PUBLIC_API_URL) por sobre cualquier entorno y limpia barras finales', () => {
      const explicitUrl = 'http://192.168.1.100:8000/api/';
      const resolved = resolveApiUrl('production', explicitUrl, 'ios');

      expect(resolved).toBe('http://192.168.1.100:8000/api');
      expect(normalizeGatewayBaseUrl('  https://tallerconect.vercel.app/api/// ')).toBe(
        'https://tallerconect.vercel.app/api'
      );
    });

    // D-11: la Gateway de integración vigente es la de la UCT (la de Vercel fue retirada).
    it.each(['ios', 'android', 'web'])(
      'resuelve la Gateway UCT para integración sin URL explícita (%s)',
      (platform) => {
        const resolved = resolveApiUrl('integration', undefined, platform);

        expect(resolved).toBe(API_GATEWAY_URLS.INTEGRATION);
        expect(resolved).toBe('https://api-tallerconnect.inf.uct.cl/api');
      },
    );

    it('acepta el nombre de entorno sin distinguir mayúsculas', () => {
      expect(resolveApiUrl('INTEGRATION', undefined, 'ios')).toBe(API_GATEWAY_URLS.INTEGRATION);
      expect(resolveApiUrl('Production', undefined, 'ios')).toBe(API_GATEWAY_URLS.PRODUCTION);
    });

    it('resuelve producción con su propia constante, sin cambios hasta autorización del equipo', () => {
      const resolved = resolveApiUrl('production', undefined, 'android');

      expect(resolved).toBe(API_GATEWAY_URLS.PRODUCTION);
      // Valor de producción conservado a propósito (pendiente de aprobación; ver D-11).
      expect(API_GATEWAY_URLS.PRODUCTION).toBe('https://tallerconect.vercel.app/api');
    });

    it('integración y producción se resuelven de forma independiente', () => {
      expect(resolveApiUrl('integration', undefined, 'ios')).not.toBe(
        resolveApiUrl('production', undefined, 'ios'),
      );
    });

    it('la URL explícita tiene prioridad en todos los entornos y plataformas', () => {
      const explicitUrl = 'https://gateway.example.test/api';
      for (const env of ['integration', 'production', 'development', undefined]) {
        for (const platform of ['ios', 'android', 'web']) {
          expect(resolveApiUrl(env, explicitUrl, platform)).toBe(explicitUrl);
        }
      }
    });

    it('una URL explícita vacía o solo con espacios no anula la resolución por entorno', () => {
      expect(resolveApiUrl('integration', '   ', 'ios')).toBe(API_GATEWAY_URLS.INTEGRATION);
      expect(resolveApiUrl('development', '', 'android')).toBe(API_GATEWAY_URLS.ANDROID_EMULATOR);
    });

    it('un entorno desconocido o ausente nunca resuelve a la nube', () => {
      expect(resolveApiUrl('staging', undefined, 'web')).toBe(API_GATEWAY_URLS.LOCAL);
      expect(resolveApiUrl(undefined, undefined, 'android')).toBe(API_GATEWAY_URLS.ANDROID_EMULATOR);
    });

    it('normaliza barras finales de la URL explícita', () => {
      expect(resolveApiUrl('integration', 'https://api-tallerconnect.inf.uct.cl/api///', 'ios')).toBe(
        'https://api-tallerconnect.inf.uct.cl/api',
      );
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

  describe('ENV.API_URL según variables de entorno (cableado del módulo)', () => {
    const KEYS = ['EXPO_PUBLIC_APP_ENV', 'EXPO_PUBLIC_API_URL', 'EXPO_PUBLIC_USE_MOCK_SERVICES', 'EXPO_PUBLIC_USE_MOCK_AUTH'];
    const saved: Record<string, string | undefined> = {};

    beforeEach(() => KEYS.forEach((key) => { saved[key] = process.env[key]; delete process.env[key]; }));
    afterEach(() => KEYS.forEach((key) => {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }));

    function loadEnv(vars: Record<string, string>) {
      Object.assign(process.env, vars);
      let env!: typeof ENV;
      jest.isolateModules(() => {
        env = (jest.requireActual('@/config/env') as { ENV: typeof ENV }).ENV;
      });
      return env;
    }

    it('integración sin URL explícita usa la Gateway UCT y no activa mocks', () => {
      const env = loadEnv({ EXPO_PUBLIC_APP_ENV: 'integration' });
      expect(env.APP_ENV).toBe('integration');
      expect(env.API_URL).toBe('https://api-tallerconnect.inf.uct.cl/api');
      expect(env.IS_SECURE_GATEWAY).toBe(true);
      expect(env.USE_MOCK_SERVICES).toBe(false);
    });

    it('producción sin URL explícita conserva su constante', () => {
      const env = loadEnv({ EXPO_PUBLIC_APP_ENV: 'production' });
      expect(env.API_URL).toBe(API_GATEWAY_URLS.PRODUCTION);
    });

    it('una URL explícita (p. ej. en .env.local) prevalece sobre el entorno', () => {
      const env = loadEnv({
        EXPO_PUBLIC_APP_ENV: 'integration',
        EXPO_PUBLIC_API_URL: 'https://frontend-movil.inf.uct.cl/api/',
      });
      expect(env.API_URL).toBe('https://frontend-movil.inf.uct.cl/api');
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

    it('no duplica /api con la Gateway de integración', () => {
      expect(buildGatewayEndpointPath('/api/evidencias', API_GATEWAY_URLS.INTEGRATION)).toBe('/evidencias');
      expect(buildGatewayEndpointPath('auth/me', `${API_GATEWAY_URLS.INTEGRATION}/`)).toBe('/auth/me');
    });

    it('respeta URLs absolutas o bases sin sufijo /api', () => {
      expect(
        buildGatewayEndpointPath('https://tallerconect.vercel.app/ms3/openapi.json')
      ).toBe('https://tallerconect.vercel.app/ms3/openapi.json');
      expect(
        buildGatewayEndpointPath('/api/vehiculos', 'https://tallerconect.vercel.app')
      ).toBe('/api/vehiculos');
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

    it('exige HTTPS en entornos de integración y producción', () => {
      expect(isSecureGatewayUrl('https://tallerconect.vercel.app/api', 'integration')).toBe(true);
      expect(isSecureGatewayUrl('http://tallerconect.vercel.app/api', 'production')).toBe(false);
      expect(isSecureGatewayUrl('http://localhost:8000/api', 'development')).toBe(true);
    });

    it('las Gateways en la nube usan HTTPS y pasan la validación de su entorno', () => {
      expect(isSecureGatewayUrl(API_GATEWAY_URLS.INTEGRATION, 'integration')).toBe(true);
      expect(isSecureGatewayUrl(API_GATEWAY_URLS.PRODUCTION, 'production')).toBe(true);
      expect(
        isSecureGatewayUrl(API_GATEWAY_URLS.INTEGRATION.replace('https://', 'http://'), 'integration'),
      ).toBe(false);
    });

    it('no activa mocks automáticamente sin banderas explícitas', () => {
      expect(isMockModeEnabled(undefined, undefined)).toBe(false);
      expect(isMockModeEnabled('', '')).toBe(false);
      expect(ENV.USE_MOCK_SERVICES).toBe(false);
      expect(ENV.USE_DEMO_DATA).toBe(false);
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
