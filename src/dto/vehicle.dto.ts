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
 * Datos de entrada de `createVehicle()`. Admite patente/marca/modelo (contrato MS2) y los alias
 * internos patent/plate/brand/model/year/mileage. No es el cuerpo HTTP: el servicio lo convierte
 * en `VehicleCreatePayloadDto` antes de enviarlo.
 * `owner_id` solo lo usa el adaptador simulado; MS2 resuelve el propietario desde el JWT.
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
 * Cuerpo exacto enviado a POST /api/vehiculos (`VehiculoCrear` en MS2, `additionalProperties: false`).
 */
export interface VehicleCreatePayloadDto {
  patente: string;
  marca: string;
  modelo: string;
  anio?: number | null;
  kilometraje?: number | null;
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
