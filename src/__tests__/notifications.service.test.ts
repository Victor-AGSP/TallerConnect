import { ROLES } from '@/constants/roles';
import {
  deriveWorkshopNotificationsFromDomain,
  mapNotificationResponse,
} from '@/mappers/notification.mapper';
import { apiClient } from '@/services/api/client';
import { HTTP_STATUS } from '@/services/api/types';
import { budgetsService } from '@/services/budgets.service';
import {
  MockNotificationAdapter,
  NotificationsService,
  RealNotificationAdapter,
  ServiceError,
} from '@/services/notifications.service';
import { ordersService } from '@/services/orders.service';
import { partsService } from '@/services/parts.service';

jest.mock('@/services/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  },
}));

describe('NotificationsService & Notification Adapters', () => {
  const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    ordersService.useMockAdapter();
    ordersService.resetMocks();
    budgetsService.useMockAdapter();
    budgetsService.resetMocks();
    partsService.useMockAdapter();
    partsService.resetMocks();
  });

  describe('mapNotificationResponse & deriveWorkshopNotificationsFromDomain', () => {
    it('mapea un DTO de notificación en español e inglés al modelo WorkshopNotification', () => {
      const mapped = mapNotificationResponse({
        notificacion_id: 42,
        titulo: 'Presupuesto aprobado',
        mensaje: 'El cliente aprobó el presupuesto #10.',
        categoria: 'presupuesto',
        prioridad: 'alta',
        leida: false,
        creado_en: '2026-03-30T12:00:00.000Z',
        rol_destino: 'administrador',
        orden_id: 124,
        presupuesto_id: 10,
      });

      expect(mapped).toEqual({
        id: '42',
        title: 'Presupuesto aprobado',
        message: 'El cliente aprobó el presupuesto #10.',
        category: 'budget_approval',
        priority: 'high',
        read: false,
        createdAt: '2026-03-30T12:00:00.000Z',
        targetRole: ROLES.ADMINISTRADOR,
        orderId: '124',
        vehicleId: null,
        budgetId: '10',
        partId: null,
      });
    });

    it('deriva avisos operativos desde órdenes, presupuestos pendientes y repuestos con bajo stock', async () => {
      const [orders, budgets, parts] = await Promise.all([
        ordersService.getOrders(),
        budgetsService.getBudgets(),
        partsService.getParts(),
      ]);

      const derived = deriveWorkshopNotificationsFromDomain({
        orders,
        budgets,
        parts,
      });

      expect(derived.length).toBeGreaterThan(0);
      expect(derived.some((n) => n.category === 'budget_approval')).toBe(true);
      expect(derived.some((n) => n.category === 'low_stock')).toBe(true);
    });
  });

  describe('MockNotificationAdapter', () => {
    it('permite consultar, filtrar por categoría/rol/no leídas y marcar como leídas', async () => {
      const service = new NotificationsService(new MockNotificationAdapter());

      expect(service.getContractStatus()).toBe('mock');

      const all = await service.getNotifications();
      expect(all).toHaveLength(4);

      const unreadCountBefore = await service.getUnreadCount();
      expect(unreadCountBefore).toBe(3);

      const stockAlerts = await service.getNotifications({
        category: 'low_stock',
      });
      expect(stockAlerts).toHaveLength(1);
      expect(stockAlerts[0].id).toBe('not-002');

      const marked = await service.markAsRead('not-001');
      expect(marked.read).toBe(true);

      const unreadCountAfterOne = await service.getUnreadCount();
      expect(unreadCountAfterOne).toBe(2);

      const updatedAll = await service.markAllAsRead();
      expect(updatedAll).toBe(2);
      expect(await service.getUnreadCount()).toBe(0);
    });

    it('lanza ServiceError 404 al intentar marcar como leída una notificación inexistente', async () => {
      const service = new NotificationsService(new MockNotificationAdapter());

      await expect(service.markAsRead('not-999')).rejects.toMatchObject({
        name: 'ServiceError',
        status: HTTP_STATUS.NOT_FOUND,
        domain: 'notifications',
      });
    });
  });

  describe('RealNotificationAdapter (Contrato disponible vs Fallback derivado)', () => {
    it('consume GET /notificaciones, PATCH /notificaciones/{id}/leida y POST /notificaciones/leer-todas cuando el contrato está habilitado', async () => {
      const service = new NotificationsService(
        new RealNotificationAdapter({ contractEnabled: true })
      );

      mockedApiClient.get.mockResolvedValueOnce({
        data: [
          {
            notificacion_id: 101,
            titulo: 'Orden actualizada',
            mensaje: 'La orden OT-00124 pasó a control de calidad.',
            categoria: 'order_status',
            prioridad: 'normal',
            leida: false,
            creado_en: '2026-03-30T15:00:00.000Z',
            rol_destino: 'administrador',
            orden_id: 'ot-00124',
          },
        ],
      } as never);

      const list = await service.getNotifications({
        role: ROLES.ADMINISTRADOR,
      });

      expect(mockedApiClient.get).toHaveBeenCalledWith('/notificaciones', {
        params: { role: ROLES.ADMINISTRADOR },
        skipSessionLogoutOn403: true,
      });
      expect(service.getContractStatus()).toBe('available');
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe('101');

      mockedApiClient.patch.mockResolvedValueOnce({
        data: {
          notificacion_id: 101,
          titulo: 'Orden actualizada',
          mensaje: 'La orden OT-00124 pasó a control de calidad.',
          categoria: 'order_status',
          prioridad: 'normal',
          leida: true,
        },
      } as never);

      const readItem = await service.markAsRead(101);
      expect(mockedApiClient.patch).toHaveBeenCalledWith(
        '/notificaciones/101/leida',
        { leida: true }
      );
      expect(readItem.read).toBe(true);

      mockedApiClient.post.mockResolvedValueOnce({
        data: { actualizadas: 3 },
      } as never);

      const count = await service.markAllAsRead();
      expect(mockedApiClient.post).toHaveBeenCalledWith(
        '/notificaciones/leer-todas',
        {}
      );
      expect(count).toBe(3);
    });

    it('hace fallback elegante a avisos derivados cuando el endpoint /notificaciones devuelve 404 (contrato aún no publicado)', async () => {
      const service = new NotificationsService(
        new RealNotificationAdapter({ contractEnabled: true })
      );

      mockedApiClient.get.mockRejectedValueOnce(
        new ServiceError({
          message: 'Not Found',
          status: HTTP_STATUS.NOT_FOUND,
          code: 'NOT_FOUND',
          domain: 'notifications',
        })
      );

      const list = await service.getNotifications();

      expect(service.getContractStatus()).toBe('unavailable_fallback');
      expect(list.length).toBeGreaterThan(0);

      const firstId = list[0].id;
      const marked = await service.markAsRead(firstId);
      expect(marked.read).toBe(true);
    });
  });
});
