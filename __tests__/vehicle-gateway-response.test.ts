import { vehiclesGatewayResponse } from '@/mocks/gateway/vehicles.gateway';
import { vehicleListResponseDtoSchema } from '@/schemas/vehicle-dto.schema';

/** Campos de `VehiculoRespuesta` declarados como `required` en `/ms2/openapi.json`. */
const CAMPOS_CONTRATO = [
  'anio',
  'cliente_id',
  'kilometraje',
  'marca',
  'modelo',
  'patente',
  'vehiculo_id',
];

describe('Respuesta real de GET /api/vehiculos', () => {
  it('cada vehículo trae exactamente los campos del contrato, sin faltantes ni adicionales', () => {
    vehiclesGatewayResponse.forEach((vehiculo) => {
      expect(Object.keys(vehiculo).sort()).toEqual(CAMPOS_CONTRATO);
    });
  });

  it('cumple el esquema VehiculoRespuesta de la app', () => {
    expect(vehicleListResponseDtoSchema.safeParse(vehiclesGatewayResponse).success).toBe(true);
  });
});