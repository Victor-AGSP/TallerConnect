import { apiClient } from '@/services/api/client';
import { normalizeApiError } from '@/services/api/interceptors';
import { Vehicle } from '@/models/vehicle.model';
import {
  CreateVehicleRequestDto,
  VehicleResponseDto,
} from '@/dto/vehicle.dto';
import {
  mapVehicleResponse,
  mapVehiclesResponseList,
} from '@/mappers/vehicle.mapper';
import { mockVehicles } from '@/mocks/vehicles.mock';

const USE_MOCKS = process.env.EXPO_PUBLIC_USE_MOCK_AUTH === 'true';

let localMockVehicles = [...mockVehicles];

export class VehiclesService {
  /**
   * Obtiene todos los vehículos registrados (catálogo general / rol administrador).
   * Ruta Gateway: GET /api/vehiculos
   */
  async getVehicles(): Promise<Vehicle[]> {
    if (USE_MOCKS) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return [...localMockVehicles];
    }

    try {
      const response = await apiClient.get<VehicleResponseDto[]>('/vehiculos');
      return mapVehiclesResponseList(response.data);
    } catch (error: unknown) {
      const normalized = normalizeApiError(error);
      throw new Error(normalized.message || 'No fue posible cargar los vehículos.');
    }
  }

  /**
   * Obtiene los vehículos asociados al cliente autenticado (portal cliente).
   * Ruta Gateway: GET /api/vehiculos/mios
   */
  async getMyVehicles(): Promise<Vehicle[]> {
    if (USE_MOCKS) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return [...localMockVehicles];
    }

    try {
      const response = await apiClient.get<VehicleResponseDto[]>('/vehiculos');
      return mapVehiclesResponseList(response.data);
    } catch (error: unknown) {
      const normalized = normalizeApiError(error);
      throw new Error(normalized.message || 'No fue posible cargar tus vehículos.');
    }
  }

  /**
   * Obtiene los vehículos asignados al mecánico autenticado (portal mecánico).
   * Ruta Gateway: GET /api/vehiculos/asignados
   */
  async getAssignedVehicles(): Promise<Vehicle[]> {
    if (USE_MOCKS) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return [...localMockVehicles];
    }

    try {
      const response = await apiClient.get<VehicleResponseDto[]>('/vehiculos/asignados');
      return mapVehiclesResponseList(response.data);
    } catch (error: unknown) {
      const normalized = normalizeApiError(error);
      throw new Error(normalized.message || 'No fue posible cargar los vehículos asignados.');
    }
  }

  /**
   * Obtiene un vehículo por su ID.
   * Ruta Gateway: GET /api/vehiculos/{id}
   */
  async getVehicleById(id: string): Promise<Vehicle> {
    if (USE_MOCKS) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      const found = localMockVehicles.find((v) => v.id === id);
      if (!found) {
        throw new Error('El vehículo solicitado no existe.');
      }
      return found;
    }

    try {
      const response = await apiClient.get<VehicleResponseDto>(`/vehiculos/${id}`);
      return mapVehicleResponse(response.data);
    } catch (error: unknown) {
      const normalized = normalizeApiError(error);
      throw new Error(normalized.message || 'No fue posible cargar el vehículo.');
    }
  }

  /**
   * Registra un nuevo vehículo en el sistema.
   * Ruta Gateway: POST /api/vehiculos
   * El clientId no viene en el body: el backend lo extrae del sub del JWT.
   */
  async createVehicle(data: CreateVehicleRequestDto): Promise<Vehicle> {
    const rawPlate = (data.patent || data.patente || data.plate || '').toUpperCase().trim();

    if (USE_MOCKS) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      const newMockVehicle: Vehicle = {
        id: `veh-00${localMockVehicles.length + 1}`,
        plate: rawPlate,
        brand: data.brand || data.marca || '',
        model: data.model || data.modelo || '',
        year: (data.year !== undefined ? data.year : data.anio) ?? null,
        mileage: (data.mileage !== undefined ? data.mileage : data.kilometraje) ?? null,
        ownerId: data.owner_id ? String(data.owner_id) : undefined,
      };
      localMockVehicles.unshift(newMockVehicle);
      return newMockVehicle;
    }

    try {
      const payload = {
        patent: rawPlate,
        patente: rawPlate,
        brand: data.brand || data.marca || '',
        model: data.model || data.modelo || '',
        year: (data.year !== undefined ? data.year : data.anio) ?? null,
        mileage: (data.mileage !== undefined ? data.mileage : data.kilometraje) ?? null,
      };

      const response = await apiClient.post<VehicleResponseDto>('/vehiculos', payload);
      return mapVehicleResponse(response.data);
    } catch (error: unknown) {
      const normalized = normalizeApiError(error);
      throw new Error(normalized.message || 'No fue posible registrar el vehículo.');
    }
  }
}

export const vehiclesService = new VehiclesService();
