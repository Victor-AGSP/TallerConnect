import {
  MockOrderAdapter,
  OrdersService,
  ordersService,
  filterOrdersByParams,
} from '@/services/orders.service';
import { ServiceError } from '@/services/vehicles.service';
import { apiClient } from '@/services/api/client';
import { OrderHistoryEntryDto, OrderResponseDto } from '@/dto/order.dto';

jest.mock('@/services/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    put: jest.fn(),
  },
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('ordersService (Capa de Servicios de Órdenes)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ordersService.useRealAdapter();
    ordersService.resetMocks();
  });

  describe('getOrders', () => {
    it('obtiene y mapea la lista de órdenes desde la API Gateway (snake_case a camelCase)', async () => {
      const rawApiOrders: OrderResponseDto[] = [
        {
          orden_id: 101,
          vehiculo_id: 5,
          ingreso_id: 201,
          estado_codigo: 5,
          mecanico_actual_id: 3,
          creado_por_id: 99,
          creado_en: '2026-03-20T10:00:00Z',
          actualizado_en: '2026-03-20T11:00:00Z',
        },
      ];

      mockedApiClient.get.mockResolvedValueOnce({
        data: rawApiOrders,
      } as never);

      const result = await ordersService.getOrders();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/ordenes');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: '101',
        vehicleId: '5',
        intakeId: '201',
        createdById: '99',
        assignedMechanicId: '3',
        status: 'en_reparacion',
        createdAt: '2026-03-20T10:00:00Z',
        updatedAt: '2026-03-20T11:00:00Z',
      });
    });

    it('soporta parámetros de consulta tipados (OrderQueryParamsDto) y mapea estado_codigo oficial de MS2', async () => {
      const rawMs2Orders: OrderResponseDto[] = [
        {
          orden_id: 31,
          vehiculo_id: 12,
          ingreso_id: 18,
          estado_codigo: 5,
          mecanico_actual_id: 50,
          creado_por_id: 99,
          creado_en: '2026-09-28T10:30:00-03:00',
          actualizado_en: '2026-09-28T11:00:00-03:00',
        },
        {
          orden_id: 32,
          vehiculo_id: 14,
          ingreso_id: 19,
          estado_codigo: 1,
          mecanico_actual_id: null,
          creado_por_id: 99,
          creado_en: '2026-09-28T10:30:00-03:00',
          actualizado_en: '2026-09-28T10:30:00-03:00',
        },
      ];

      mockedApiClient.get.mockResolvedValueOnce({
        data: rawMs2Orders,
      } as never);

      const result = await ordersService.getOrders({
        mecanico_actual_id: 50,
        estado_codigo: 5,
      });

      expect(mockedApiClient.get).toHaveBeenCalledWith('/ordenes');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('31');
      expect(result[0].status).toBe('en_reparacion');
      expect(result[0].assignedMechanicId).toBe('50');
    });

    it('propaga error normalizado si la API Gateway falla', async () => {
      mockedApiClient.get.mockRejectedValueOnce({
        isAxiosError: true,
        response: {
          status: 500,
          data: { detail: 'Error en la base de datos de órdenes' },
        },
      });

      await expect(ordersService.getOrders()).rejects.toThrow(
        'Error en la base de datos de órdenes'
      );
    });
  });

  describe('getOrderById', () => {
    it('obtiene una orden por su identificador', async () => {
      const rawOrder: OrderResponseDto = {
        orden_id: 101,
        vehiculo_id: 5,
        ingreso_id: 201,
        estado_codigo: 2,
        mecanico_actual_id: null,
        creado_por_id: 99,
        creado_en: '2026-03-20T10:00:00Z',
        actualizado_en: '2026-03-20T10:00:00Z',
      };

      mockedApiClient.get.mockResolvedValueOnce({
        data: rawOrder,
      } as never);

      const result = await ordersService.getOrderById('101');

      expect(mockedApiClient.get).toHaveBeenCalledWith('/ordenes/101');
      expect(result.id).toBe('101');
      expect(result.status).toBe('esperando_diagnostico');
    });

    it('envía el parámetro de consulta solo_propietario cuando se especifica', async () => {
      const rawOrder: OrderResponseDto = {
        orden_id: 31,
        vehiculo_id: 12,
        ingreso_id: 18,
        estado_codigo: 2,
        mecanico_actual_id: 50,
        creado_por_id: 99,
        creado_en: '2026-09-28T10:30:00-03:00',
        actualizado_en: '2026-09-28T11:00:00-03:00',
      };

      mockedApiClient.get.mockResolvedValueOnce({
        data: rawOrder,
      } as never);

      const result = await ordersService.getOrderById(31, { solo_propietario: true });

      expect(mockedApiClient.get).toHaveBeenCalledWith('/ordenes/31', {
        params: { solo_propietario: true },
      });
      expect(result.id).toBe('31');
    });
  });

  describe('createOrder', () => {
    it('envía la petición POST y devuelve la orden creada', async () => {
      const newOrderPayload = {
        vehicle_id: 5,
        client_id: 12,
        description: 'Cambio de pastillas de freno',
      };

      const rawResponse: OrderResponseDto = {
        orden_id: 102,
        vehiculo_id: 5,
        ingreso_id: 202,
        estado_codigo: 1,
        mecanico_actual_id: null,
        creado_por_id: 99,
        creado_en: '2026-03-29T12:00:00Z',
        actualizado_en: '2026-03-29T12:00:00Z',
      };

      mockedApiClient.post.mockResolvedValueOnce({
        data: rawResponse,
      } as never);

      const result = await ordersService.createOrder(newOrderPayload);

      expect(mockedApiClient.post).toHaveBeenCalledWith(
        '/ordenes',
        { vehiculo_id: 5 }
      );
      expect(result.id).toBe('102');
      expect(result.status).toBe('recibido');
      expect(result.vehicleId).toBe('5');
    });
  });

  describe('updateOrderStatus', () => {
    it('actualiza el estado de una orden mediante PATCH', async () => {
      const rawUpdated: OrderResponseDto = {
        orden_id: 101,
        vehiculo_id: 5,
        ingreso_id: 201,
        estado_codigo: 6,
        mecanico_actual_id: 3,
        creado_por_id: 99,
        creado_en: '2026-03-20T10:00:00Z',
        actualizado_en: '2026-03-21T09:00:00Z',
      };

      mockedApiClient.patch.mockResolvedValueOnce({
        data: rawUpdated,
      } as never);

      const result = await ordersService.updateOrderStatus(
        '101',
        'listo_para_entrega'
      );

      expect(mockedApiClient.patch).toHaveBeenCalledWith('/ordenes/101/estado', {
        estado_destino: 6,
      });
      expect(result.status).toBe('listo_para_entrega');
    });
  });

  describe('assignMechanic y getOrderHistory (Endpoints OpenAPI MS2)', () => {
    it('asigna un mecánico responsable mediante PUT /ordenes/{orden_id}/mecanico', async () => {
      const rawUpdated: OrderResponseDto = {
        orden_id: 31,
        vehiculo_id: 12,
        ingreso_id: 18,
        estado_codigo: 2,
        mecanico_actual_id: 50,
        creado_por_id: 99,
        creado_en: '2026-09-28T10:30:00-03:00',
        actualizado_en: '2026-09-28T11:00:00-03:00',
      };

      mockedApiClient.put.mockResolvedValueOnce({
        data: rawUpdated,
      } as never);

      const result = await ordersService.assignMechanic(31, {
        mecanico_id: 50,
        observacion: 'Asignación inicial',
      });

      expect(mockedApiClient.put).toHaveBeenCalledWith('/ordenes/31/mecanico', {
        mecanico_id: 50,
        observacion: 'Asignación inicial',
      });
      expect(result.assignedMechanicId).toBe('50');
    });

    it('consulta el historial de estados mediante GET /ordenes/{orden_id}/historial', async () => {
      const rawHistory: OrderHistoryEntryDto[] = [
        {
          historial_id: 41,
          orden_id: 31,
          estado_anterior: 1,
          estado_nuevo: 2,
          actor_usuario_id: 50,
          origen: 'usuario',
          fecha_hora: '2026-09-28T11:00:00-03:00',
          observacion: 'Inicia evaluación técnica',
        },
      ];

      mockedApiClient.get.mockResolvedValueOnce({
        data: rawHistory,
      } as never);

      const history = await ordersService.getOrderHistory(31);

      expect(mockedApiClient.get).toHaveBeenCalledWith('/ordenes/31/historial');
      expect(history).toHaveLength(1);
      expect(history[0].estado_nuevo).toBe(2);
    });
  });

  describe('Normalización de errores y Adaptador Simulado', () => {
    it('normaliza errores HTTP 409 y 422 de MS2 como ServiceError con metadatos', async () => {
      mockedApiClient.put.mockRejectedValueOnce({
        isAxiosError: true,
        response: {
          status: 409,
          data: { detail: 'No se puede cambiar el mecánico de una orden terminal' },
        },
      });

      try {
        await ordersService.assignMechanic(31, { mecanico_id: 50 });
        fail('Debió lanzar un ServiceError');
      } catch (err) {
        expect(err).toBeInstanceOf(ServiceError);
        const serviceErr = err as ServiceError;
        expect(serviceErr.status).toBe(409);
        expect(serviceErr.code).toBe('ORDER_CONFLICT');
        expect(serviceErr.domain).toBe('orders');
        expect(serviceErr.message).toBe(
          'No se puede cambiar el mecánico de una orden terminal'
        );
      }
    });

    it('permite instanciar OrdersService con MockOrderAdapter', async () => {
      const mockService = new OrdersService(new MockOrderAdapter());
      const orders = await mockService.getOrders({ limit: 1 });
      expect(orders.length).toBeLessThanOrEqual(1);
    });
  });
});


describe('filtrado por creador y propietario', () => {
  const order = {
    id: '31',
    vehicleId: '12',
    intakeId: '18',
    status: 'recibido' as const,
    assignedMechanicId: null,
    createdById: '99',
    createdAt: '2026-09-28T10:30:00Z',
    updatedAt: '2026-09-28T10:30:00Z',
  };

  it('filtra correctamente por creador', () => {
    expect(
      filterOrdersByParams([order], { creado_por_id: 99 })
    ).toEqual([order]);

    expect(
      filterOrdersByParams([order], { createdById: '50' })
    ).toEqual([]);
  });

  it('no confunde el propietario con el creador', () => {
    expect(() =>
      filterOrdersByParams([order], { cliente_id: 99 })
    ).toThrow('No se puede filtrar por propietario');

    expect(() =>
      filterOrdersByParams([order], { clientId: '99' })
    ).toThrow('No se puede filtrar por propietario');
  });
});
