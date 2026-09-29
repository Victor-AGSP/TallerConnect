import {
  mapLoginResponse,
  mapUserResponse,
} from '@/mappers/auth.mapper';
import {
  invalidUserResponsePayloads,
  loginResponsePayloads,
  userResponsePayloads,
} from '@/mocks/payloads/auth.payload';

const INVALID_ROLE_MESSAGE =
  'El usuario no tiene un rol válido para TallerConnect.';

describe('Transformación de datos de autenticación', () => {
  describe('mapUserResponse', () => {
    it('convierte el usuario de la API al modelo User', () => {
      expect(mapUserResponse(userResponsePayloads.cliente)).toEqual({
        id: '1',
        name: 'Cliente de Prueba',
        email: 'cliente@pruebas.cl',
        role: 'cliente',
      });
    });

    it('convierte el id numérico a texto', () => {
      const user = mapUserResponse(userResponsePayloads.mecanico);

      expect(user.id).toBe('2');
      expect(typeof user.id).toBe('string');
    });

    it.each(Object.entries(userResponsePayloads))(
      'asigna el rol %s desde roles',
      (role, payload) => {
        expect(mapUserResponse(payload).role).toBe(role);
      },
    );

    it('no incluye campos del backend que no existen en el modelo', () => {
      const user = mapUserResponse(userResponsePayloads.cliente);

      expect(user).not.toHaveProperty('full_name');
      expect(user).not.toHaveProperty('roles');
      expect(user).not.toHaveProperty('is_active');
    });

    it.each(Object.entries(invalidUserResponsePayloads))(
      'rechaza el caso %s',
      (_case, payload) => {
        expect(() => mapUserResponse(payload)).toThrow(INVALID_ROLE_MESSAGE);
      },
    );
  });

  describe('mapLoginResponse', () => {
    it('convierte la respuesta de login al modelo AuthResponse', () => {
      expect(mapLoginResponse(loginResponsePayloads.cliente)).toEqual({
        user: {
          id: '1',
          name: 'Cliente de Prueba',
          email: 'cliente@pruebas.cl',
          role: 'cliente',
        },
        token: 'token-simulado-cliente',
      });
    });

    it.each(Object.entries(loginResponsePayloads))(
      'transforma el login del rol %s',
      (role, payload) => {
        const response = mapLoginResponse(payload);

        expect(response.token).toBe(payload.access_token);
        expect(response.user.role).toBe(role);
      },
    );

    it('no incluye token_type ni refreshToken', () => {
      const response = mapLoginResponse(loginResponsePayloads.cliente);

      expect(response).not.toHaveProperty('token_type');
      expect(response).not.toHaveProperty('refreshToken');
    });

    it('rechaza un login cuyo usuario no tiene un rol válido', () => {
      const payload = {
        ...loginResponsePayloads.cliente,
        user: invalidUserResponsePayloads.unknownRole,
      };

      expect(() => mapLoginResponse(payload)).toThrow(INVALID_ROLE_MESSAGE);
    });
  });
});