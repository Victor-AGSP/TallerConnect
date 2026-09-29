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
   * Obtiene todos los vehículos registrados.
   * Utiliza GET (operación segura e idempotente con reintento automático ante caídas de red).
   */
  async getVehicles(): Promise<Vehicle[]> {
    if (USE_MOCKS) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return [...localMockVehicles];
    }

    try {
      const response = await apiClient.get<VehicleResponseDto[]>('/vehicles');
      return mapVehiclesResponseList(response.data);
    } catch (error: unknown) {
      const normalized = normalizeApiError(error);
      throw new Error(normalized.message || 'No fue posible cargar los vehículos.');
    }
  }

  /**
   * Obtiene un vehículo por su ID.
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
      const response = await apiClient.get<VehicleResponseDto>(`/vehicles/${id}`);
      return mapVehicleResponse(response.data);
    } catch (error: unknown) {
      const normalized = normalizeApiError(error);
      throw new Error(normalized.message || 'No fue posible cargar el vehículo.');
    }
  }

  /**
   * Registra un nuevo vehículo en el sistema.
   * Utiliza POST (operación no segura, protegida contra reintentos automáticos).
   */
  async createVehicle(data: CreateVehicleRequestDto): Promise<Vehicle> {
    if (USE_MOCKS) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      const newMockVehicle: Vehicle = {
        id: `veh-00${localMockVehicles.length + 1}`,
        plate: data.plate.toUpperCase().trim(),
        brand: data.brand,
        model: data.model,
        year: data.year,
        ownerId: data.owner_id ? String(data.owner_id) : undefined,
      };
      localMockVehicles.unshift(newMockVehicle);
      return newMockVehicle;
    }

    try {
      const response = await apiClient.post<VehicleResponseDto>('/vehicles', data);
      return mapVehicleResponse(response.data);
    } catch (error: unknown) {
      const normalized = normalizeApiError(error);
      throw new Error(normalized.message || 'No fue posible registrar el vehículo.');
    }
  }
}

export const vehiclesService = new VehiclesService();
