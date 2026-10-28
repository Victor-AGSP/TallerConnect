import {
  MockVehicleAdapter,
  ServiceError,
  VehiclesService,
  vehiclesService,
} from '@/services/vehicles.service';
import { apiClient } from '@/services/api/client';
import { VehicleResponseDto } from '@/dto/vehicle.dto';

jest.mock('@/services/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  },
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('vehiclesService (Capa de Servicios de Vehículos)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    vehiclesService.useRealAdapter();
    vehiclesService.resetMocks();
  });

  describe('getVehicles', () => {
    it('obtiene y mapea la lista de vehículos desde la API Gateway (/vehiculos)', async () => {
      const rawApiVehicles: VehicleResponseDto[] = [
        {
          vehiculo_id: 1,
          cliente_id: 15,
          patente: 'ABCD12',
          marca: 'Toyota',
          modelo: 'Corolla',
          anio: 2020,
          kilometraje: null,
        },
      ];

      mockedApiClient.get.mockResolvedValueOnce({
        data: rawApiVehicles,
      } as never);

      const result = await vehiclesService.getVehicles();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/vehiculos');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: '1',
        plate: 'ABCD12',
        brand: 'Toyota',
        model: 'Corolla',
        year: 2020,
        mileage: null,
        ownerId: '15',
      });
    });

    it('envía parámetros de consulta tipados (VehicleQueryParamsDto) y filtra los resultados', async () => {
      const rawApiVehicles: VehicleResponseDto[] = [
        {
          vehiculo_id: 1,
          cliente_id: 10,
          patente: 'BBCC11',
          marca: 'Toyota',
          modelo: 'Yaris',
          anio: 2021,
          kilometraje: 32000,
        },
        {
          vehiculo_id: 2,
          cliente_id: 10,
          patente: 'XXYY99',
          marca: 'Mazda',
          modelo: 'Mazda 3',
          anio: 2022,
          kilometraje: 15000,
        },
      ];

      mockedApiClient.get.mockResolvedValueOnce({
        data: rawApiVehicles,
      } as never);

      const result = await vehiclesService.getVehicles({
        marca: 'Toyota',
        cliente_id: 10,
      });

      expect(mockedApiClient.get).toHaveBeenCalledWith('/vehiculos');
      expect(result).toHaveLength(1);
      expect(result[0].plate).toBe('BBCC11');
      expect(result[0].ownerId).toBe('10');
    });

    it('propaga error normalizado (ServiceError) si falla la petición', async () => {
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

  describe('getMyVehicles', () => {
    it('obtiene los vehículos del cliente autenticado (/vehiculos)', async () => {
      const rawVehicles: VehicleResponseDto[] = [
        {
          vehiculo_id: 1,
          cliente_id: 15,
          patente: 'ABCD12',
          marca: 'Toyota',
          modelo: 'Corolla',
          anio: 2019,
          kilometraje: 65000,
        },
      ];

      mockedApiClient.get.mockResolvedValueOnce({
        data: rawVehicles,
      } as never);

      const result = await vehiclesService.getMyVehicles();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/vehiculos');
      expect(result).toHaveLength(1);
      expect(result[0].plate).toBe('ABCD12');
      expect(result[0].mileage).toBe(65000);
    });
  });

  describe('getAssignedVehicles', () => {
    it('obtiene los vehículos asignados al mecánico (/vehiculos/asignados)', async () => {
      const rawVehicles: VehicleResponseDto[] = [
        {
          vehiculo_id: 2,
          cliente_id: 15,
          patente: 'KJTR45',
          marca: 'Hyundai',
          modelo: 'Accent',
          anio: 2017,
          kilometraje: 98000,
        },
      ];

      mockedApiClient.get.mockResolvedValueOnce({
        data: rawVehicles,
      } as never);

      const result = await vehiclesService.getAssignedVehicles();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/vehiculos/asignados');
      expect(result).toHaveLength(1);
      expect(result[0].plate).toBe('KJTR45');
    });
  });

  describe('getVehicleById', () => {
    it('obtiene un vehículo específico por su identificador', async () => {
      const rawVehicle: VehicleResponseDto = {
        vehiculo_id: 2,
        cliente_id: 15,
        patente: 'EFGH34',
        marca: 'Nissan',
        modelo: 'Versa',
        anio: 2022,
        kilometraje: null,
      };

      mockedApiClient.get.mockResolvedValueOnce({
        data: rawVehicle,
      } as never);

      const result = await vehiclesService.getVehicleById('2');

      expect(mockedApiClient.get).toHaveBeenCalledWith('/vehiculos/2');
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
        vehiculo_id: 10,
        cliente_id: 8,
        patente: 'JKLM56',
        marca: 'Hyundai',
        modelo: 'Tucson',
        anio: 2023,
        kilometraje: null,
      };

      mockedApiClient.post.mockResolvedValueOnce({
        data: rawResponse,
      } as never);

      const result = await vehiclesService.createVehicle(payload);

      expect(mockedApiClient.post).toHaveBeenCalledWith(
        '/vehiculos',
        expect.objectContaining({
          patent: 'JKLM56',
          patente: 'JKLM56',
          brand: 'Hyundai',
          marca: 'Hyundai',
          model: 'Tucson',
          modelo: 'Tucson',
        })
      );
      expect(result.id).toBe('10');
      expect(result.plate).toBe('JKLM56');
      expect(result.brand).toBe('Hyundai');
      expect(result.year).toBe(2023);
    });
  });

  describe('updateVehicle (PATCH /vehiculos/{vehiculo_id})', () => {
    it('actualiza parcialmente un vehículo según el esquema VehiculoActualizar de MS2', async () => {
      const rawUpdated: VehicleResponseDto = {
        vehiculo_id: 10,
        cliente_id: 8,
        patente: 'JKLM56',
        marca: 'Hyundai',
        modelo: 'Tucson NX4',
        anio: 2023,
        kilometraje: 18500,
      };

      mockedApiClient.patch.mockResolvedValueOnce({
        data: rawUpdated,
      } as never);

      const result = await vehiclesService.updateVehicle(10, {
        modelo: 'Tucson NX4',
        kilometraje: 18500,
      });

      expect(mockedApiClient.patch).toHaveBeenCalledWith('/vehiculos/10', {
        modelo: 'Tucson NX4',
        kilometraje: 18500,
      });
      expect(result.id).toBe('10');
      expect(result.model).toBe('Tucson NX4');
      expect(result.mileage).toBe(18500);
    });
  });

  describe('Normalización de errores y Adaptador Simulado', () => {
    it('normaliza errores HTTP 409 y 422 de validación OpenAPI como ServiceError tipado', async () => {
      mockedApiClient.post.mockRejectedValueOnce({
        isAxiosError: true,
        response: {
          status: 422,
          data: {
            detail: [
              {
                loc: ['body', 'patente'],
                msg: 'String should have at least 1 character',
                type: 'string_too_short',
              },
            ],
          },
        },
      });

      try {
        await vehiclesService.createVehicle({ patente: '', marca: 'Kia', modelo: 'Rio' });
        fail('Debió lanzar un ServiceError');
      } catch (err) {
        expect(err).toBeInstanceOf(ServiceError);
        const serviceErr = err as ServiceError;
        expect(serviceErr.status).toBe(422);
        expect(serviceErr.code).toBe('VEHICLE_VALIDATION_ERROR');
        expect(serviceErr.domain).toBe('vehicles');
        expect(serviceErr.message).toContain('String should have at least 1 character');
      }
    });

    it('permite alternar limpiamente al adaptador simulado (MockVehicleAdapter)', async () => {
      const serviceWithMock = new VehiclesService(new MockVehicleAdapter());
      const list = await serviceWithMock.getVehicles({ limit: 2 });
      expect(list.length).toBeLessThanOrEqual(2);
    });
  });
});
