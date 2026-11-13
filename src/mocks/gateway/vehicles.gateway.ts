import type { VehicleResponseDto } from '@/dto/vehicle.dto';

/**
 * Respuesta real de GET /api/vehiculos obtenida con la cuenta de prueba del rol cliente.
 * Anonimización: las patentes y los identificadores se reemplazaron por valores ficticios.
 * Las patentes conservan su formato (letras y dígitos, o solo dígitos) y los identificadores
 * mantienen las relaciones entre registros. Marcas, modelos, años y kilometrajes se
 * mantienen tal como los entregó la API.
 */
export const vehiclesGatewayResponse: VehicleResponseDto[] = [
  {
    vehiculo_id: 101,
    cliente_id: 501,
    patente: 'XYZW10',
    marca: 'Toyota',
    modelo: 'Corolla',
    anio: 2019,
    kilometraje: 65000,
  },
  {
    vehiculo_id: 102,
    cliente_id: 501,
    patente: 'XYZW20',
    marca: 'Hyundai',
    modelo: 'Accent',
    anio: 2017,
    kilometraje: 98000,
  },
  {
    vehiculo_id: 103,
    cliente_id: 501,
    patente: '900001',
    marca: 'nissan',
    modelo: 'pathfinder',
    anio: 2007,
    kilometraje: 8425,
  },
];