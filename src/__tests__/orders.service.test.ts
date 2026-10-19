import { ordersService } from '@/services/orders.service';
import { apiClient } from '@/services/api/client';
import { OrderResponseDto } from '@/dto/order.dto';

jest.mock('@/services/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  },
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('ordersService (Capa de Servicios de Órdenes)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

      expect(mockedApiClient.post).toHaveBeenCalledWith('/ordenes', expect.objectContaining({
        vehicle_id: '5',
        client_id: '12',
      }));
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

      const result = await ordersService.updateOrderStatus('101', 'listo_para_entrega');

      expect(mockedApiClient.patch).toHaveBeenCalledWith('/ordenes/101/status', {
        status: 'listo_para_entrega',
      });
      expect(result.status).toBe('listo_para_entrega');
    });
  });
});