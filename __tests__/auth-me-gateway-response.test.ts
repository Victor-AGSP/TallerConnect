import { mapUserResponse } from '@/mappers/auth.mapper';
import { authMeGatewayResponses } from '@/mocks/gateway/auth-me.gateway';
import { userResponseDtoSchema } from '@/schemas/auth-dto.schema';

/** Campos de `UsuarioRespuesta` declarados como `required` en `/ms1/openapi.json`. */
const CAMPOS_CONTRATO = ['email', 'full_name', 'id', 'is_active', 'roles'];

const respuestas = Object.entries(authMeGatewayResponses);

describe('Respuesta real de GET /api/auth/me', () => {
  it.each(respuestas)('%s: trae exactamente los campos del contrato', (_, usuario) => {
    expect(Object.keys(usuario).sort()).toEqual(CAMPOS_CONTRATO);
  });

  it.each(respuestas)('%s: cumple el esquema de usuario de la app', (_, usuario) => {
    expect(userResponseDtoSchema.safeParse(usuario).success).toBe(true);
  });

  it.each(respuestas)('%s: el mapper obtiene el rol de la cuenta', (rol, usuario) => {
    expect(mapUserResponse(usuario).role).toBe(rol);
  });

  it.each(respuestas)('%s: usa un correo ficticio del dominio reservado', (_, usuario) => {
    expect(usuario.email).toMatch(/@example\.invalid$/);
  });
});