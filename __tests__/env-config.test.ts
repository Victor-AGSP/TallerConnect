import { resolveApiUrl, API_GATEWAY_URLS, DEFAULT_TIMEOUT_MS, ENV } from '@/config/env';
import { API_BASE_URL, DEFAULT_TIMEOUT_MS as CLIENT_TIMEOUT } from '@/services/api/client';

describe('Configuración de Entornos y URL de la API Gateway', () => {
  describe('resolveApiUrl', () => {
    it('prioriza la URL explícita (EXPO_PUBLIC_API_URL) por sobre cualquier entorno', () => {
      const explicitUrl = 'http://192.168.1.100:8000/api';
      const resolved = resolveApiUrl('production', explicitUrl, 'ios');

      expect(resolved).toBe(explicitUrl);
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

  describe('Constantes de Timeout y Configuración Global (ENV)', () => {
    it('define un timeout estándar de 15 segundos (15000 ms)', () => {
      expect(DEFAULT_TIMEOUT_MS).toBe(15000);
      expect(ENV.TIMEOUT_MS).toBe(15000);
      expect(CLIENT_TIMEOUT).toBe(15000);
    });

    it('sincroniza API_BASE_URL de apiClient con la configuración ENV.API_URL', () => {
      expect(API_BASE_URL).toBe(ENV.API_URL);
    });

    it('expone propiedades de configuración tipadas en el objeto ENV', () => {
      expect(ENV).toHaveProperty('APP_ENV');
      expect(ENV).toHaveProperty('API_URL');
      expect(ENV).toHaveProperty('IS_DEV');
      expect(ENV).toHaveProperty('USE_MOCK_AUTH');
      expect(ENV).toHaveProperty('TIMEOUT_MS');
    });
  });
});
