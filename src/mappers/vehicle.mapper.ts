import { Vehicle } from '@/models/vehicle.model';
import { VehicleResponseDto } from '@/dto/vehicle.dto';

/**
 * Mapea un vehículo devuelto por la API Gateway al modelo Vehicle de la aplicación.
 */
export function mapVehicleResponse(dto: VehicleResponseDto): Vehicle {
  return {
    id: String(dto.vehiculo_id),
    plate: dto.patente,
    brand: dto.marca,
    model: dto.modelo,
    year: dto.anio,
    mileage: dto.kilometraje,
    ownerId: String(dto.cliente_id),
  };
}

/**
 * Mapea una lista de vehículos devuelta por la API Gateway.
 */
export function mapVehiclesResponseList(dtos: VehicleResponseDto[]): Vehicle[] {
  if (!Array.isArray(dtos)) return [];
  return dtos.map(mapVehicleResponse);
}