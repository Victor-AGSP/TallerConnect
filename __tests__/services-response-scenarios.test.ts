import { apiClient } from '@/services/api/client';
import { ordersService } from '@/services/orders.service';
import { vehiclesService } from '@/services/vehicles.service';
import type { OrderResponseDto } from '@/dto/order.dto';
import type { VehicleResponseDto } from '@/dto/vehicle.dto';

jest.mock('@/services/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  },
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

/**
 * Respuestas simuladas de VehiclesService y OrdersService en los tres
 * escenarios que debe tolerar la aplicación: respuesta exitosa, resultado
 * vacío y error propagado con el mensaje normalizado por la capa HTTP.
 *
 * Los mensajes esperados provienen de `normalizeApiError`, por lo que estas
 * pruebas también fijan el contrato de errores que consumirán las vistas.
 */

/** Error de Axios con respuesta del servidor. */
function httpError(status: number, detail?: string) {
  return {
    isAxiosError: true,
    message: `Request failed with status code ${status}`,
    response: {
      status,
      data: detail ? { detail } : {},
    },
  };
}

/** Error de Axios sin respuesta: backend inalcanzable o sin conexión. */
function networkError() {
  return {
    isAxiosError: true,
    message: 'Network Error',
  };
}

/** Error de Axios por tiempo de espera agotado. */
function timeoutError() {
  return {
    isAxiosError: true,
    code: 'ECONNABORTED',
    message: 'timeout of 10000ms exceeded',
  };
}

const NETWORK_MESSAGE =
  'Backend no disponible o sin conexión a internet. Revisa tu conexión.';
const TIMEOUT_MESSAGE =
  'Tiempo de espera agotado. El servidor tardó demasiado en responder.';
const NOT_FOUND_MESSAGE = 'El recurso solicitado no fue encontrado.';
const FORBIDDEN_MESSAGE = 'No tienes permisos para realizar esta acción.';
const UNAUTHORIZED_MESSAGE =
  'Sesión expirada o no autorizada. Por favor, inicia sesión nuevamente.';
const SERVER_MESSAGE =
  'Error interno en el servidor. Intenta nuevamente más tarde.';
const INVALID_DATA_MESSAGE =
  'Los datos enviados no son válidos o están incompletos.';
const CONFLICT_MESSAGE =
  'Conflicto con los datos ingresados (ej. patente duplicada).';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('VehiclesService: respuestas exitosas', () => {
  it('mapea una lista con elementos en getVehicles', async () => {
    const data: VehicleResponseDto[] = [
      {
        vehiculo_id: 7,
        cliente_id: 12,
        patente: 'ABCD12',
        marca: 'Toyota',
        modelo: 'Yaris',
        anio: 2021,
        kilometraje: 42000,
      },
    ];

    mockedApiClient.get.mockResolvedValueOnce({ data } as never);

    const result = await vehiclesService.getVehicles();

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: '7',
      plate: 'ABCD12',
      brand: 'Toyota',
      model: 'Yaris',
      year: 2021,
      mileage: 42000,
      ownerId: '12',
    });
  });

  it('mapea el detalle de un vehículo en getVehicleById', async () => {
    const data: VehicleResponseDto = {
      vehiculo_id: 3,
      cliente_id: 12,
      patente: 'EFGH34',
      marca: 'Nissan',
      modelo: 'Versa',
      anio: 2022,
      kilometraje: null,
    };

    mockedApiClient.get.mockResolvedValueOnce({ data } as never);

    const result = await vehiclesService.getVehicleById('3');

    expect(mockedApiClient.get).toHaveBeenCalledWith('/vehiculos/3');
    expect(result.plate).toBe('EFGH34');
    expect(result.mileage).toBeNull();
  });
});

describe('VehiclesService: respuestas vacías', () => {
  it.each([
    ['getVehicles', () => vehiclesService.getVehicles()],
    ['getMyVehicles', () => vehiclesService.getMyVehicles()],
    ['getAssignedVehicles', () => vehiclesService.getAssignedVehicles()],
  ] as const)(
    'devuelve una lista vacía cuando %s no encuentra vehículos',
    async (_name, call) => {
      mockedApiClient.get.mockResolvedValueOnce({ data: [] } as never);

      await expect(call()).resolves.toEqual([]);
    },
  );

  it('devuelve una lista vacía si la API responde con un cuerpo no iterable', async () => {
    mockedApiClient.get.mockResolvedValueOnce({ data: null } as never);

    await expect(vehiclesService.getVehicles()).resolves.toEqual([]);
  });

  it('rechaza un detalle que incumple el contrato MS2', async () => {
    mockedApiClient.get.mockResolvedValueOnce({ data: {} } as never);

    await expect(
      vehiclesService.getVehicleById('99'),
    ).rejects.toThrow('Respuesta de vehículo inválida.');
  });
});

describe('VehiclesService: respuestas con error', () => {
  it('propaga el detalle enviado por el backend', async () => {
    mockedApiClient.get.mockRejectedValueOnce(
      httpError(404, 'Vehículos no encontrados'),
    );

    await expect(vehiclesService.getVehicles()).rejects.toThrow(
      'Vehículos no encontrados',
    );
  });

  it.each([
    [404, NOT_FOUND_MESSAGE],
    [401, UNAUTHORIZED_MESSAGE],
    [403, FORBIDDEN_MESSAGE],
    [500, SERVER_MESSAGE],
  ])(
    'traduce el estado %i a un mensaje legible cuando el backend no envía detalle',
    async (status, expected) => {
      mockedApiClient.get.mockRejectedValueOnce(httpError(status));

      await expect(vehiclesService.getVehicles()).rejects.toThrow(expected);
    },
  );

  it('informa la falta de conexión en getMyVehicles', async () => {
    mockedApiClient.get.mockRejectedValueOnce(networkError());

    await expect(vehiclesService.getMyVehicles()).rejects.toThrow(
      NETWORK_MESSAGE,
    );
  });

  it('informa el tiempo de espera agotado en getAssignedVehicles', async () => {
    mockedApiClient.get.mockRejectedValueOnce(timeoutError());

    await expect(vehiclesService.getAssignedVehicles()).rejects.toThrow(
      TIMEOUT_MESSAGE,
    );
  });

  it('usa el mensaje propio del servicio si el error no aporta ninguno', async () => {
    mockedApiClient.get.mockRejectedValueOnce(new Error(''));

    await expect(vehiclesService.getVehicleById('404')).rejects.toThrow(
      'No fue posible cargar el vehículo.',
    );
  });

  it.each([
    [409, CONFLICT_MESSAGE],
    [422, INVALID_DATA_MESSAGE],
  ])(
    'informa el estado %i al registrar un vehículo inválido',
    async (status, expected) => {
      mockedApiClient.post.mockRejectedValueOnce(httpError(status));

      await expect(
        vehiclesService.createVehicle({
          plate: 'ABCD12',
          brand: 'Toyota',
          model: 'Yaris',
        }),
      ).rejects.toThrow(expected);
    },
  );
});

describe('OrdersService: respuestas exitosas', () => {
  it('mapea una lista con elementos en getOrders', async () => {
    const data: OrderResponseDto[] = [
      {
        orden_id: 55,
        vehiculo_id: 7,
        ingreso_id: 200,
        estado_codigo: 5,
        mecanico_actual_id: null,
        creado_por_id: 2,
        creado_en: '2026-04-01T09:00:00Z',
        actualizado_en: '2026-04-01T09:00:00Z',
      },
    ];

    mockedApiClient.get.mockResolvedValueOnce({ data } as never);

    const result = await ordersService.getOrders();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: '55',
      vehicleId: '7',
      status: 'en_reparacion',
      assignedMechanicId: null,
    });
  });

  it('mapea el detalle de una orden en getOrderById', async () => {
    const data: OrderResponseDto = {
      orden_id: 101,
      vehiculo_id: 5,
      ingreso_id: 201,
      estado_codigo: 6,
      mecanico_actual_id: null,
      creado_por_id: 2,
      creado_en: '2026-04-01T09:00:00Z',
      actualizado_en: '2026-04-01T09:00:00Z',
    };

    mockedApiClient.get.mockResolvedValueOnce({ data } as never);

    const result = await ordersService.getOrderById('101');

    expect(mockedApiClient.get).toHaveBeenCalledWith('/ordenes/101');
    expect(result.status).toBe('listo_para_entrega');
  });
});

describe('OrdersService: respuestas vacías', () => {
  it('devuelve una lista vacía cuando no hay órdenes registradas', async () => {
    mockedApiClient.get.mockResolvedValueOnce({ data: [] } as never);

    await expect(ordersService.getOrders()).resolves.toEqual([]);
  });

  it('devuelve una lista vacía si la API responde con un cuerpo no iterable', async () => {
    mockedApiClient.get.mockResolvedValueOnce({ data: undefined } as never);

    await expect(ordersService.getOrders()).resolves.toEqual([]);
  });

  it('rechaza una orden sin estado_codigo oficial', async () => {
    mockedApiClient.get.mockResolvedValueOnce({
      data: {
        orden_id: 77,
        vehiculo_id: 5,
        ingreso_id: 201,
        mecanico_actual_id: null,
        creado_por_id: 2,
        creado_en: '2026-04-01T09:00:00Z',
        actualizado_en: '2026-04-01T09:00:00Z',
      },
    } as never);

    await expect(
      ordersService.getOrderById('77'),
    ).rejects.toThrow('Estado de orden desconocido: undefined');
  });
});

describe('OrdersService: respuestas con error', () => {
  it('propaga el detalle enviado por el backend', async () => {
    mockedApiClient.get.mockRejectedValueOnce(
      httpError(500, 'Error en la base de datos de órdenes'),
    );

    await expect(ordersService.getOrders()).rejects.toThrow(
      'Error en la base de datos de órdenes',
    );
  });

  it.each([
    [403, FORBIDDEN_MESSAGE],
    [500, SERVER_MESSAGE],
  ])(
    'traduce el estado %i al listar órdenes sin detalle del backend',
    async (status, expected) => {
      mockedApiClient.get.mockRejectedValueOnce(httpError(status));

      await expect(ordersService.getOrders()).rejects.toThrow(expected);
    },
  );

  it('informa la falta de conexión al listar órdenes', async () => {
    mockedApiClient.get.mockRejectedValueOnce(networkError());

    await expect(ordersService.getOrders()).rejects.toThrow(NETWORK_MESSAGE);
  });

  it('informa que la orden consultada no existe', async () => {
    mockedApiClient.get.mockRejectedValueOnce(httpError(404));

    await expect(ordersService.getOrderById('999')).rejects.toThrow(
      NOT_FOUND_MESSAGE,
    );
  });

  it('usa el mensaje propio del servicio si el error no aporta ninguno', async () => {
    mockedApiClient.get.mockRejectedValueOnce(new Error(''));

    await expect(ordersService.getOrderById('999')).rejects.toThrow(
      'No fue posible cargar la orden de trabajo.',
    );
  });

  it('informa datos inválidos al crear una orden', async () => {
    mockedApiClient.post.mockRejectedValueOnce(httpError(422));

    await expect(
      ordersService.createOrder({ vehicle_id: 5, client_id: 12 }),
    ).rejects.toThrow(INVALID_DATA_MESSAGE);
  });

  it('informa la falta de permisos al actualizar el estado de una orden', async () => {
    mockedApiClient.patch.mockRejectedValueOnce(httpError(403));

    await expect(
      ordersService.updateOrderStatus('101', 'entregado'),
    ).rejects.toThrow(FORBIDDEN_MESSAGE);
  });
});
