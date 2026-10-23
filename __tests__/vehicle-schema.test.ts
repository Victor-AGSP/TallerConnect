import { vehicleResponsePayloads } from '@/mocks/payloads/vehicle.payload';
import {
  vehicleListResponseDtoSchema,
  vehicleResponseDtoSchema,
} from '@/schemas/vehicle-dto.schema';

/** Campos obligatorios de `VehiculoRespuesta` en el contrato de MS2 (`/ms2/openapi.json`). */
const CAMPOS_OBLIGATORIOS = [
  'vehiculo_id',
  'cliente_id',
  'patente',
  'marca',
  'modelo',
  'anio',
  'kilometraje',
] as const;

const vehiculo = vehicleResponsePayloads.completo;

describe('Esquema de vehículo recibido de la API (VehiculoRespuesta)', () => {
  describe('datos válidos', () => {
    it.each(Object.entries(vehicleResponsePayloads))(
      'acepta el vehículo de ejemplo "%s"',
      (_caso, payload) => {
        expect(vehicleResponseDtoSchema.safeParse(payload).success).toBe(true);
      },
    );

    it('acepta anio y kilometraje en null', () => {
      const payload = { ...vehiculo, anio: null, kilometraje: null };

      expect(vehicleResponseDtoSchema.safeParse(payload).success).toBe(true);
    });
  });

  describe('campos obligatorios', () => {
    it.each(CAMPOS_OBLIGATORIOS)('rechaza un vehículo sin %s', (campo) => {
      const payload: Record<string, unknown> = { ...vehiculo };
      delete payload[campo];

      expect(vehicleResponseDtoSchema.safeParse(payload).success).toBe(false);
    });
  });

  describe('tipos', () => {
    it.each([
      ['vehiculo_id como texto', { vehiculo_id: '1' }],
      ['vehiculo_id decimal', { vehiculo_id: 1.5 }],
      ['cliente_id como texto', { cliente_id: '1' }],
      ['anio decimal', { anio: 2019.5 }],
      ['kilometraje como texto', { kilometraje: '85120' }],
      ['patente como número', { patente: 1234 }],
    ])('rechaza %s', (_caso, cambio) => {
      expect(vehicleResponseDtoSchema.safeParse({ ...vehiculo, ...cambio }).success).toBe(false);
    });

    it.each(['vehiculo_id', 'cliente_id', 'patente', 'marca', 'modelo'])(
      'rechaza null en %s, que el contrato no admite como nulo',
      (campo) => {
        expect(vehicleResponseDtoSchema.safeParse({ ...vehiculo, [campo]: null }).success).toBe(false);
      },
    );
  });

  describe('listas', () => {
    it('acepta la lista con todos los vehículos de ejemplo', () => {
      const lista = Object.values(vehicleResponsePayloads);

      expect(vehicleListResponseDtoSchema.safeParse(lista).success).toBe(true);
    });

    it('acepta una lista vacía', () => {
      expect(vehicleListResponseDtoSchema.safeParse([]).success).toBe(true);
    });

    it('rechaza una lista con un vehículo inválido', () => {
      const lista = [vehiculo, { ...vehiculo, vehiculo_id: '2' }];

      expect(vehicleListResponseDtoSchema.safeParse(lista).success).toBe(false);
    });
  });
});