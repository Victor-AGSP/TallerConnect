/**
 * Representa la respuesta de un vehículo devuelto por la API Gateway (VehiculoRespuesta en MS2).
 * Tolera formatos en español (producción Vercel: vehiculo_id, cliente_id, patente, marca, modelo, anio, kilometraje),
 * formato del contrato de integración (patent, brand, model, mileage) y nombres tradicionales.
 */
export interface VehicleResponseDto {
  id?: number | string;
  vehiculo_id?: number | string;
  cliente_id?: number | string;
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
 * Cuerpo enviado a POST /api/vehiculos para registrar un vehículo (VehiculoCrear en MS2).
 * Soporta tanto patente/marca/modelo (contrato MS2) como patent/brand/model/plate para compatibilidad total.
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

/**
 * Cuerpo enviado a PATCH /api/vehiculos/{vehiculo_id} para actualizar parcialmente un vehículo (VehiculoActualizar en MS2).
 */
export interface UpdateVehicleRequestDto {
  marca?: string | null;
  brand?: string | null;
  modelo?: string | null;
  model?: string | null;
  anio?: number | null;
  year?: number | null;
  kilometraje?: number | null;
  mileage?: number | null;
}

/**
 * Parámetros de consulta tipados para filtrar o paginar listados de vehículos.
 */
export interface VehicleQueryParamsDto {
  cliente_id?: number | string;
  ownerId?: string;
  patente?: string;
  plate?: string;
  marca?: string;
  brand?: string;
  modelo?: string;
  model?: string;
  skip?: number;
  limit?: number;
}
