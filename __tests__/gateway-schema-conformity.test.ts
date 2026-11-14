import { z } from 'zod';

import { mapLoginResponse, mapUserResponse } from '@/mappers/auth.mapper';
import {
  InvalidOrderResponseError,
  mapOrderResponse,
  mapOrdersResponseList,
} from '@/mappers/order.mapper';
import { authMeGatewayResponses } from '@/mocks/gateway/auth-me.gateway';
import { ordersGatewayResponse } from '@/mocks/gateway/orders.gateway';
import { loginResponseDtoSchema, userResponseDtoSchema } from '@/schemas/auth-dto.schema';
import { orderListResponseDtoSchema, orderResponseDtoSchema } from '@/schemas/order-dto.schema';

/** Devuelve las rutas de los errores de validación; una lista vacía significa que el valor es válido. */
function rutasDeError(schema: z.ZodType, valor: unknown) {
  const resultado = schema.safeParse(valor);
  return resultado.success ? [] : resultado.error.issues.map((issue) => issue.path);
}

const usuario = authMeGatewayResponses.cliente;
const orden = ordersGatewayResponse[0];

/** Respuesta de login con el usuario real anonimizado; el token es ficticio. */
const login = { access_token: 'token-ficticio', token_type: 'bearer', user: usuario };

const MENSAJE_ROL_INVALIDO = 'El usuario no tiene un rol válido para TallerConnect.';

describe('Conformidad de los esquemas con respuestas reales', () => {
  /**
   * Comprueba que las órdenes se aceptan, no que se conserven completas: el esquema descarta
   * `devuelto_en` y `devuelto_por_id` (caso O1 de `gateway-contract-contrast.test.ts`).
   */
  it('las órdenes reales son aceptadas por orderListResponseDtoSchema', () => {
    expect(rutasDeError(orderListResponseDtoSchema, ordersGatewayResponse)).toEqual([]);
  });

  it('una respuesta de login con el usuario real cumple loginResponseDtoSchema y el mapper la acepta', () => {
    expect(rutasDeError(loginResponseDtoSchema, login)).toEqual([]);
    expect(mapLoginResponse(login).user.role).toBe('cliente');
  });
});

describe('Errores de validación identificados en autenticación', () => {
  it('sin token_type, loginResponseDtoSchema acepta aunque TokenRespuesta lo declara obligatorio', () => {
    const { token_type, ...sinTipo } = login;

    expect(rutasDeError(loginResponseDtoSchema, sinTipo)).toEqual([]);
  });

  it('is_active en false: el esquema acepta y el mapper rechaza', () => {
    const inactivo = { ...usuario, is_active: false };

    expect(rutasDeError(userResponseDtoSchema, inactivo)).toEqual([]);
    expect(() => mapUserResponse(inactivo)).toThrow(z.ZodError);
  });

  it('roles vacío: el contrato no exige elementos, pero el esquema lo rechaza en roles y el mapper no asigna rol', () => {
    const sinRoles = { ...usuario, roles: [] };

    expect(rutasDeError(userResponseDtoSchema, sinRoles)).toEqual([['roles']]);
    expect(() => mapUserResponse(sinRoles)).toThrow(MENSAJE_ROL_INVALIDO);
  });

  it('un rol fuera de NombreRol: el esquema acepta y el mapper rechaza', () => {
    const rolDesconocido = { ...usuario, roles: ['supervisor'] };

    expect(rutasDeError(userResponseDtoSchema, rolDesconocido)).toEqual([]);
    expect(() => mapUserResponse(rolDesconocido)).toThrow(MENSAJE_ROL_INVALIDO);
  });

  it('full_name con solo espacios: el esquema acepta y el mapper rechaza', () => {
    const nombreVacio = { ...usuario, full_name: '   ' };

    expect(rutasDeError(userResponseDtoSchema, nombreVacio)).toEqual([]);
    expect(() => mapUserResponse(nombreVacio)).toThrow(z.ZodError);
  });
});

describe('Errores de validación identificados en órdenes', () => {
  it('una fecha sin zona horaria se identifica en su campo', () => {
    const sinZona = { ...orden, creado_en: '2026-01-05T10:15:30.123456' };

    expect(rutasDeError(orderResponseDtoSchema, sinZona)).toEqual([['creado_en']]);
  });

  it('en una lista, el error indica la posición de la orden y el campo', () => {
    const lista = [
      ...ordersGatewayResponse.slice(0, 2),
      { ...ordersGatewayResponse[2], mecanico_actual_id: '506' },
    ];

    expect(rutasDeError(orderListResponseDtoSchema, lista)).toEqual([[2, 'mecanico_actual_id']]);
  });

  it('el mapper reemplaza el detalle por un mensaje genérico y una orden inválida hace fallar toda la lista', () => {
    const sinZona = { ...orden, creado_en: '2026-01-05T10:15:30.123456' };

    expect(() => mapOrderResponse(sinZona)).toThrow(new InvalidOrderResponseError());
    expect(() => mapOrdersResponseList([sinZona, ...ordersGatewayResponse.slice(1)])).toThrow(
      InvalidOrderResponseError,
    );
  });
});