import { mapVehicleResponse } from '@/mappers/vehicle.mapper';
import { vehiclesGatewayResponse } from '@/mocks/gateway/vehicles.gateway';
import { vehicleResponsePayloads } from '@/mocks/payloads/vehicle.payload';
import { formatPlate } from '@/utils/formatters';

/** Quita el separador visual de `formatPlate` para comparar solo los caracteres. */
const sinSeparadorVisual = (texto: string) => texto.replace(/·/g, '');

const base = vehicleResponsePayloads.completo;

describe('Patentes recibidas de la API', () => {
  it.each(['ABCD12', 'AB-CD-12', 'AB CD 12', 'abcd12'])(
    'el mapper conserva la patente "%s" tal como llega',
    (patente) => {
      expect(mapVehicleResponse({ ...base, patente }).plate).toBe(patente);
    }
  );

  it('las patentes reales anonimizadas no cambian al mapearse', () => {
    vehiclesGatewayResponse.forEach((vehiculo) => {
      expect(mapVehicleResponse(vehiculo).plate).toBe(vehiculo.patente);
    });
  });
});

describe('Presentación de patentes con formatPlate', () => {
  it('ABCD12 y AB-CD-12 se representan igual', () => {
    expect(formatPlate('ABCD12')).toBe('AB·CD·12');
    expect(formatPlate('AB-CD-12')).toBe('AB·CD·12');
    expect(formatPlate('AB CD 12')).toBe('AB·CD·12');
    expect(formatPlate('abcd12')).toBe('AB·CD·12');
  });

  it.each(['ABCD12', 'AB-CD-12', 'AB CD 12', 'XYZW10', '900001', 'AB1234'])(
    'la representación de "%s" conserva sus letras y dígitos en el mismo orden',
    (patente) => {
      const caracteres = patente.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

      expect(sinSeparadorVisual(formatPlate(patente))).toBe(caracteres);
    }
  );

  it('formatear no modifica la patente del modelo', () => {
    const vehiculo = mapVehicleResponse({ ...base, patente: 'AB-CD-12' });

    formatPlate(vehiculo.plate);

    expect(vehiculo.plate).toBe('AB-CD-12');
  });

  it('una patente vacía se representa como texto vacío', () => {
    expect(formatPlate('')).toBe('');
  });
});