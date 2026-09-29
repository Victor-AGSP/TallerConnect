/**
 * Representa la respuesta de un vehículo devuelto por la API Gateway.
 * Tolera tanto license_plate como plate según la versión del backend.
 */
export interface VehicleResponseDto {
  id: number | string;
  license_plate?: string;
  plate?: string;
  brand?: string;
  model?: string;
  year?: number;
  owner_id?: number | string;
  ownerId?: string;
}

/**
 * Cuerpo enviado a POST /api/vehicles para registrar un vehículo.
 */
export interface CreateVehicleRequestDto {
  plate: string;
  brand?: string;
  model?: string;
  year?: number;
  owner_id?: number | string;
}
