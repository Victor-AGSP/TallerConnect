import { ordersGatewayResponse } from '@/mocks/gateway/orders.gateway';
import { vehiclesGatewayResponse } from '@/mocks/gateway/vehicles.gateway';
import { mapOrderResponse, mapOrdersResponseList } from '@/mappers/order.mapper';
import { mapVehicleResponse } from '@/mappers/vehicle.mapper';
import type { VehicleResponseDto } from '@/dto/vehicle.dto';
import { orderResponseDtoSchema } from '@/schemas/order-dto.schema';
import { vehicleResponseDtoSchema } from '@/schemas/vehicle-dto.schema';

/** Campos de `OrdenRespuesta` declarados como `required` en `/ms2/openapi.json`. */
const CAMPOS_ORDEN_CONTRATO = [
  'actualizado_en',
  'creado_en',
  'creado_por_id',
  'devuelto_en',
  'devuelto_por_id',
  'estado_codigo',
  'ingreso_id',
  'mecanico_actual_id',
  'orden_id',
  'vehiculo_id',
];

const ordenDevuelta = ordersGatewayResponse[2];
const vehiculo = vehiclesGatewayResponse[0];

describe('Respuesta real de GET /api/ordenes', () => {
  it('cada orden trae exactamente los campos del contrato', () => {
    ordersGatewayResponse.forEach((orden) => {
      expect(Object.keys(orden).sort()).toEqual(CAMPOS_ORDEN_CONTRATO);
    });
  });

  it('el mapper acepta las órdenes reales y convierte sus estados', () => {
    expect(mapOrdersResponseList(ordersGatewayResponse).map((orden) => orden.status)).toEqual([
      'listo_para_entrega',
      'en_reparacion',
      'cancelado',
    ]);
  });
});

describe('Casos incompatibles de órdenes', () => {
  it('O1: el esquema y el mapper conservan devuelto_en y devuelto_por_id', () => {
    const parsed = orderResponseDtoSchema.safeParse(ordenDevuelta);

    expect(parsed.success).toBe(true);
    expect(parsed.data).toMatchObject({
      devuelto_en: ordenDevuelta.devuelto_en,
      devuelto_por_id: ordenDevuelta.devuelto_por_id,
    });
    expect(mapOrderResponse(ordenDevuelta)).toMatchObject({
      returnedAt: '2026-02-02T15:30:00.444444Z',
      returnedById: '503',
    });
  });

  it('O2: una orden sin devuelto_en ni devuelto_por_id se acepta aunque el contrato los exige', () => {
    const { devuelto_en, devuelto_por_id, ...sinDevolucion } = ordenDevuelta;

    expect(orderResponseDtoSchema.safeParse(sinDevolucion).success).toBe(true);
  });
});

describe('Casos incompatibles de vehículos', () => {
  it('V1: sin cliente_id ni anio, el mapper rechaza igual que el esquema', () => {
    const { cliente_id, anio, ...incompleto } = vehiculo;

    expect(vehicleResponseDtoSchema.safeParse(incompleto).success).toBe(false);
    expect(() => mapVehicleResponse(incompleto)).toThrow('Respuesta de vehículo inválida.');
  });

  it('V2: con cliente_id y sin anio, el mapper rechaza', () => {
    const { anio, ...sinAnio } = vehiculo;

    expect(() => mapVehicleResponse(sinAnio)).toThrow('Respuesta de vehículo inválida.');
  });

  it('V3: el formato antiguo sin campos del contrato se acepta; el esquema rechaza', () => {
    const antiguo = {
      id: vehiculo.vehiculo_id,
      plate: vehiculo.patente,
      brand: vehiculo.marca,
      model: vehiculo.modelo,
      year: vehiculo.anio,
      mileage: vehiculo.kilometraje,
    };

    expect(vehicleResponseDtoSchema.safeParse(antiguo).success).toBe(false);
    expect(mapVehicleResponse(antiguo)).toMatchObject({ id: '101', plate: 'XYZW10' });
  });

  it('V4: vehiculo_id como texto se rechaza igual que en el esquema', () => {
    const idTexto = { ...vehiculo, vehiculo_id: '101' } as unknown as VehicleResponseDto;

    expect(vehicleResponseDtoSchema.safeParse(idTexto).success).toBe(false);
    expect(() => mapVehicleResponse(idTexto)).toThrow('Respuesta de vehículo inválida.');
  });
});