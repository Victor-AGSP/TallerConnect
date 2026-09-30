import { Vehicle } from '@/models';

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
];