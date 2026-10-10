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
   * Ruta Gateway: GET /api/ordenes
   */
  async getOrders(): Promise<WorkOrder[]> {
    if (USE_MOCKS) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return [...localMockOrders];
    }

    try {
      const response = await apiClient.get<OrderResponseDto[]>('/ordenes');
      return mapOrdersResponseList(response.data);
    } catch (error: unknown) {
      const normalized = normalizeApiError(error);
      throw new Error(normalized.message || 'No fue posible cargar las órdenes de trabajo.');
    }
  }

  /**
   * Obtiene el detalle de una orden de trabajo por su ID.
   * Ruta Gateway: GET /api/ordenes/{id}
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
      const response = await apiClient.get<OrderResponseDto>(`/ordenes/${id}`);
      return mapOrderResponse(response.data);
    } catch (error: unknown) {
      const normalized = normalizeApiError(error);
      throw new Error(normalized.message || 'No fue posible cargar la orden de trabajo.');
    }
  }

  /**
   * Crea una nueva orden de trabajo.
   * Ruta Gateway: POST /api/ordenes
   */
  async createOrder(data: CreateOrderRequestDto): Promise<WorkOrder> {
    const vehicleId = String(data.vehiculo_id ?? data.vehicle_id ?? '');
    const clientId = String(data.cliente_id ?? data.client_id ?? '');

    if (USE_MOCKS) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      const newMockOrder: WorkOrder = {
        id: `ot-00${localMockOrders.length + 124}`,
        vehicleId,
        intakeId: `ing-00${localMockOrders.length + 124}`,
        createdById: 'usr-003',
        status: 'esperando_diagnostico',
        assignedMechanicId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      localMockOrders.unshift(newMockOrder);
      return newMockOrder;
    }

    try {
      const payload = {
        vehiculo_id: vehicleId,
        vehicle_id: vehicleId,
        cliente_id: clientId,
        client_id: clientId,
        description: data.description,
      };

      const response = await apiClient.post<OrderResponseDto>('/ordenes', payload);
      return mapOrderResponse(response.data);
    } catch (error: unknown) {
      const normalized = normalizeApiError(error);
      throw new Error(normalized.message || 'No fue posible crear la orden de trabajo.');
    }
  }

  /**
   * Actualiza el estado de una orden de trabajo (PATCH /api/ordenes/{id}/status).
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
      const response = await apiClient.patch<OrderResponseDto>(`/ordenes/${id}/status`, payload);
      return mapOrderResponse(response.data);
    } catch (error: unknown) {
      const normalized = normalizeApiError(error);
      throw new Error(normalized.message || 'No fue posible actualizar el estado de la orden.');
    }
  }
}

export const ordersService = new OrdersService();