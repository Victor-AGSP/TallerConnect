import { Vehicle } from '@/models/vehicle.model';
import { VehicleResponseDto } from '@/dto/vehicle.dto';

/**
 * Mapea un vehículo devuelto por la API Gateway al modelo Vehicle de la aplicación.
 */
type LegacyVehicleResponseDto = {
  id?: number | string;
  vehiculo_id?: number | string;
  patent?: string;
  patente?: string;
  license_plate?: string;
  plate?: string;
  brand?: string;
  marca?: string;
  model?: string;
  modelo?: string;
  year?: number | null;
  anio?: number | null;
  mileage?: number | null;
  kilometraje?: number | null;
  clientId?: string;
  client_id?: number | string;
  owner_id?: number | string;
  ownerId?: string;
};

/**
 * Mantiene el contrato oficial MS2 y admite los formatos
 * anteriores de Victor como compatibilidad de lectura.
 */
export function mapVehicleResponse(
  dto: VehicleResponseDto | LegacyVehicleResponseDto
): Vehicle {
  if (!dto || typeof dto !== 'object') {
    throw new Error('Respuesta de vehículo inválida.');
  }

  const raw = dto as LegacyVehicleResponseDto &
    Partial<VehicleResponseDto>;

  const id = raw.vehiculo_id ?? raw.id;
  const plate =
    raw.patente ?? raw.patent ??
    raw.license_plate ?? raw.plate;

  const brand = raw.marca ?? raw.brand;
  const model = raw.modelo ?? raw.model;

  const year = raw.anio ?? raw.year ?? null;
  const mileage = raw.kilometraje ?? raw.mileage ?? null;

  const owner =
    raw.cliente_id ?? raw.clientId ??
    raw.client_id ?? raw.owner_id ?? raw.ownerId;

  const validId =
    (typeof id === 'number' && Number.isInteger(id)) ||
    (typeof id === 'string' && id.trim().length > 0);

  const validOwner =
    owner === undefined ||
    (typeof owner === 'number' && Number.isInteger(owner)) ||
    (typeof owner === 'string' && owner.trim().length > 0);

  if (
    !validId ||
    typeof plate !== 'string' ||
    plate.trim().length === 0 ||
    typeof brand !== 'string' ||
    typeof model !== 'string' ||
    !(year === null || Number.isInteger(year)) ||
    !(mileage === null || (
      typeof mileage === 'number' &&
      Number.isInteger(mileage)
    )) ||
    !validOwner
  ) {
    throw new Error('Respuesta de vehículo inválida.');
  }

  // Si incluye cliente_id, debe respetar el contrato MS2.
  if (
    'cliente_id' in raw &&
    (
      !Number.isInteger(raw.cliente_id) ||
      raw.anio === undefined ||
      raw.kilometraje === undefined
    )
  ) {
    throw new Error('Respuesta de vehículo inválida.');
  }

  return {
    id: String(id),
    plate,
    brand,
    model,
    year,
    mileage,
    ownerId: owner === undefined ? undefined : String(owner),
  };
}


/**
 * Mapea una lista de vehículos devuelta por la API Gateway.
 */
export function mapVehiclesResponseList(dtos: VehicleResponseDto[]): Vehicle[] {
  if (!Array.isArray(dtos)) return [];
  return dtos.map(mapVehicleResponse);
}