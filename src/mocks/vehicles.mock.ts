import { Vehicle } from '@/models';

/**
 * Vehículos del cliente simulado (`usr-001`).
 * Incluyen un vehículo con todos sus datos, uno sin kilometraje y uno sin año,
 * porque la API puede entregar `anio` y `kilometraje` como `null`.
 */
export const mockVehicles: Vehicle[] = [
  {
    id: 'veh-001',
    plate: 'ABCD12',
    brand: 'Toyota',
    model: 'Corolla',
    year: 2019,
    mileage: 85120,
    ownerId: 'usr-001',
  },
  {
    id: 'veh-002',
    plate: 'EFGH34',
    brand: 'Chevrolet',
    model: 'Sail',
    year: 2021,
    mileage: null,
    ownerId: 'usr-001',
  },
  {
    id: 'veh-003',
    plate: 'JKLM56',
    brand: 'Suzuki',
    model: 'Swift',
    year: null,
    mileage: 42300,
    ownerId: 'usr-001',
  },
];