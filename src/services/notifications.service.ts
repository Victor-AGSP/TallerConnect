import { ENV } from '@/config/env';
import {
  MarkNotificationReadResponseDto,
  NotificationQueryParamsDto,
  NotificationResponseDto,
} from '@/dto/notification.dto';
import {
  deriveWorkshopNotificationsFromDomain,
  mapNotificationResponse,
  mapNotificationsResponseList,
} from '@/mappers/notification.mapper';
import { mockNotifications } from '@/mocks/notifications.mock';
import {
  NotificationContractStatus,
  WorkshopNotification,
} from '@/models/notification.model';
import { apiClient } from '@/services/api/client';
import { HTTP_STATUS, type ApiRequestConfig } from '@/services/api/types';
import { budgetsService } from '@/services/budgets.service';
import { ordersService } from '@/services/orders.service';
import { partsService } from '@/services/parts.service';
import {
  ServiceError,
  normalizeNotificationServiceError,
} from '@/services/service-error';

export { ServiceError, normalizeNotificationServiceError };

const USE_MOCKS = process.env.EXPO_PUBLIC_USE_MOCK_AUTH === 'true';

/**
 * Filtra y pagina localmente una lista de notificaciones según NotificationQueryParamsDto.
 */
export function filterNotificationsByParams(
  notifications: WorkshopNotification[],
  params?: NotificationQueryParamsDto
): WorkshopNotification[] {
  if (!params) {
    return [...notifications];
  }

  let filtered = [...notifications];

  const categoryFilter = params.categoria ?? params.category;
  if (categoryFilter) {
    filtered = filtered.filter((n) => n.category === categoryFilter);
  }

  const unreadOnly = params.solo_no_leidas ?? params.unreadOnly;
  if (unreadOnly === true) {
    filtered = filtered.filter((n) => !n.read);
  }

  const roleFilter = params.rol ?? params.role;
  if (roleFilter && roleFilter !== 'all') {
    filtered = filtered.filter(
      (n) => n.targetRole === 'all' || n.targetRole === roleFilter
    );
  }

  const orderFilter =
    params.orden_id != null
      ? String(params.orden_id)
      : params.orderId
      ? String(params.orderId)
      : undefined;
  if (orderFilter) {
    filtered = filtered.filter((n) => n.orderId === orderFilter);
  }

  const start = params.skip && params.skip > 0 ? params.skip : 0;
  const end =
    params.limit && params.limit > 0 ? start + params.limit : undefined;

  return filtered.slice(start, end);
}

/**
 * Contrato común para los adaptadores (Mock y Real HTTP/Fallback) de Avisos/Notificaciones.
 */
export interface NotificationServiceAdapter {
  getNotifications(
    params?: NotificationQueryParamsDto
  ): Promise<WorkshopNotification[]>;
  getUnreadCount(params?: NotificationQueryParamsDto): Promise<number>;
  markAsRead(id: string | number): Promise<WorkshopNotification>;
  markAllAsRead(): Promise<number>;
  getContractStatus(): NotificationContractStatus;
  resetMocks?(): void;
}

/**
 * Adaptador simulado (Mock) en memoria para avisos y notificaciones.
 */
export class MockNotificationAdapter implements NotificationServiceAdapter {
  private notifications: WorkshopNotification[];
  private readonly delayMs: number;

  constructor(
    initialNotifications: WorkshopNotification[] = mockNotifications,
    delayMs = 0
  ) {
    this.notifications = initialNotifications.map((n) => ({ ...n }));
    this.delayMs = delayMs;
  }

  private async simulateDelay(): Promise<void> {
    if (this.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    }
  }

  resetMocks(
    initialNotifications: WorkshopNotification[] = mockNotifications
  ): void {
    this.notifications = initialNotifications.map((n) => ({ ...n }));
  }

  getContractStatus(): NotificationContractStatus {
    return 'mock';
  }

  async getNotifications(
    params?: NotificationQueryParamsDto
  ): Promise<WorkshopNotification[]> {
    await this.simulateDelay();
    return filterNotificationsByParams(this.notifications, params);
  }

  async getUnreadCount(params?: NotificationQueryParamsDto): Promise<number> {
    await this.simulateDelay();
    const list = filterNotificationsByParams(this.notifications, {
      ...params,
      unreadOnly: true,
    });
    return list.length;
  }

  async markAsRead(id: string | number): Promise<WorkshopNotification> {
    await this.simulateDelay();
    const targetId = String(id);
    const index = this.notifications.findIndex((n) => n.id === targetId);
    if (index === -1) {
      throw new ServiceError({
        message: 'El aviso o notificación solicitado no existe.',
        status: HTTP_STATUS.NOT_FOUND,
        code: 'NOTIFICATION_NOT_FOUND',
        domain: 'notifications',
      });
    }

    const updated: WorkshopNotification = {
      ...this.notifications[index],
      read: true,
    };
    this.notifications[index] = updated;
    return { ...updated };
  }

  async markAllAsRead(): Promise<number> {
    await this.simulateDelay();
    let count = 0;
    this.notifications = this.notifications.map((item) => {
      if (!item.read) {
        count += 1;
        return { ...item, read: true };
      }
      return item;
    });
    return count;
  }
}

export interface RealNotificationAdapterOptions {
  contractEnabled?: boolean;
}

/**
 * Adaptador HTTP real conectado a `/notificaciones` si el contrato está disponible,
 * con degradación elegante (derivación operativa desde órdenes, presupuestos y repuestos)
 * cuando el endpoint aún no está publicado en la API Gateway (`404` / `501` / flag deshabilitado).
 */
export class RealNotificationAdapter implements NotificationServiceAdapter {
  private contractEnabled: boolean;
  private contractStatus: NotificationContractStatus;
  private readFallbackIds: Set<string>;

  constructor(options?: RealNotificationAdapterOptions) {
    this.contractEnabled =
      options?.contractEnabled ?? ENV.ENABLE_NOTIFICATIONS_API;
    this.contractStatus = this.contractEnabled
      ? 'available'
      : 'unavailable_fallback';
    this.readFallbackIds = new Set<string>();
  }

  setContractEnabled(enabled: boolean): void {
    this.contractEnabled = enabled;
    this.contractStatus = enabled ? 'available' : 'unavailable_fallback';
  }

  getContractStatus(): NotificationContractStatus {
    return this.contractStatus;
  }

  private isContractUnavailableStatus(status: number | null): boolean {
    return (
      status === HTTP_STATUS.NOT_FOUND ||
      status === 501 ||
      status === HTTP_STATUS.BAD_GATEWAY ||
      status === HTTP_STATUS.SERVICE_UNAVAILABLE
    );
  }

  private async buildDerivedFallbackNotifications(
    params?: NotificationQueryParamsDto
  ): Promise<WorkshopNotification[]> {
    this.contractStatus = 'unavailable_fallback';
    try {
      const [orders, budgets, parts] = await Promise.all([
        ordersService.getOrders().catch(() => []),
        budgetsService.getBudgets().catch(() => []),
        partsService.getParts().catch(() => []),
      ]);

      const derived = deriveWorkshopNotificationsFromDomain({
        orders,
        budgets,
        parts,
      }).map((item) => ({
        ...item,
        read: item.read || this.readFallbackIds.has(item.id),
      }));

      const baseList =
        derived.length > 0
          ? derived
          : mockNotifications.map((item) => ({
              ...item,
              read: item.read || this.readFallbackIds.has(item.id),
            }));

      return filterNotificationsByParams(baseList, params);
    } catch {
      return filterNotificationsByParams(
        mockNotifications.map((item) => ({
          ...item,
          read: item.read || this.readFallbackIds.has(item.id),
        })),
        params
      );
    }
  }

  async getNotifications(
    params?: NotificationQueryParamsDto
  ): Promise<WorkshopNotification[]> {
    if (!this.contractEnabled) {
      return this.buildDerivedFallbackNotifications(params);
    }

    try {
      const response = params
        ? await apiClient.get<NotificationResponseDto[]>(
            ENV.ROUTES.NOTIFICATIONS,
            ({ params, skipSessionLogoutOn403: true } as ApiRequestConfig)
          )
        : await apiClient.get<NotificationResponseDto[]>(
            ENV.ROUTES.NOTIFICATIONS,
            ({ skipSessionLogoutOn403: true } as ApiRequestConfig)
          );

      this.contractStatus = 'available';
      const mapped = mapNotificationsResponseList(response.data);
      return params ? filterNotificationsByParams(mapped, params) : mapped;
    } catch (error: unknown) {
      const status =
        typeof error === 'object' &&
        error !== null &&
        'status' in error &&
        typeof (error as { status: unknown }).status === 'number'
          ? (error as { status: number }).status
          : null;

      if (this.isContractUnavailableStatus(status)) {
        return this.buildDerivedFallbackNotifications(params);
      }

      throw error;
    }
  }

  async getUnreadCount(params?: NotificationQueryParamsDto): Promise<number> {
    const notifications = await this.getNotifications({
      ...params,
      unreadOnly: true,
    });
    return notifications.length;
  }

  async markAsRead(id: string | number): Promise<WorkshopNotification> {
    const targetId = String(id);

    if (!this.contractEnabled || this.contractStatus === 'unavailable_fallback') {
      this.readFallbackIds.add(targetId);
      const all = await this.buildDerivedFallbackNotifications();
      const found = all.find((item) => item.id === targetId);
      if (!found) {
        throw new ServiceError({
          message: 'El aviso o notificación solicitado no existe.',
          status: HTTP_STATUS.NOT_FOUND,
          code: 'NOTIFICATION_NOT_FOUND',
          domain: 'notifications',
        });
      }
      return { ...found, read: true };
    }

    const response = await apiClient.patch<NotificationResponseDto>(
      `${ENV.ROUTES.NOTIFICATIONS}/${targetId}/leida`,
      { leida: true }
    );
    return mapNotificationResponse(response.data);
  }

  async markAllAsRead(): Promise<number> {
    if (!this.contractEnabled || this.contractStatus === 'unavailable_fallback') {
      const unread = await this.buildDerivedFallbackNotifications({
        unreadOnly: true,
      });
      for (const item of unread) {
        this.readFallbackIds.add(item.id);
      }
      return unread.length;
    }

    const response = await apiClient.post<MarkNotificationReadResponseDto>(
      `${ENV.ROUTES.NOTIFICATIONS}/leer-todas`,
      {}
    );
    return typeof response.data?.actualizadas === 'number'
      ? response.data.actualizadas
      : 0;
  }
}

/**
 * Servicio de Avisos y Notificaciones con soporte para contrato dedicado (`/api/notificaciones`),
 * derivación operativa automática cuando el contrato aún no está publicado y modo Mock.
 */
export class NotificationsService {
  private adapter: NotificationServiceAdapter;
  private readonly mockAdapter: MockNotificationAdapter;
  private readonly realAdapter: RealNotificationAdapter;

  constructor(customAdapter?: NotificationServiceAdapter) {
    this.mockAdapter = new MockNotificationAdapter(mockNotifications, 0);
    this.realAdapter = new RealNotificationAdapter();
    this.adapter =
      customAdapter ?? (USE_MOCKS ? this.mockAdapter : this.realAdapter);
  }

  setAdapter(adapter: NotificationServiceAdapter): void {
    this.adapter = adapter;
  }

  useMockAdapter(): MockNotificationAdapter {
    this.adapter = this.mockAdapter;
    return this.mockAdapter;
  }

  useRealAdapter(
    options?: RealNotificationAdapterOptions
  ): RealNotificationAdapter {
    if (options?.contractEnabled !== undefined) {
      this.realAdapter.setContractEnabled(options.contractEnabled);
    }
    this.adapter = this.realAdapter;
    return this.realAdapter;
  }

  resetMocks(): void {
    this.mockAdapter.resetMocks(mockNotifications);
  }

  getContractStatus(): NotificationContractStatus {
    return this.adapter.getContractStatus();
  }

  /**
   * Obtiene la lista de avisos/notificaciones del taller.
   * Si el contrato `/api/notificaciones` está disponible lo consume; de lo contrario
   * deriva avisos operativos desde órdenes, presupuestos y repuestos.
   */
  async getNotifications(
    params?: NotificationQueryParamsDto
  ): Promise<WorkshopNotification[]> {
    try {
      return await this.adapter.getNotifications(params);
    } catch (error: unknown) {
      throw normalizeNotificationServiceError(
        error,
        'No fue posible consultar los avisos y notificaciones.'
      );
    }
  }

  /**
   * Obtiene el total de avisos no leídos para el usuario o rol actual.
   */
  async getUnreadCount(params?: NotificationQueryParamsDto): Promise<number> {
    try {
      return await this.adapter.getUnreadCount(params);
    } catch (error: unknown) {
      throw normalizeNotificationServiceError(
        error,
        'No fue posible obtener el conteo de avisos pendientes.'
      );
    }
  }

  /**
   * Marca un aviso/notificación individual como leído.
   */
  async markAsRead(id: string | number): Promise<WorkshopNotification> {
    try {
      return await this.adapter.markAsRead(id);
    } catch (error: unknown) {
      throw normalizeNotificationServiceError(
        error,
        'No fue posible marcar el aviso como leído.'
      );
    }
  }

  /**
   * Marca todos los avisos pendientes como leídos.
   */
  async markAllAsRead(): Promise<number> {
    try {
      return await this.adapter.markAllAsRead();
    } catch (error: unknown) {
      throw normalizeNotificationServiceError(
        error,
        'No fue posible marcar los avisos como leídos.'
      );
    }
  }
}

export const notificationsService = new NotificationsService();
export { NotificationsService as NotificationService };
