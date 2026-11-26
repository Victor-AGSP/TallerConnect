import type { OrderResponseDto } from '@/dto/order.dto';
import type { VehicleResponseDto } from '@/dto/vehicle.dto';
import { InvalidOrderResponseError, mapOrderResponse } from '@/mappers/order.mapper';
import { mapVehicleResponse } from '@/mappers/vehicle.mapper';
import { ordersGatewayResponse } from '@/mocks/gateway/orders.gateway';
import { vehiclesGatewayResponse } from '@/mocks/gateway/vehicles.gateway';
import { vehicleResponsePayloads } from '@/mocks/payloads/vehicle.payload';

const VEHICULO_INVALIDO = 'Respuesta de vehículo inválida.';

const vehiculo = vehiclesGatewayResponse[0];
const ordenActiva = ordersGatewayResponse[0];
const ordenDevuelta = ordersGatewayResponse[2];

/** Permite construir respuestas fuera de contrato sin que TypeScript las rechace. */
const comoVehiculo = (valor: object) => valor as unknown as VehicleResponseDto;
const comoOrden = (valor: object) => valor as unknown as OrderResponseDto;

describe('Identificadores', () => {
  it('convierte los identificadores numéricos del vehículo a texto', () => {
    expect(mapVehicleResponse(vehiculo)).toMatchObject({ id: '101', ownerId: '501' });
  });

  it('convierte los identificadores numéricos de la orden a texto', () => {
    expect(mapOrderResponse(ordenDevuelta)).toMatchObject({
      id: '203',
      vehicleId: '104',
      intakeId: '303',
      assignedMechanicId: '506',
      createdById: '503',
      returnedById: '503',
    });
  });

  it.each([
    ['vehiculo_id como texto', { ...vehiculo, vehiculo_id: '101' }],
    ['vehiculo_id decimal', { ...vehiculo, vehiculo_id: 101.5 }],
    ['cliente_id como texto', { ...vehiculo, cliente_id: '501' }],
    [
      'id como texto en el formato anterior',
      { id: '8', plate: 'EFGH34', brand: 'Nissan', model: 'Versa', year: null, mileage: null },
    ],
  ])('rechaza un vehículo con %s', (_caso, respuesta) => {
    expect(() => mapVehicleResponse(comoVehiculo(respuesta))).toThrow(VEHICULO_INVALIDO);
  });

  it.each([
    ['orden_id', '201'],
    ['vehiculo_id', '101'],
    ['mecanico_actual_id', '502'],
    ['devuelto_por_id', '503'],
  ])('rechaza una orden con %s como texto', (campo, valor) => {
    expect(() => mapOrderResponse(comoOrden({ ...ordenDevuelta, [campo]: valor }))).toThrow(
      InvalidOrderResponseError
    );
  });
});

describe('Fechas', () => {
  it('conserva las fechas ISO de la orden sin modificarlas', () => {
    expect(mapOrderResponse(ordenDevuelta)).toMatchObject({
      createdAt: '2026-02-02T14:00:00.333333Z',
      updatedAt: '2026-02-02T15:30:00.444444Z',
      returnedAt: '2026-02-02T15:30:00.444444Z',
    });
  });

  it.each([
    ['no interpretable', 'no-es-fecha'],
    ['con un día inexistente', '2026-02-30T15:30:00Z'],
    ['sin zona horaria', '2026-02-02T15:30:00'],
  ])('rechaza una fecha de devolución %s', (_caso, valor) => {
    expect(() => mapOrderResponse({ ...ordenDevuelta, devuelto_en: valor })).toThrow(
      InvalidOrderResponseError
    );
  });
});

describe('Campos null', () => {
  it('conserva null en el mecánico y en la devolución de una orden', () => {
    expect(
      mapOrderResponse({ ...ordenActiva, mecanico_actual_id: null })
    ).toMatchObject({ assignedMechanicId: null, returnedAt: null, returnedById: null });
  });

  it('conserva null en el año y el kilometraje del vehículo', () => {
    expect(mapVehicleResponse(vehicleResponsePayloads.sinAnio)).toMatchObject({ year: null });
    expect(mapVehicleResponse(vehicleResponsePayloads.sinKilometraje)).toMatchObject({
      mileage: null,
    });
  });

  it.each(['anio', 'kilometraje'])(
    'rechaza un vehículo sin %s, con o sin cliente_id',
    (campo) => {
      const { [campo as 'anio']: _omitido, ...sinCampo } = vehiculo;
      const { cliente_id: _cliente, ...sinCampoNiCliente } = sinCampo;

      expect(() => mapVehicleResponse(comoVehiculo(sinCampo))).toThrow(VEHICULO_INVALIDO);
      expect(() => mapVehicleResponse(comoVehiculo(sinCampoNiCliente))).toThrow(VEHICULO_INVALIDO);
    }
  );
});

describe('Compatibilidad que se mantiene fuera de contrato', () => {
  // El contrato exige cliente_id y los campos de devolución; se aceptan ausentes para no
  // romper datos de prueba existentes que no los incluyen.
  it('acepta un vehículo sin cliente_id y deja ownerId sin valor', () => {
    const { cliente_id: _cliente, ...sinCliente } = vehiculo;

    expect(mapVehicleResponse(comoVehiculo(sinCliente))).toMatchObject({
      id: '101',
      ownerId: undefined,
    });
  });

  it('acepta una orden con solo uno de los campos de devolución y omite el otro', () => {
    const { devuelto_por_id: _responsable, ...soloFecha } = ordenDevuelta;
    const { devuelto_en: _fecha, ...soloResponsable } = ordenDevuelta;

    const conFecha = mapOrderResponse(soloFecha);
    const conResponsable = mapOrderResponse(soloResponsable);

    expect(conFecha.returnedAt).toBe('2026-02-02T15:30:00.444444Z');
    expect(conFecha).not.toHaveProperty('returnedById');
    expect(conResponsable.returnedById).toBe('503');
    expect(conResponsable).not.toHaveProperty('returnedAt');
  });
});