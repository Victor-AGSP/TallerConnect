import type { AxiosError, AxiosInstance } from 'axios';

/** Nunca incluir query, fragmento, credenciales, cabeceras ni cuerpos en la traza. */
export function safeHttpTarget(baseURL = '', path = ''): string {
  try {
    const absolute = /^https?:\/\//i.test(path)
      ? path
      : `${baseURL.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
    const url = new URL(absolute);
    return `${url.origin}${url.pathname}`;
  } catch {
    return '[destino no disponible]';
  }
}

export function attachHttpTraceInterceptor(client: AxiosInstance): void {
  client.interceptors.response.use(
    (response) => {
      console.info('[HTTP]', (response.config.method ?? 'get').toUpperCase(),
        safeHttpTarget(response.config.baseURL, response.config.url), response.status);
      return response;
    },
    (error: AxiosError) => {
      console.info('[HTTP]', (error.config?.method ?? 'get').toUpperCase(),
        safeHttpTarget(error.config?.baseURL, error.config?.url),
        error.response?.status ?? 'NETWORK_ERROR');
      return Promise.reject(error);
    },
  );
}
