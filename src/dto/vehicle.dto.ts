/**
 * Representa la respuesta de un vehículo devuelto por la API Gateway.
 * Tolera formatos en español (producción Vercel: vehiculo_id, patente, marca, anio),
 * formato del contrato de integración (patent, brand, model, mileage) y nombres tradicionales.
 */
export interface VehicleResponseDto {
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
}

/**
 * Cuerpo enviado a POST /api/vehiculos para registrar un vehículo.
 * Soporta tanto patent/brand/model como plate/patente para compatibilidad total.
 */
export interface CreateVehicleRequestDto {
  patent?: string;
  patente?: string;
  plate?: string;
  brand?: string;
  marca?: string;
  model?: string;
  modelo?: string;
  year?: number | null;
  anio?: number | null;
  mileage?: number | null;
  kilometraje?: number | null;
  owner_id?: number | string;
}
