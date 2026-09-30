import { login } from '@/services/auth.service';

import { apiClient } from '@/services/api/client';

jest.mock('@/services/api/client', () => ({
  apiClient: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('auth.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('debe iniciar sesión correctamente con credenciales válidas', async () => {
      mockedApiClient.post.mockResolvedValueOnce({
        data: {
          access_token: 'jwt-token-prueba',
          token_type: 'bearer',
        },
      } as never);

      mockedApiClient.get.mockResolvedValueOnce({
        data: {
          id: 1,
          email: 'cliente@pruebas.cl',
          full_name: 'Cliente de Prueba',
          roles: ['cliente'],
          is_active: true,
        },
      } as never);

      const result = await login({
        email: 'cliente@pruebas.cl',
        password: 'ClientePrueba123!',
      });

      expect(result).toEqual({
        token: 'jwt-token-prueba',
        user: {
          id: '1',
          email: 'cliente@pruebas.cl',
          name: 'Cliente de Prueba',
          role: 'cliente',
        },
      });

      expect(mockedApiClient.post).toHaveBeenCalledWith(
        '/auth/login',
        {
          email: 'cliente@pruebas.cl',
          password: 'ClientePrueba123!',
        }
      );

      expect(mockedApiClient.get).toHaveBeenCalledWith(
        '/auth/me',
        {
          headers: {
            Authorization: 'Bearer jwt-token-prueba',
          },
        }
      );
    });

    it('debe rechazar credenciales inválidas', async () => {
      mockedApiClient.post.mockRejectedValueOnce(
        new Error('Correo o contraseña incorrectos.')
      );

      await expect(
        login({
          email: 'cliente@pruebas.cl',
          password: 'contraseña-incorrecta',
        })
      ).rejects.toThrow(
        'Correo o contraseña incorrectos.'
      );
    });

    it('debe informar cuando el servidor no entrega token', async () => {
      mockedApiClient.post.mockResolvedValueOnce({
        data: {
          access_token: '',
        },
      } as never);

      await expect(
        login({
          email: 'cliente@pruebas.cl',
          password: 'ClientePrueba123!',
        })
      ).rejects.toThrow(
        'El servidor no entregó un token de acceso.'
      );
    });

    it('debe informar un error cuando falla la comunicación con el servidor', async () => {
      mockedApiClient.post.mockRejectedValueOnce(
        new Error(
          'No fue posible conectarse con el servidor.'
        )
      );

      await expect(
        login({
          email: 'cliente@pruebas.cl',
          password: 'ClientePrueba123!',
        })
      ).rejects.toThrow(
        'No fue posible conectarse con el servidor.'
      );
    });
  });
});