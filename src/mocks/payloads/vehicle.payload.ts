import { VehicleResponseDto } from '@/dto/vehicle.dto';

type VehicleCase = 'completo' | 'sinKilometraje' | 'sinAnio';

/**
 * Vehículos con la forma exacta de `VehiculoRespuesta` (GET /api/vehiculos).
 * Pertenecen al cliente de prueba de la API (`cliente_id: 1`).
 */
export const vehicleResponsePayloads: Record<VehicleCase, VehicleResponseDto> = {
  completo: {
    vehiculo_id: 1,
    cliente_id: 1,
    patente: 'ABCD12',
    marca: 'Toyota',
    modelo: 'Corolla',
    anio: 2019,
    kilometraje: 85120,
  },
  sinKilometraje: {
    vehiculo_id: 2,
    cliente_id: 1,
    patente: 'EFGH34',
    marca: 'Chevrolet',
    modelo: 'Sail',
    anio: 2021,
    kilometraje: null,
  },
  sinAnio: {
    vehiculo_id: 3,
    cliente_id: 1,
    patente: 'JKLM56',
    marca: 'Suzuki',
    modelo: 'Swift',
    anio: null,
    kilometraje: 42300,
  },
};