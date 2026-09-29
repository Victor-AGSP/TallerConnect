import { vehiclesService } from '@/services/vehicles.service';
import { apiClient } from '@/services/api/client';
import { VehicleResponseDto } from '@/dto/vehicle.dto';

jest.mock('@/services/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('vehiclesService (Capa de Servicios de Vehículos)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getVehicles', () => {
    it('obtiene y mapea la lista de vehículos desde la API Gateway', async () => {
      const rawApiVehicles: VehicleResponseDto[] = [
        {
          id: 1,
          license_plate: 'ABCD12',
          brand: 'Toyota',
          model: 'Corolla',
          year: 2020,
          owner_id: 15,
        },
      ];

      mockedApiClient.get.mockResolvedValueOnce({
        data: rawApiVehicles,
      } as never);

      const result = await vehiclesService.getVehicles();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/vehicles');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: '1',
        plate: 'ABCD12',
        brand: 'Toyota',
        model: 'Corolla',
        year: 2020,
        ownerId: '15',
      });
    });

    it('propaga error normalizado si falla la petición', async () => {
      mockedApiClient.get.mockRejectedValueOnce({
        isAxiosError: true,
        response: {
          status: 404,
          data: { detail: 'Vehículos no encontrados' },
        },
      });

      await expect(vehiclesService.getVehicles()).rejects.toThrow(
        'Vehículos no encontrados'
      );
    });
  });

  describe('getVehicleById', () => {
    it('obtiene un vehículo específico por su identificador', async () => {
      const rawVehicle: VehicleResponseDto = {
        id: 2,
        plate: 'EFGH34',
        brand: 'Nissan',
        model: 'Versa',
        year: 2022,
      };

      mockedApiClient.get.mockResolvedValueOnce({
        data: rawVehicle,
      } as never);

      const result = await vehiclesService.getVehicleById('2');

      expect(mockedApiClient.get).toHaveBeenCalledWith('/vehicles/2');
      expect(result.id).toBe('2');
      expect(result.plate).toBe('EFGH34');
      expect(result.brand).toBe('Nissan');
    });
  });

  describe('createVehicle', () => {
    it('registra un vehículo enviando los datos por POST y retornando el modelo mapeado', async () => {
      const payload = {
        plate: 'JKLM56',
        brand: 'Hyundai',
        model: 'Tucson',
        year: 2023,
        owner_id: 8,
      };

      const rawResponse: VehicleResponseDto = {
        id: 10,
        license_plate: 'JKLM56',
        brand: 'Hyundai',
        model: 'Tucson',
        year: 2023,
        owner_id: 8,
      };

      mockedApiClient.post.mockResolvedValueOnce({
        data: rawResponse,
      } as never);

      const result = await vehiclesService.createVehicle(payload);

      expect(mockedApiClient.post).toHaveBeenCalledWith('/vehicles', payload);
      expect(result.id).toBe('10');
      expect(result.plate).toBe('JKLM56');
      expect(result.brand).toBe('Hyundai');
      expect(result.year).toBe(2023);
    });
  });
});
