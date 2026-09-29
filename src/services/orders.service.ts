import { apiClient } from '@/services/api/client';
import { normalizeApiError } from '@/services/api/interceptors';
import { WorkOrder, WorkOrderStatus } from '@/models/order.model';
import {
  CreateOrderRequestDto,
  OrderResponseDto,
  UpdateOrderStatusRequestDto,
} from '@/dto/order.dto';
import { mapOrderResponse, mapOrdersResponseList } from '@/mappers/order.mapper';
import { mockWorkOrders } from '@/mocks/orders.mock';

const USE_MOCKS = process.env.EXPO_PUBLIC_USE_MOCK_AUTH === 'true';

// Estado local de mocks en memoria para desarrollo offline
let localMockOrders = [...mockWorkOrders];

export class OrdersService {
  /**
   * Obtiene la lista completa de órdenes de trabajo.
   * Utiliza GET (operación segura con reintento automático ante fallas de red).
   */
  async getOrders(): Promise<WorkOrder[]> {
    if (USE_MOCKS) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return [...localMockOrders];
    }

    try {
      const response = await apiClient.get<OrderResponseDto[]>('/orders');
      return mapOrdersResponseList(response.data);
    } catch (error: unknown) {
      const normalized = normalizeApiError(error);
      throw new Error(normalized.message || 'No fue posible cargar las órdenes de trabajo.');
    }
  }

  /**
   * Obtiene el detalle de una orden de trabajo por su ID.
   */
  async getOrderById(id: string): Promise<WorkOrder> {
    if (USE_MOCKS) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      const found = localMockOrders.find((order) => order.id === id);
      if (!found) {
        throw new Error('La orden de trabajo solicitada no existe.');
      }
      return found;
    }

    try {
      const response = await apiClient.get<OrderResponseDto>(`/orders/${id}`);
      return mapOrderResponse(response.data);
    } catch (error: unknown) {
      const normalized = normalizeApiError(error);
      throw new Error(normalized.message || 'No fue posible cargar la orden de trabajo.');
    }
  }

  /**
   * Crea una nueva orden de trabajo.
   * Utiliza POST (operación no segura, protegida contra reintentos automáticos duplicados).
   */
  async createOrder(data: CreateOrderRequestDto): Promise<WorkOrder> {
    if (USE_MOCKS) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      const newMockOrder: WorkOrder = {
        id: `ot-00${localMockOrders.length + 124}`,
        vehicleId: String(data.vehicle_id),
        clientId: String(data.client_id),
        status: 'esperando_diagnostico',
        description: data.description,
        createdAt: new Date().toISOString(),
      };
      localMockOrders.unshift(newMockOrder);
      return newMockOrder;
    }

    try {
      const response = await apiClient.post<OrderResponseDto>('/orders', data);
      return mapOrderResponse(response.data);
    } catch (error: unknown) {
      const normalized = normalizeApiError(error);
      throw new Error(normalized.message || 'No fue posible crear la orden de trabajo.');
    }
  }

  /**
   * Actualiza el estado de una orden de trabajo (PATCH).
   */
  async updateOrderStatus(id: string, status: WorkOrderStatus): Promise<WorkOrder> {
    if (USE_MOCKS) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const index = localMockOrders.findIndex((order) => order.id === id);
      if (index === -1) {
        throw new Error('La orden de trabajo solicitada no existe.');
      }
      localMockOrders[index] = {
        ...localMockOrders[index],
        status,
        updatedAt: new Date().toISOString(),
      };
      return localMockOrders[index];
    }

    try {
      const payload: UpdateOrderStatusRequestDto = { status };
      const response = await apiClient.patch<OrderResponseDto>(`/orders/${id}/status`, payload);
      return mapOrderResponse(response.data);
    } catch (error: unknown) {
      const normalized = normalizeApiError(error);
      throw new Error(normalized.message || 'No fue posible actualizar el estado de la orden.');
    }
  }
}

export const ordersService = new OrdersService();
