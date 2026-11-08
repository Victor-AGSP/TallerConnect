import { z } from 'zod';

import {
  invalidUserResponsePayloads,
  loginRequestPayload,
  loginResponsePayloads,
  userResponsePayloads,
} from '@/mocks/payloads/auth.payload';
import {
  loginResponseDtoSchema,
  userResponseDtoSchema,
} from '@/schemas/auth-dto.schema';

/** Campos y valores definidos por el contrato de MS1 (`/ms1/openapi.json`). */
const USUARIO_RESPUESTA_CAMPOS = ['email', 'full_name', 'id', 'is_active', 'roles'];
const TOKEN_RESPUESTA_CAMPOS = ['access_token', 'token_type', 'user'];
const TOKEN_RESPUESTA_OBLIGATORIOS = ['access_token', 'user'];
const LOGIN_SOLICITUD_CAMPOS = ['email', 'password'];
const NOMBRE_ROL = ['cliente', 'mecanico', 'administrador'];

const camposOrdenados = (objeto: object) => Object.keys(objeto).sort();

describe('Contrato de autenticación con los payloads disponibles', () => {
  describe('UsuarioRespuesta', () => {
    it.each(Object.entries(userResponsePayloads))(
      'el usuario de %s tiene exactamente los campos del contrato',
      (_rol, payload) => {
        expect(camposOrdenados(payload)).toEqual(USUARIO_RESPUESTA_CAMPOS);
      },
    );

    it.each(Object.entries(userResponsePayloads))(
      'el usuario de %s cumple el schema del contrato',
      (_rol, payload) => {
        expect(userResponseDtoSchema.safeParse(payload).success).toBe(true);
      },
    );

    it.each(Object.entries(userResponsePayloads))(
      'los roles del usuario de %s pertenecen a NombreRol',
      (_rol, payload) => {
        for (const role of payload.roles) {
          expect(NOMBRE_ROL).toContain(role);
        }
      },
    );
  });

  describe('TokenRespuesta', () => {
    it.each(Object.entries(loginResponsePayloads))(
      'el login de %s solo usa campos del contrato e incluye los obligatorios',
      (_rol, payload) => {
        const campos = camposOrdenados(payload);

        for (const campo of campos) {
          expect(TOKEN_RESPUESTA_CAMPOS).toContain(campo);
        }
        for (const obligatorio of TOKEN_RESPUESTA_OBLIGATORIOS) {
          expect(campos).toContain(obligatorio);
        }
      },
    );

    it.each(Object.entries(loginResponsePayloads))(
      'el login de %s cumple el schema del contrato',
      (_rol, payload) => {
        expect(loginResponseDtoSchema.safeParse(payload).success).toBe(true);
      },
    );

    it('acepta una respuesta sin token_type, que el contrato define como opcional', () => {
      const { token_type: _omitido, ...payload } = loginResponsePayloads.cliente;

      expect(loginResponseDtoSchema.safeParse(payload).success).toBe(true);
    });

    it('rechaza una respuesta sin access_token', () => {
      const { access_token: _omitido, ...payload } = loginResponsePayloads.cliente;

      expect(loginResponseDtoSchema.safeParse(payload).success).toBe(false);
    });

    it('rechaza una respuesta sin user', () => {
      const { user: _omitido, ...payload } = loginResponsePayloads.cliente;

      expect(loginResponseDtoSchema.safeParse(payload).success).toBe(false);
    });
  });

  describe('LoginSolicitud', () => {
    it('tiene exactamente los campos del contrato, que no admite campos adicionales', () => {
      expect(camposOrdenados(loginRequestPayload)).toEqual(LOGIN_SOLICITUD_CAMPOS);
    });

    it('el correo tiene el formato email que exige el contrato', () => {
      expect(z.email().safeParse(loginRequestPayload.email).success).toBe(true);
    });
  });

  describe('Payloads inválidos', () => {
    it('el schema rechaza un usuario sin roles', () => {
      expect(
        userResponseDtoSchema.safeParse(invalidUserResponsePayloads.emptyRoles).success,
      ).toBe(false);
    });

    it('un rol desconocido no pertenece a NombreRol', () => {
      for (const role of invalidUserResponsePayloads.unknownRole.roles) {
        expect(NOMBRE_ROL).not.toContain(role);
      }
    });
  });
});