/**
 * Vehículo devuelto por la API Gateway (`VehiculoRespuesta` del contrato MS2).
 */
export interface VehicleResponseDto {
  vehiculo_id: number;
  cliente_id: number;
  patente: string;
  marca: string;
  modelo: string;
  anio: number | null;
  kilometraje: number | null;
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
