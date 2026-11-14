import { z } from 'zod';

import { authMeGatewayResponses } from '@/mocks/gateway/auth-me.gateway';
import { ordersGatewayResponse } from '@/mocks/gateway/orders.gateway';
import { vehiclesGatewayResponse } from '@/mocks/gateway/vehicles.gateway';
import { loginResponseDtoSchema } from '@/schemas/auth-dto.schema';
import { orderResponseDtoSchema } from '@/schemas/order-dto.schema';
import { vehicleResponseDtoSchema } from '@/schemas/vehicle-dto.schema';

/** Respuesta de login con el usuario real anonimizado; el token es ficticio. */
const login = {
  access_token: 'token-ficticio',
  token_type: 'bearer',
  user: authMeGatewayResponses.cliente,
};

/**
 * Valida `respuesta` y resume el resultado para `campo`: `acepta`, o
 * `rechaza (esperaba <tipo>, recibió <tipo>)`. El tipo esperado sale del error de Zod en ese
 * campo (por ejemplo `int` cuando el número no es entero) y el recibido, del valor enviado:
 * `undefined` si el campo falta, `null` o el tipo del valor. Cada caso modifica un solo campo
 * de una respuesta válida, por lo que un error en otro campo se informa como `otro campo`.
 */
function resultado(schema: z.ZodType, respuesta: object, campo: string) {
  const validacion = schema.safeParse(respuesta);
  if (validacion.success) return 'acepta';

  const issue = validacion.error.issues.find((item) => item.path.at(-1) === campo);
  if (!issue || !('expected' in issue)) return 'rechaza (otro campo)';

  const valor = (respuesta as Record<string, unknown>)[campo];
  const recibido = valor === null ? 'null' : typeof valor;
  return `rechaza (esperaba ${issue.expected}, recibió ${recibido})`;
}

function sinCampo(respuesta: object, campo: string) {
  const { [campo]: _omitido, ...resto } = respuesta as Record<string, unknown>;
  return resto;
}

/**
 * Cada caso parte de una respuesta real anonimizada y la valida con el campo presente,
 * ausente, en `null` y con un valor inválido. `esperado` sigue ese mismo orden.
 */
const casos = [
  {
    respuesta: 'VehiculoRespuesta',
    campo: 'patente',
    contrato: 'obligatorio, no admite null',
    schema: vehicleResponseDtoSchema,
    base: vehiclesGatewayResponse[0],
    invalido: 123,
    esperado: [
      'acepta',
      'rechaza (esperaba string, recibió undefined)',
      'rechaza (esperaba string, recibió null)',
      'rechaza (esperaba string, recibió number)',
    ],
  },
  {
    respuesta: 'VehiculoRespuesta',
    campo: 'anio',
    contrato: 'obligatorio, admite null',
    schema: vehicleResponseDtoSchema,
    base: vehiclesGatewayResponse[0],
    invalido: '2019',
    esperado: [
      'acepta',
      'rechaza (esperaba number, recibió undefined)',
      'acepta',
      'rechaza (esperaba number, recibió string)',
    ],
  },
  {
    respuesta: 'VehiculoRespuesta',
    campo: 'kilometraje',
    contrato: 'obligatorio, admite null',
    schema: vehicleResponseDtoSchema,
    base: vehiclesGatewayResponse[0],
    invalido: 65000.5,
    esperado: [
      'acepta',
      'rechaza (esperaba number, recibió undefined)',
      'acepta',
      'rechaza (esperaba int, recibió number)',
    ],
  },
  {
    respuesta: 'OrdenRespuesta',
    campo: 'mecanico_actual_id',
    contrato: 'obligatorio, admite null',
    schema: orderResponseDtoSchema,
    base: ordersGatewayResponse[0],
    invalido: '502',
    esperado: [
      'acepta',
      'rechaza (esperaba number, recibió undefined)',
      'acepta',
      'rechaza (esperaba number, recibió string)',
    ],
  },
  {
    respuesta: 'TokenRespuesta',
    campo: 'token_type',
    contrato: 'obligatorio, no admite null; el esquema lo trata como opcional',
    schema: loginResponseDtoSchema,
    base: login,
    invalido: 123,
    esperado: [
      'acepta',
      'acepta',
      'rechaza (esperaba string, recibió null)',
      'rechaza (esperaba string, recibió number)',
    ],
  },
];

describe('Campos ausentes, nulos e inválidos en respuestas HTTP', () => {
  it.each(casos)(
    '$campo en $respuesta ($contrato): presente, ausente, null e inválido',
    ({ schema, base, campo, invalido, esperado }) => {
      expect([
        resultado(schema, base, campo),
        resultado(schema, sinCampo(base, campo), campo),
        resultado(schema, { ...base, [campo]: null }, campo),
        resultado(schema, { ...base, [campo]: invalido }, campo),
      ]).toEqual(esperado);
    },
  );
});