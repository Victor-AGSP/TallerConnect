import { Vehicle } from '@/models/vehicle.model';
import { VehicleResponseDto } from '@/dto/vehicle.dto';

/**
 * Mapea la respuesta de un vehículo del backend al modelo Vehicle de la aplicación.
 * Tolera atributos en español (FastAPI/Neon: vehiculo_id, patente, marca, modelo, anio, kilometraje),
 * atributos del contrato (patent, brand, model, mileage, clientId) y nombres estándar.
 */
export function mapVehicleResponse(dto: VehicleResponseDto): Vehicle {
  const id = dto.vehiculo_id != null ? String(dto.vehiculo_id) : String(dto.id ?? '');
  const plate = dto.patent || dto.patente || dto.license_plate || dto.plate || 'SIN-PATENTE';
  const brand = dto.brand || dto.marca || '';
  const model = dto.model || dto.modelo || '';

  const rawYear = dto.year !== undefined ? dto.year : dto.anio;
  const year = rawYear != null ? Number(rawYear) : null;

  const rawMileage = dto.mileage !== undefined ? dto.mileage : dto.kilometraje;
  const mileage = rawMileage != null ? Number(rawMileage) : null;

  const ownerId = dto.clientId
    ? String(dto.clientId)
    : dto.client_id != null
    ? String(dto.client_id)
    : dto.owner_id != null
    ? String(dto.owner_id)
    : dto.ownerId
    ? String(dto.ownerId)
    : undefined;

  return {
    id,
    plate,
    brand,
    model,
    year,
    mileage,
    ownerId,
  };
}

/**
 * Mapea una lista de vehículos devuelta por la API Gateway.
 */
export function mapVehiclesResponseList(dtos: VehicleResponseDto[]): Vehicle[] {
  if (!Array.isArray(dtos)) return [];
  return dtos.map(mapVehicleResponse);
}
