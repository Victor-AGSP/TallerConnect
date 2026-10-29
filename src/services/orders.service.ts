import { apiClient } from '@/services/api/client';
import { HTTP_STATUS } from '@/services/api/types';
import { WorkOrder, WorkOrderStatus } from '@/models/order.model';
import {
  AssignMechanicRequestDto,
  CreateOrderRequestDto,
  OrderDetailQueryParamsDto,
  OrderHistoryEntryDto,
  OrderQueryParamsDto,
  OrderResponseDto,
} from '@/dto/order.dto';
import {
  CODE_TO_STATUS,
  STATUS_TO_CODE,
  mapOrderResponse,
  mapOrderStatusUpdateRequest,
  mapOrdersResponseList,
} from '@/mappers/order.mapper';
import { mockWorkOrders } from '@/mocks/orders.mock';
import {
  ServiceError,
  normalizeOrderServiceError,
} from '@/services/service-error';

export { ServiceError, normalizeOrderServiceError };

const USE_MOCKS = process.env.EXPO_PUBLIC_USE_MOCK_AUTH === 'true';

/**
 * Filtra y pagina localmente una lista de órdenes según OrderQueryParamsDto.
 */
export function filterOrdersByParams(
  orders: WorkOrder[],
  params?: OrderQueryParamsDto
): WorkOrder[] {
  if (!params) {
    return [...orders];
  }

  let filtered = [...orders];

  const vehicleFilter =
    params.vehiculo_id != null
      ? String(params.vehiculo_id)
      : params.vehicleId
      ? String(params.vehicleId)
      : undefined;

  if (vehicleFilter) {
    filtered = filtered.filter((o) => o.vehicleId === vehicleFilter);
  }

  const creatorFilter =
    params.creado_por_id != null
      ? String(params.creado_por_id)
      : params.createdById
      ? String(params.createdById)
      : params.cliente_id != null
      ? String(params.cliente_id)
      : params.clientId
      ? String(params.clientId)
      : undefined;

  if (creatorFilter) {
    filtered = filtered.filter((o) => o.createdById === creatorFilter);
  }

  const mechanicFilter =
    params.mecanico_actual_id != null
      ? String(params.mecanico_actual_id)
      : params.assignedMechanicId
      ? String(params.assignedMechanicId)
      : undefined;

  if (mechanicFilter) {
    filtered = filtered.filter((o) => o.assignedMechanicId === mechanicFilter);
  }

  const resolvedStatus =
    params.status ??
    (params.estado_codigo != null
      ? CODE_TO_STATUS[params.estado_codigo]
      : undefined);

  if (resolvedStatus) {
    filtered = filtered.filter((o) => o.status === resolvedStatus);
  }

  const start = params.skip && params.skip > 0 ? params.skip : 0;
  const end =
    params.limit && params.limit > 0 ? start + params.limit : undefined;

  return filtered.slice(start, end);
}

/**
 * Contrato común para los adaptadores (Mock y Real HTTP) de Órdenes de Trabajo.
 */
export interface OrderServiceAdapter {
  getOrders(params?: OrderQueryParamsDto): Promise<WorkOrder[]>;
  getOrderById(
    id: string | number,
    params?: OrderDetailQueryParamsDto
  ): Promise<WorkOrder>;
  createOrder(data: CreateOrderRequestDto): Promise<WorkOrder>;
  updateOrderStatus(
    id: string | number,
    status: WorkOrderStatus,
    observation?: string | null
  ): Promise<WorkOrder>;
  assignMechanic(
    id: string | number,
    data: AssignMechanicRequestDto
  ): Promise<WorkOrder>;
  getOrderHistory(id: string | number): Promise<OrderHistoryEntryDto[]>;
  resetMocks?(): void;
}

/**
 * Adaptador simulado (Mock) en memoria para órdenes de trabajo y su historial de estados.
 */
export class MockOrderAdapter implements OrderServiceAdapter {
  private orders: WorkOrder[];
  private historyByOrder: Record<string, OrderHistoryEntryDto[]>;
  private readonly delayMs: number;

  constructor(initialOrders: WorkOrder[] = mockWorkOrders, delayMs = 0) {
    this.orders = [...initialOrders];
    this.historyByOrder = {};
    this.delayMs = delayMs;
  }

  private async simulateDelay(): Promise<void> {
    if (this.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    }
  }

  resetMocks(initialOrders: WorkOrder[] = mockWorkOrders): void {
    this.orders = [...initialOrders];
    this.historyByOrder = {};
  }

  async getOrders(params?: OrderQueryParamsDto): Promise<WorkOrder[]> {
    await this.simulateDelay();
    return filterOrdersByParams(this.orders, params);
  }

  async getOrderById(
    id: string | number,
    _params?: OrderDetailQueryParamsDto
  ): Promise<WorkOrder> {
    await this.simulateDelay();
    const orderId = String(id);
    const found = this.orders.find((order) => order.id === orderId);
    if (!found) {
      throw new ServiceError({
        message: 'La orden de trabajo solicitada no existe.',
        status: HTTP_STATUS.NOT_FOUND,
        code: 'ORDER_NOT_FOUND',
        domain: 'orders',
      });
    }
    return { ...found };
  }

  async createOrder(data: CreateOrderRequestDto): Promise<WorkOrder> {
    await this.simulateDelay();
    const vehicleId = String(data.vehiculo_id ?? data.vehicle_id ?? '').trim();
    const createdById = String(
      data.cliente_id ?? data.client_id ?? 'usr-003'
    ).trim();

    if (!vehicleId || vehicleId === '0') {
      throw new ServiceError({
        message: 'El identificador del vehículo es obligatorio para crear una orden.',
        status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
        code: 'ORDER_VALIDATION_ERROR',
        domain: 'orders',
      });
    }

    const now = new Date().toISOString();
    const seq = this.orders.length + 124;
    const newMockOrder: WorkOrder = {
      id: `ot-00${seq}`,
      vehicleId,
      intakeId: `ing-00${seq}`,
      createdById,
      status: 'esperando_diagnostico',
      assignedMechanicId: null,
      createdAt: now,
      updatedAt: now,
    };

    this.orders.unshift(newMockOrder);
    this.historyByOrder[newMockOrder.id] = [
      {
        historial_id: 1,
        orden_id: seq,
        estado_anterior: null,
        estado_nuevo: STATUS_TO_CODE[newMockOrder.status] ?? 2,
        actor_usuario_id: 99,
        origen: 'usuario',
        fecha_hora: now,
        observacion: data.description ?? 'Creación de orden de trabajo',
      },
    ];

    return { ...newMockOrder };
  }

  async updateOrderStatus(
    id: string | number,
    status: WorkOrderStatus,
    observation?: string | null
  ): Promise<WorkOrder> {
    await this.simulateDelay();
    const orderId = String(id);
    const index = this.orders.findIndex((order) => order.id === orderId);
    if (index === -1) {
      throw new ServiceError({
        message: 'La orden de trabajo solicitada no existe.',
        status: HTTP_STATUS.NOT_FOUND,
        code: 'ORDER_NOT_FOUND',
        domain: 'orders',
      });
    }

    const current = this.orders[index];
    if (current.status === 'entregado' || current.status === 'cancelado') {
      throw new ServiceError({
        message: 'La orden se encuentra en un estado terminal y no admite transiciones.',
        status: HTTP_STATUS.CONFLICT,
        code: 'ORDER_CONFLICT',
        domain: 'orders',
      });
    }

    const now = new Date().toISOString();
    const prevCode = STATUS_TO_CODE[current.status] ?? 1;
    const nextCode = STATUS_TO_CODE[status] ?? 2;

    const updated: WorkOrder = {
      ...current,
      status,
      updatedAt: now,
    };
    this.orders[index] = updated;

    const currentHistory = this.historyByOrder[orderId] ?? [
      {
        historial_id: 1,
        orden_id: Number(orderId.replace(/\D/g, '')) || 1,
        estado_anterior: null,
        estado_nuevo: prevCode,
        actor_usuario_id: 99,
        origen: 'usuario' as const,
        fecha_hora: current.createdAt,
        observacion: 'Ingreso inicial registrado',
      },
    ];

    currentHistory.push({
      historial_id: currentHistory.length + 1,
      orden_id: Number(orderId.replace(/\D/g, '')) || 1,
      estado_anterior: prevCode,
      estado_nuevo: nextCode,
      actor_usuario_id: 50,
      origen: 'usuario',
      fecha_hora: now,
      observacion: observation ?? `Cambio de estado a ${status}`,
    });
    this.historyByOrder[orderId] = currentHistory;

    return { ...updated };
  }

  async assignMechanic(
    id: string | number,
    data: AssignMechanicRequestDto
  ): Promise<WorkOrder> {
    await this.simulateDelay();
    const orderId = String(id);
    const mechanicIdStr = String(data.mecanico_id ?? '').trim();

    if (!mechanicIdStr || mechanicIdStr === '0') {
      throw new ServiceError({
        message: 'El identificador del mecánico debe ser válido.',
        status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
        code: 'ORDER_VALIDATION_ERROR',
        domain: 'orders',
      });
    }

    const index = this.orders.findIndex((order) => order.id === orderId);
    if (index === -1) {
      throw new ServiceError({
        message: 'La orden de trabajo solicitada no existe.',
        status: HTTP_STATUS.NOT_FOUND,
        code: 'ORDER_NOT_FOUND',
        domain: 'orders',
      });
    }

    const current = this.orders[index];
    if (current.status === 'entregado' || current.status === 'cancelado') {
      throw new ServiceError({
        message: 'No se puede cambiar el mecánico de una orden terminal.',
        status: HTTP_STATUS.CONFLICT,
        code: 'ORDER_CONFLICT',
        domain: 'orders',
      });
    }

    const updated: WorkOrder = {
      ...current,
      assignedMechanicId: mechanicIdStr,
      updatedAt: new Date().toISOString(),
    };
    this.orders[index] = updated;
    return { ...updated };
  }

  async getOrderHistory(id: string | number): Promise<OrderHistoryEntryDto[]> {
    await this.simulateDelay();
    const orderId = String(id);
    const found = this.orders.find((order) => order.id === orderId);
    if (!found) {
      throw new ServiceError({
        message: 'La orden de trabajo solicitada no existe.',
        status: HTTP_STATUS.NOT_FOUND,
        code: 'ORDER_NOT_FOUND',
        domain: 'orders',
      });
    }

    if (!this.historyByOrder[orderId]) {
      this.historyByOrder[orderId] = [
        {
          historial_id: 1,
          orden_id: Number(orderId.replace(/\D/g, '')) || 1,
          estado_anterior: null,
          estado_nuevo: STATUS_TO_CODE[found.status] ?? 1,
          actor_usuario_id: 99,
          origen: 'usuario',
          fecha_hora: found.createdAt,
          observacion: 'Ingreso inicial registrado',
        },
      ];
    }

    return [...this.historyByOrder[orderId]];
  }
}

/**
 * Adaptador HTTP real conectado a la API Gateway (`/ordenes`).
 */
export class RealOrderAdapter implements OrderServiceAdapter {
  async getOrders(params?: OrderQueryParamsDto): Promise<WorkOrder[]> {
    const response = params
      ? await apiClient.get<OrderResponseDto[]>('/ordenes', { params })
      : await apiClient.get<OrderResponseDto[]>('/ordenes');
    const mapped = mapOrdersResponseList(response.data);
    return params ? filterOrdersByParams(mapped, params) : mapped;
  }

  async getOrderById(
    id: string | number,
    params?: OrderDetailQueryParamsDto
  ): Promise<WorkOrder> {
    const orderId = String(id);
    const response = params
      ? await apiClient.get<OrderResponseDto>(`/ordenes/${orderId}`, { params })
      : await apiClient.get<OrderResponseDto>(`/ordenes/${orderId}`);
    return mapOrderResponse(response.data);
  }

  async createOrder(data: CreateOrderRequestDto): Promise<WorkOrder> {
    const vehicleId = String(data.vehiculo_id ?? data.vehicle_id ?? '');
    const clientId = String(data.cliente_id ?? data.client_id ?? '');

    const payload = {
      vehiculo_id: vehicleId,
      vehicle_id: vehicleId,
      cliente_id: clientId,
      client_id: clientId,
      description: data.description,
    };

    const response = await apiClient.post<OrderResponseDto>('/ordenes', payload);
    return mapOrderResponse(response.data);
  }

  async updateOrderStatus(
    id: string | number,
    status: WorkOrderStatus,
    observation?: string | null
  ): Promise<WorkOrder> {
    const orderId = String(id);
    const payload = mapOrderStatusUpdateRequest({
      targetStatus: status,
      observation,
    });
    const response = await apiClient.patch<OrderResponseDto>(
      `/ordenes/${orderId}/estado`,
      payload
    );
    return mapOrderResponse(response.data);
  }

  async assignMechanic(
    id: string | number,
    data: AssignMechanicRequestDto
  ): Promise<WorkOrder> {
    const orderId = String(id);
    const numericId = Number(data.mecanico_id);
    const payload = {
      mecanico_id: Number.isNaN(numericId) ? data.mecanico_id : numericId,
      ...(data.observacion !== undefined ? { observacion: data.observacion } : {}),
    };
    const response = await apiClient.put<OrderResponseDto>(
      `/ordenes/${orderId}/mecanico`,
      payload
    );
    return mapOrderResponse(response.data);
  }

  async getOrderHistory(id: string | number): Promise<OrderHistoryEntryDto[]> {
    const orderId = String(id);
    const response = await apiClient.get<OrderHistoryEntryDto[]>(
      `/ordenes/${orderId}/historial`
    );
    return Array.isArray(response.data) ? response.data : [];
  }
}

/**
 * Servicio de Órdenes de Trabajo con soporte intercambiable para adaptador Mock y Real HTTP.
 */
export class OrdersService {
  private adapter: OrderServiceAdapter;
  private readonly mockAdapter: MockOrderAdapter;
  private readonly realAdapter: RealOrderAdapter;

  constructor(customAdapter?: OrderServiceAdapter) {
    this.mockAdapter = new MockOrderAdapter(mockWorkOrders, 0);
    this.realAdapter = new RealOrderAdapter();
    this.adapter =
      customAdapter ?? (USE_MOCKS ? this.mockAdapter : this.realAdapter);
  }

  /**
   * Permite inyectar un adaptador personalizado (útil en pruebas unitarias y de integración).
   */
  setAdapter(adapter: OrderServiceAdapter): void {
    this.adapter = adapter;
  }

  /**
   * Activa el adaptador simulado en memoria.
   */
  useMockAdapter(): MockOrderAdapter {
    this.adapter = this.mockAdapter;
    return this.mockAdapter;
  }

  /**
   * Activa el adaptador HTTP real conectado a `apiClient`.
   */
  useRealAdapter(): RealOrderAdapter {
    this.adapter = this.realAdapter;
    return this.realAdapter;
  }

  /**
   * Restaura el estado inicial de las órdenes simuladas.
   */
  resetMocks(): void {
    this.mockAdapter.resetMocks(mockWorkOrders);
  }

  /**
   * Obtiene la lista de órdenes de trabajo visibles según el rol autenticado.
   * Ruta Gateway: GET /api/ordenes
   */
  async getOrders(params?: OrderQueryParamsDto): Promise<WorkOrder[]> {
    try {
      return await this.adapter.getOrders(params);
    } catch (error: unknown) {
      throw normalizeOrderServiceError(
        error,
        'No fue posible cargar las órdenes de trabajo.'
      );
    }
  }

  /**
   * Obtiene el detalle de una orden de trabajo por su ID.
   * Ruta Gateway: GET /api/ordenes/{orden_id}
   */
  async getOrderById(
    id: string | number,
    params?: OrderDetailQueryParamsDto
  ): Promise<WorkOrder> {
    try {
      return await this.adapter.getOrderById(id, params);
    } catch (error: unknown) {
      throw normalizeOrderServiceError(
        error,
        'No fue posible cargar la orden de trabajo.'
      );
    }
  }

  /**
   * Crea una nueva orden de trabajo.
   * Ruta Gateway: POST /api/ordenes
   */
  async createOrder(data: CreateOrderRequestDto): Promise<WorkOrder> {
    try {
      return await this.adapter.createOrder(data);
    } catch (error: unknown) {
      throw normalizeOrderServiceError(
        error,
        'No fue posible crear la orden de trabajo.'
      );
    }
  }

  /**
   * Actualiza el estado de una orden de trabajo (CambioEstadoSolicitud en MS2).
   * Ruta Gateway: PATCH /api/ordenes/{orden_id}/estado
   */
  async updateOrderStatus(
    id: string | number,
    status: WorkOrderStatus,
    observation?: string | null
  ): Promise<WorkOrder> {
    try {
      return await this.adapter.updateOrderStatus(id, status, observation);
    } catch (error: unknown) {
      throw normalizeOrderServiceError(
        error,
        'No fue posible actualizar el estado de la orden.'
      );
    }
  }

  /**
   * Asigna o reasigna un mecánico responsable a una orden (AsignacionMecanicoActualizar en MS2).
   * Ruta Gateway: PUT /api/ordenes/{orden_id}/mecanico
   */
  async assignMechanic(
    id: string | number,
    data: AssignMechanicRequestDto
  ): Promise<WorkOrder> {
    try {
      return await this.adapter.assignMechanic(id, data);
    } catch (error: unknown) {
      throw normalizeOrderServiceError(
        error,
        'No fue posible asignar el mecánico a la orden.'
      );
    }
  }

  /**
   * Consulta el historial de transiciones de estado de una orden (HistorialEstadoRespuesta[] en MS2).
   * Ruta Gateway: GET /api/ordenes/{orden_id}/historial
   */
  async getOrderHistory(id: string | number): Promise<OrderHistoryEntryDto[]> {
    try {
      return await this.adapter.getOrderHistory(id);
    } catch (error: unknown) {
      throw normalizeOrderServiceError(
        error,
        'No fue posible cargar el historial de la orden.'
      );
    }
  }
}

export const ordersService = new OrdersService();
export { OrdersService as OrderService };