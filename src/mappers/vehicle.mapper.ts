import { Vehicle } from '@/models/vehicle.model';
import { VehicleResponseDto } from '@/dto/vehicle.dto';

/**
 * Mapea la respuesta de un vehículo del backend al modelo Vehicle de la aplicación.
 */
export function mapVehicleResponse(dto: VehicleResponseDto): Vehicle {
  const plate = dto.license_plate || dto.plate || 'SIN-PATENTE';

  return {
    id: String(dto.id),
    plate,
    brand: dto.brand ?? undefined,
    model: dto.model ?? undefined,
    year: dto.year ? Number(dto.year) : undefined,
    ownerId: dto.owner_id
      ? String(dto.owner_id)
      : dto.ownerId
      ? String(dto.ownerId)
      : undefined,
  };
}

/**
 * Mapea una lista de vehículos devuelta por la API Gateway.
 */
export function mapVehiclesResponseList(dtos: VehicleResponseDto[]): Vehicle[] {
  if (!Array.isArray(dtos)) return [];
  return dtos.map(mapVehicleResponse);
}
