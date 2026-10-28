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
    const rawResponse: VehicleResponseDto = {
      vehiculo_id: 10,
      cliente_id: 8,
      patente: 'JKLM56',
      marca: 'Hyundai',
      modelo: 'Tucson',
      anio: 2023,
      kilometraje: null,
    };

    it('envía por POST exactamente el cuerpo VehiculoCrear y retorna el modelo mapeado', async () => {
      mockedApiClient.post.mockResolvedValueOnce({ data: rawResponse } as never);

      const result = await vehiclesService.createVehicle({
        plate: 'jklm56 ',
        brand: 'Hyundai',
        model: 'Tucson',
        year: 2023,
        owner_id: 8,
      });

      expect(mockedApiClient.post).toHaveBeenCalledTimes(1);
      const [url, body] = mockedApiClient.post.mock.calls[0];
      expect(url).toBe('/vehiculos');
      // Igualdad estricta: cualquier propiedad adicional rompería additionalProperties: false.
      expect(body).toStrictEqual({
        patente: 'JKLM56',
        marca: 'Hyundai',
        modelo: 'Tucson',
        anio: 2023,
      });
      expect(result).toEqual({
        id: '10',
        plate: 'JKLM56',
        brand: 'Hyundai',
        model: 'Tucson',
        year: 2023,
        mileage: null,
        ownerId: '8',
      });
    });

    it('solo envía propiedades admitidas por VehiculoCrear aunque la entrada mezcle alias', async () => {
      mockedApiClient.post.mockResolvedValueOnce({ data: rawResponse } as never);

      await vehiclesService.createVehicle({
        patente: 'JKLM56',
        patent: 'IGNORADA',
        marca: 'Hyundai',
        brand: 'Otra',
        modelo: 'Tucson',
        model: 'Otro',
        anio: 2023,
        year: 1999,
        kilometraje: 1200,
        mileage: 5,
        owner_id: 99,
      });

      const body = mockedApiClient.post.mock.calls[0][1] as Record<string, unknown>;
      expect(Object.keys(body).sort()).toEqual(
        ['anio', 'kilometraje', 'marca', 'modelo', 'patente']
      );
      expect(body).toStrictEqual({
        patente: 'JKLM56',
        marca: 'Hyundai',
        modelo: 'Tucson',
        anio: 2023,
        kilometraje: 1200,
      });
    });

    it('conserva null explícito en anio y kilometraje y omite los no informados', async () => {
      mockedApiClient.post.mockResolvedValueOnce({ data: rawResponse } as never);
      await vehiclesService.createVehicle({
        patente: 'JKLM56', marca: 'Hyundai', modelo: 'Tucson', anio: null,
      });
      expect(mockedApiClient.post.mock.calls[0][1]).toStrictEqual({
        patente: 'JKLM56', marca: 'Hyundai', modelo: 'Tucson', anio: null,
      });
    });

    it.each([
      [{ patente: '  ', marca: 'Kia', modelo: 'Rio' }, 'Patente, marca y modelo son obligatorios'],
      [{ patente: 'AB12', modelo: 'Rio' }, 'Patente, marca y modelo son obligatorios'],
      [{ patente: 'AB12', marca: 'Kia', modelo: 'x'.repeat(61) }, 'como máximo 60 caracteres'],
      [{ patente: 'AB12', marca: 'Kia', modelo: 'Rio', anio: 2020.5 }, 'anio debe ser un número entero'],
      [
        { patente: 'AB12', marca: 'Kia', modelo: 'Rio', kilometraje: '100' as unknown as number },
        'kilometraje debe ser un número entero',
      ],
    ])('rechaza localmente datos inválidos sin llamar a MS2 (%o)', async (input, message) => {
      await expect(vehiclesService.createVehicle(input)).rejects.toMatchObject({
        status: 422,
        code: 'VEHICLE_VALIDATION_ERROR',
        domain: 'vehicles',
        message: expect.stringContaining(message),
      });
      expect(mockedApiClient.post).not.toHaveBeenCalled();
    });

    it('rechaza una respuesta 201 que no cumple VehiculoRespuesta', async () => {
      mockedApiClient.post.mockResolvedValueOnce({ data: { vehiculo_id: 10 } } as never);
      await expect(
        vehiclesService.createVehicle({ patente: 'AB12', marca: 'Kia', modelo: 'Rio' })
      ).rejects.toBeInstanceOf(ServiceError);
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
        // Entrada válida localmente: se verifica la normalización del 422 devuelto por MS2.
        await vehiclesService.createVehicle({ patente: 'AB12', marca: 'Kia', modelo: 'Rio' });
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
