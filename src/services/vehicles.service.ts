import { apiClient } from '@/services/api/client';
import { HTTP_STATUS } from '@/services/api/types';
import {
  ServiceError,
  normalizeVehicleServiceError,
} from '@/services/service-error';
import { Vehicle } from '@/models/vehicle.model';
import {
  CreateVehicleRequestDto,
  UpdateVehicleRequestDto,
  VehicleQueryParamsDto,
  VehicleCreatePayloadDto,
  VehicleResponseDto,
} from '@/dto/vehicle.dto';
import {
  mapVehicleResponse,
  mapVehiclesResponseList,
} from '@/mappers/vehicle.mapper';
import { mockVehicles } from '@/mocks/vehicles.mock';
import { mockUserByRole } from '@/mocks/users.mock';

export { ServiceError, normalizeVehicleServiceError };

const USE_MOCKS = process.env.EXPO_PUBLIC_USE_MOCK_AUTH === 'true';

/** `maxLength` de `marca` y `modelo` en `VehiculoCrear` (MS2). */
const VEHICLE_TEXT_MAX_LENGTH = 60;

/**
 * Filtra y pagina localmente una lista de vehículos según VehicleQueryParamsDto.
 */
export function filterVehiclesByParams(
  vehicles: Vehicle[],
  params?: VehicleQueryParamsDto
): Vehicle[] {
  if (!params) {
    return [...vehicles];
  }

  let filtered = [...vehicles];

  const ownerFilter =
    params.cliente_id != null
      ? String(params.cliente_id)
      : params.ownerId
      ? String(params.ownerId)
      : undefined;

  if (ownerFilter) {
    filtered = filtered.filter((v) => v.ownerId === ownerFilter);
  }

  const plateFilter = (params.patente ?? params.plate)?.trim().toUpperCase();
  if (plateFilter) {
    filtered = filtered.filter((v) => v.plate.toUpperCase().includes(plateFilter));
  }

  const brandFilter = (params.marca ?? params.brand)?.trim().toLowerCase();
  if (brandFilter) {
    filtered = filtered.filter((v) => v.brand.toLowerCase().includes(brandFilter));
  }

  const modelFilter = (params.modelo ?? params.model)?.trim().toLowerCase();
  if (modelFilter) {
    filtered = filtered.filter((v) => v.model.toLowerCase().includes(modelFilter));
  }

  const start = params.skip && params.skip > 0 ? params.skip : 0;
  const end =
    params.limit && params.limit > 0 ? start + params.limit : undefined;

  return filtered.slice(start, end);
}

/**
 * Construye el cuerpo exacto de `VehiculoCrear` (MS2, `additionalProperties: false`).
 * Acepta los alias internos (`plate`/`patent`, `brand`, `model`, `year`, `mileage`),
 * pero solo envía `patente`, `marca`, `modelo` y, si se informan, `anio` y `kilometraje`.
 * El propietario lo resuelve MS2 desde el JWT, por lo que `owner_id` nunca se envía.
 */
export function buildCreateVehiclePayload(
  data: CreateVehicleRequestDto
): VehicleCreatePayloadDto {
  const pickText = (...values: unknown[]): string => {
    const value = values.find((v) => v !== undefined && v !== null);
    return typeof value === 'string' ? value.trim() : '';
  };
  const pickOptionalInt = (
    field: 'anio' | 'kilometraje',
    primary: unknown,
    alias: unknown
  ): number | null | undefined => {
    const value = primary !== undefined ? primary : alias;
    if (value === undefined || value === null) return value as null | undefined;
    if (typeof value !== 'number' || !Number.isInteger(value)) {
      throw vehicleValidationError(`El campo ${field} debe ser un número entero.`);
    }
    return value;
  };

  const patente = pickText(data.patente, data.patent, data.plate).toUpperCase();
  const marca = pickText(data.marca, data.brand);
  const modelo = pickText(data.modelo, data.model);

  if (!patente || !marca || !modelo) {
    throw vehicleValidationError(
      'Patente, marca y modelo son obligatorios para registrar un vehículo.'
    );
  }
  if (marca.length > VEHICLE_TEXT_MAX_LENGTH || modelo.length > VEHICLE_TEXT_MAX_LENGTH) {
    throw vehicleValidationError(
      `Marca y modelo admiten como máximo ${VEHICLE_TEXT_MAX_LENGTH} caracteres.`
    );
  }

  const anio = pickOptionalInt('anio', data.anio, data.year);
  const kilometraje = pickOptionalInt('kilometraje', data.kilometraje, data.mileage);

  return {
    patente,
    marca,
    modelo,
    ...(anio !== undefined ? { anio } : {}),
    ...(kilometraje !== undefined ? { kilometraje } : {}),
  };
}

function vehicleValidationError(message: string): ServiceError {
  return new ServiceError({
    message,
    status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
    code: 'VEHICLE_VALIDATION_ERROR',
    domain: 'vehicles',
  });
}

/**
 * Contrato común para los adaptadores (Mock y Real HTTP) de Vehículos.
 */
export interface VehicleServiceAdapter {
  getVehicles(params?: VehicleQueryParamsDto): Promise<Vehicle[]>;
  getMyVehicles(params?: VehicleQueryParamsDto): Promise<Vehicle[]>;
  getAssignedVehicles(params?: VehicleQueryParamsDto): Promise<Vehicle[]>;
  getVehicleById(id: string | number): Promise<Vehicle>;
  createVehicle(data: CreateVehicleRequestDto): Promise<Vehicle>;
  updateVehicle(id: string | number, data: UpdateVehicleRequestDto): Promise<Vehicle>;
  resetMocks?(): void;
}

/**
 * Adaptador simulado (Mock) en memoria para pruebas y desarrollo offline.
 */
export class MockVehicleAdapter implements VehicleServiceAdapter {
  private vehicles: Vehicle[];
  private readonly delayMs: number;

  constructor(initialVehicles: Vehicle[] = mockVehicles, delayMs = 0) {
    this.vehicles = [...initialVehicles];
    this.delayMs = delayMs;
  }

  private async simulateDelay(): Promise<void> {
    if (this.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    }
  }

  resetMocks(initialVehicles: Vehicle[] = mockVehicles): void {
    this.vehicles = [...initialVehicles];
  }

  async getVehicles(params?: VehicleQueryParamsDto): Promise<Vehicle[]> {
    await this.simulateDelay();
    return filterVehiclesByParams(this.vehicles, params);
  }

  async getMyVehicles(params?: VehicleQueryParamsDto): Promise<Vehicle[]> {
    await this.simulateDelay();
    return filterVehiclesByParams(this.vehicles, params);
  }

  async getAssignedVehicles(params?: VehicleQueryParamsDto): Promise<Vehicle[]> {
    await this.simulateDelay();
    return filterVehiclesByParams(this.vehicles, params);
  }

  async getVehicleById(id: string | number): Promise<Vehicle> {
    await this.simulateDelay();
    const vehicleId = String(id);
    const found = this.vehicles.find((v) => v.id === vehicleId);
    if (!found) {
      throw new ServiceError({
        message: 'El vehículo solicitado no existe.',
        status: HTTP_STATUS.NOT_FOUND,
        code: 'VEHICLE_NOT_FOUND',
        domain: 'vehicles',
      });
    }
    return { ...found };
  }

  async createVehicle(data: CreateVehicleRequestDto): Promise<Vehicle> {
    await this.simulateDelay();
    const rawPlate = (data.patent || data.patente || data.plate || '').toUpperCase().trim();
    const rawBrand = (data.brand || data.marca || '').trim();
    const rawModel = (data.model || data.modelo || '').trim();
    const rawYear = (data.year !== undefined ? data.year : data.anio) ?? null;
    const rawMileage = (data.mileage !== undefined ? data.mileage : data.kilometraje) ?? null;

    if (!rawPlate || !rawBrand || !rawModel) {
      throw new ServiceError({
        message: 'Patente, marca y modelo son obligatorios para registrar un vehículo.',
        status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
        code: 'VEHICLE_VALIDATION_ERROR',
        domain: 'vehicles',
      });
    }

    const exists = this.vehicles.some(
      (v) => v.plate.toUpperCase() === rawPlate
    );
    if (exists) {
      throw new ServiceError({
        message: 'La patente exacta ya está registrada.',
        status: HTTP_STATUS.CONFLICT,
        code: 'VEHICLE_CONFLICT',
        domain: 'vehicles',
      });
    }

    const newMockVehicle: Vehicle = {
      id: `veh-00${this.vehicles.length + 1}`,
      plate: rawPlate,
      brand: rawBrand,
      model: rawModel,
      year: rawYear,
      mileage: rawMileage,
      ownerId:
        data.owner_id != null
          ? String(data.owner_id)
          : mockUserByRole.cliente.id,
    };

    this.vehicles.unshift(newMockVehicle);
    return { ...newMockVehicle };
  }

  async updateVehicle(
    id: string | number,
    data: UpdateVehicleRequestDto
  ): Promise<Vehicle> {
    await this.simulateDelay();
    const vehicleId = String(id);
    const index = this.vehicles.findIndex((v) => v.id === vehicleId);
    if (index === -1) {
      throw new ServiceError({
        message: 'El vehículo solicitado no existe.',
        status: HTTP_STATUS.NOT_FOUND,
        code: 'VEHICLE_NOT_FOUND',
        domain: 'vehicles',
      });
    }

    const marca = data.marca !== undefined ? data.marca : data.brand;
    const modelo = data.modelo !== undefined ? data.modelo : data.model;
    const anio = data.anio !== undefined ? data.anio : data.year;
    const kilometraje =
      data.kilometraje !== undefined ? data.kilometraje : data.mileage;

    const current = this.vehicles[index];
    const updated: Vehicle = {
      ...current,
      brand: marca != null ? marca : current.brand,
      model: modelo != null ? modelo : current.model,
      year: anio !== undefined ? anio : current.year,
      mileage: kilometraje !== undefined ? kilometraje : current.mileage,
    };

    this.vehicles[index] = updated;
    return { ...updated };
  }
}

/**
 * Adaptador HTTP real conectado a la API Gateway (`/vehiculos`).
 */
export class RealVehicleAdapter implements VehicleServiceAdapter {
  async getVehicles(params?: VehicleQueryParamsDto): Promise<Vehicle[]> {
    const response = await apiClient.get<VehicleResponseDto[]>('/vehiculos');
    const mapped = mapVehiclesResponseList(response.data);
    return params ? filterVehiclesByParams(mapped, params) : mapped;
  }

  async getMyVehicles(params?: VehicleQueryParamsDto): Promise<Vehicle[]> {
    const response = await apiClient.get<VehicleResponseDto[]>('/vehiculos');
    const mapped = mapVehiclesResponseList(response.data);
    return params ? filterVehiclesByParams(mapped, params) : mapped;
  }

  async getAssignedVehicles(params?: VehicleQueryParamsDto): Promise<Vehicle[]> {
    const response = await apiClient.get<VehicleResponseDto[]>('/vehiculos/asignados');
    const mapped = mapVehiclesResponseList(response.data);
    return params ? filterVehiclesByParams(mapped, params) : mapped;
  }

  async getVehicleById(id: string | number): Promise<Vehicle> {
    const vehicleId = String(id);
    const response = await apiClient.get<VehicleResponseDto>(`/vehiculos/${vehicleId}`);
    return mapVehicleResponse(response.data);
  }

  async createVehicle(data: CreateVehicleRequestDto): Promise<Vehicle> {
    const payload = buildCreateVehiclePayload(data);

    const response = await apiClient.post<VehicleResponseDto>('/vehiculos', payload);
    return mapVehicleResponse(response.data);
  }

  async updateVehicle(
    id: string | number,
    data: UpdateVehicleRequestDto
  ): Promise<Vehicle> {
    const vehicleId = String(id);
    const marca = data.marca !== undefined ? data.marca : data.brand;
    const modelo = data.modelo !== undefined ? data.modelo : data.model;
    const anio = data.anio !== undefined ? data.anio : data.year;
    const kilometraje =
      data.kilometraje !== undefined ? data.kilometraje : data.mileage;

    const payload: UpdateVehicleRequestDto = {
      ...(marca !== undefined ? { marca } : {}),
      ...(modelo !== undefined ? { modelo } : {}),
      ...(anio !== undefined ? { anio } : {}),
      ...(kilometraje !== undefined ? { kilometraje } : {}),
    };

    const response = await apiClient.patch<VehicleResponseDto>(
      `/vehiculos/${vehicleId}`,
      payload
    );
    return mapVehicleResponse(response.data);
  }
}

/**
 * Servicio de Vehículos con soporte intercambiable para adaptador Mock y Real HTTP.
 */
export class VehiclesService {
  private adapter: VehicleServiceAdapter;
  private readonly mockAdapter: MockVehicleAdapter;
  private readonly realAdapter: RealVehicleAdapter;

  constructor(customAdapter?: VehicleServiceAdapter) {
    this.mockAdapter = new MockVehicleAdapter(mockVehicles, 0);
    this.realAdapter = new RealVehicleAdapter();
    this.adapter =
      customAdapter ?? (USE_MOCKS ? this.mockAdapter : this.realAdapter);
  }

  /**
   * Permite inyectar un adaptador personalizado (útil en pruebas unitarias y de integración).
   */
  setAdapter(adapter: VehicleServiceAdapter): void {
    this.adapter = adapter;
  }

  /**
   * Activa el adaptador simulado en memoria.
   */
  useMockAdapter(): MockVehicleAdapter {
    this.adapter = this.mockAdapter;
    return this.mockAdapter;
  }

  /**
   * Activa el adaptador HTTP real conectado a `apiClient`.
   */
  useRealAdapter(): RealVehicleAdapter {
    this.adapter = this.realAdapter;
    return this.realAdapter;
  }

  /**
   * Restaura el estado inicial de los vehículos simulados.
   */
  resetMocks(): void {
    this.mockAdapter.resetMocks(mockVehicles);
  }

  /**
   * Obtiene todos los vehículos registrados (rol cliente o administrador en MS2).
   * Ruta Gateway: GET /api/vehiculos
   */
  async getVehicles(params?: VehicleQueryParamsDto): Promise<Vehicle[]> {
    try {
      return await this.adapter.getVehicles(params);
    } catch (error: unknown) {
      throw normalizeVehicleServiceError(
        error,
        'No fue posible cargar los vehículos.'
      );
    }
  }

  /**
   * Obtiene los vehículos asociados al cliente autenticado (portal cliente).
   * Ruta Gateway: GET /api/vehiculos
   */
  async getMyVehicles(params?: VehicleQueryParamsDto): Promise<Vehicle[]> {
    try {
      return await this.adapter.getMyVehicles(params);
    } catch (error: unknown) {
      throw normalizeVehicleServiceError(
        error,
        'No fue posible cargar tus vehículos.'
      );
    }
  }

  /**
   * Obtiene los vehículos asignados al mecánico autenticado (portal mecánico).
   * Ruta Gateway: GET /api/vehiculos/asignados
   */
  async getAssignedVehicles(params?: VehicleQueryParamsDto): Promise<Vehicle[]> {
    try {
      return await this.adapter.getAssignedVehicles(params);
    } catch (error: unknown) {
      throw normalizeVehicleServiceError(
        error,
        'No fue posible cargar los vehículos asignados.'
      );
    }
  }

  /**
   * Obtiene un vehículo por su ID.
   * Ruta Gateway: GET /api/vehiculos/{vehiculo_id}
   */
  async getVehicleById(id: string | number): Promise<Vehicle> {
    try {
      return await this.adapter.getVehicleById(id);
    } catch (error: unknown) {
      throw normalizeVehicleServiceError(
        error,
        'No fue posible cargar el vehículo.'
      );
    }
  }

  /**
   * Registra un nuevo vehículo en el sistema.
   * Ruta Gateway: POST /api/vehiculos
   */
  async createVehicle(data: CreateVehicleRequestDto): Promise<Vehicle> {
    try {
      return await this.adapter.createVehicle(data);
    } catch (error: unknown) {
      throw normalizeVehicleServiceError(
        error,
        'No fue posible registrar el vehículo.'
      );
    }
  }

  /**
   * Actualiza parcialmente un vehículo existente (VehiculoActualizar en MS2).
   * Ruta Gateway: PATCH /api/vehiculos/{vehiculo_id}
   */
  async updateVehicle(
    id: string | number,
    data: UpdateVehicleRequestDto
  ): Promise<Vehicle> {
    try {
      return await this.adapter.updateVehicle(id, data);
    } catch (error: unknown) {
      throw normalizeVehicleServiceError(
        error,
        'No fue posible actualizar el vehículo.'
      );
    }
  }
}

export const vehiclesService = new VehiclesService();
export { VehiclesService as VehicleService };
