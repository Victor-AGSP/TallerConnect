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