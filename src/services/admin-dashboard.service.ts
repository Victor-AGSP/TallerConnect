import { ORDER_STATUS_LABELS, WorkOrderStatus } from '@/constants/orderStatus';
import { ROLES } from '@/constants/roles';
import type { UserResponseDto } from '@/dto/auth.dto';
import type { BudgetPageResponseDto } from '@/dto/budget.dto';
import type {
  CancellationRequestResponseDto,
  DailyIntakeCapacityResponseDto,
  MechanicCapacityResponseDto,
  StockAlertPageResponseDto,
} from '@/dto/notice.dto';
import type { OrderResponseDto } from '@/dto/order.dto';
import type { VehicleResponseDto } from '@/dto/vehicle.dto';
import {
  buildAdminSummary,
  mapAdminBudgetSummary,
  mapAdminCancellationSummary,
  mapAdminDailyIntakeSummary,
  mapAdminInventorySummary,
  mapAdminMechanicCapacitySummary,
  mapAdminOrderSummary,
  mapAdminUserSummary,
  mapAdminVehicleSummary,
} from '@/mappers/admin.mapper';
import { mockAdminSummary } from '@/mocks/admin.mock';
import type { AdminSummary } from '@/models/admin.model';
import { BudgetSummary } from '@/models/budget.model';
import { WorkshopNotification } from '@/models/notification.model';
import { WorkOrder } from '@/models/order.model';
import { Part } from '@/models/part.model';
import { Provider } from '@/models/provider.model';
import { Vehicle } from '@/models/vehicle.model';
import { apiClient } from '@/services/api/client';
import { budgetsService } from '@/services/budgets.service';
import { notificationsService } from '@/services/notifications.service';
import { ordersService } from '@/services/orders.service';
import { partsService } from '@/services/parts.service';
import { providersService } from '@/services/providers.service';
import { vehiclesService } from '@/services/vehicles.service';

export interface AdminOrderRowItem {
  id: string;
  code: string;
  plate: string;
  status: string;
}

export interface AdminApprovalRowItem {
  id: string;
  order: string;
  vehicle: string;
  amount: string;
}

export interface AdminDashboardData {
  stats: {
    vehiclesInService: string;
    activeOrders: string;
    activeMechanics: string;
    pendingApprovals: string;
  };
  statusSummary: {
    diagnosis: string;
    inRepair: string;
    readyForDelivery: string;
    waitingApproval: string;
  };
  activeOrderRows: AdminOrderRowItem[];
  pendingApprovalRows: AdminApprovalRowItem[];
  systemSummary: {
    registeredVehicles: string;
    completedOrders: string;
    lowStockParts: string;
    registeredProviders: string;
  };
  notifications: WorkshopNotification[];
}

/**
 * Snapshot inicial del panel de administración (renderizado inmediato antes de resolver promesas).
 */
export const INITIAL_ADMIN_DASHBOARD_DATA: AdminDashboardData = {
  stats: {
    vehiclesInService: '12',
    activeOrders: '8',
    activeMechanics: '4',
    pendingApprovals: '3',
  },
  statusSummary: {
    diagnosis: '2',
    inRepair: '4',
    readyForDelivery: '2',
    waitingApproval: '3',
  },
  activeOrderRows: [
    {
      id: 'ot-00124',
      code: 'OT-00124',
      plate: 'AB-CD-12',
      status: 'En reparación',
    },
    {
      id: 'ot-00125',
      code: 'OT-00125',
      plate: 'EF-GH-34',
      status: 'Diagnóstico',
    },
    {
      id: 'ot-00126',
      code: 'OT-00126',
      plate: 'IJ-KL-56',
      status: 'Espera presupuesto',
    },
    {
      id: 'ot-00127',
      code: 'OT-00127',
      plate: 'XY-ZW-90',
      status: 'Listo para entrega',
    },
  ],
  pendingApprovalRows: [
    {
      id: 'bud-10',
      order: 'OT-00126',
      vehicle: 'IJ-KL-56',
      amount: '$185.000',
    },
    {
      id: 'bud-11',
      order: 'OT-00129',
      vehicle: 'MN-OP-78',
      amount: '$240.000',
    },
    {
      id: 'bud-12',
      order: 'OT-00130',
      vehicle: 'QR-ST-12',
      amount: '$95.000',
    },
  ],
  systemSummary: {
    registeredVehicles: '32',
    completedOrders: '87',
    lowStockParts: '2',
    registeredProviders: '3',
  },
  notifications: [],
};

function formatOrderCode(orderId: string): string {
  const upper = orderId.toUpperCase();
  if (upper.startsWith('OT-')) {
    return upper;
  }
  const numeric = upper.replace(/\D/g, '');
  if (numeric) {
    return `OT-${numeric.padStart(5, '0')}`;
  }
  return upper;
}

function formatClpAmount(amount: number): string {
  const rounded = Math.round(Number.isFinite(amount) ? amount : 0);
  const formatted = rounded
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `$${formatted}`;
}

/**
 * Construye el resumen del panel administrador a partir de los modelos de dominio.
 */
export function buildAdminDashboardFromDomain(input: {
  vehicles: Vehicle[];
  orders: WorkOrder[];
  budgets: BudgetSummary[];
  parts: Part[];
  providers: Provider[];
  notifications: WorkshopNotification[];
}): AdminDashboardData {
  const { vehicles, orders, budgets, parts, providers, notifications } = input;

  const vehiclePlateById = new Map<string, string>();
  for (const vehicle of vehicles) {
    vehiclePlateById.set(String(vehicle.id), vehicle.plate);
  }

  const orderById = new Map<string, WorkOrder>();
  for (const order of orders) {
    orderById.set(String(order.id), order);
    const numId = String(order.id).replace(/\D/g, '');
    if (numId) {
      orderById.set(numId, order);
      orderById.set(`ot-${numId.padStart(5, '0')}`, order);
    }
  }

  const activeOrders = orders.filter(
    (o) => o.status !== 'entregado' && o.status !== 'cancelado'
  );
  const completedOrders = orders.filter((o) => o.status === 'entregado');

  const diagnosisOrders = activeOrders.filter(
    (o) => o.status === 'recibido' || o.status === 'esperando_diagnostico'
  );
  const inRepairOrders = activeOrders.filter(
    (o) => o.status === 'en_reparacion' || o.status === 'esperando_repuestos'
  );
  const readyOrders = activeOrders.filter(
    (o) => o.status === 'listo_para_entrega'
  );
  const waitingApprovalOrders = activeOrders.filter(
    (o) => o.status === 'esperando_aprobacion_presupuesto'
  );

  const pendingBudgets = budgets.filter(
    (b) =>
      b.latestVersionStatus === 'enviada' ||
      b.latestVersionStatus === 'borrador'
  );

  const uniqueMechanics = new Set(
    activeOrders
      .map((o) => o.assignedMechanicId)
      .filter((id): id is string => Boolean(id))
  );

  const activeOrderRows: AdminOrderRowItem[] =
    activeOrders.length > 0
      ? activeOrders.slice(0, 6).map((order) => ({
          id: order.id,
          code: formatOrderCode(order.id),
          plate:
            vehiclePlateById.get(String(order.vehicleId)) ??
            `VEH-${order.vehicleId}`,
          status:
            ORDER_STATUS_LABELS[order.status] ?? 'En proceso',
        }))
      : INITIAL_ADMIN_DASHBOARD_DATA.activeOrderRows;

  const pendingApprovalRows: AdminApprovalRowItem[] =
    pendingBudgets.length > 0
      ? pendingBudgets.slice(0, 5).map((budget) => {
          const matchedOrder =
            orderById.get(String(budget.orderId)) ??
            orderById.get(String(budget.orderId).replace(/\D/g, ''));
          const plate = matchedOrder
            ? vehiclePlateById.get(String(matchedOrder.vehicleId)) ??
              `VEH-${matchedOrder.vehicleId}`
            : 'Por asignar';

          return {
            id: budget.id,
            order: formatOrderCode(budget.orderId),
            vehicle: plate,
            amount: formatClpAmount(budget.latestVersionTotal),
          };
        })
      : INITIAL_ADMIN_DASHBOARD_DATA.pendingApprovalRows;

  const lowStockParts = parts.filter((p) => p.belowThreshold || p.stock <= 5);

  const pendingCount = Math.max(
    waitingApprovalOrders.length,
    pendingBudgets.length
  );

  return {
    stats: {
      vehiclesInService: String(
        activeOrders.length || INITIAL_ADMIN_DASHBOARD_DATA.stats.vehiclesInService
      ),
      activeOrders: String(
        activeOrders.length || INITIAL_ADMIN_DASHBOARD_DATA.stats.activeOrders
      ),
      activeMechanics: String(
        uniqueMechanics.size || INITIAL_ADMIN_DASHBOARD_DATA.stats.activeMechanics
      ),
      pendingApprovals: String(
        pendingCount || INITIAL_ADMIN_DASHBOARD_DATA.stats.pendingApprovals
      ),
    },
    statusSummary: {
      diagnosis: String(diagnosisOrders.length),
      inRepair: String(inRepairOrders.length),
      readyForDelivery: String(readyOrders.length),
      waitingApproval: String(pendingCount),
    },
    activeOrderRows,
    pendingApprovalRows,
    systemSummary: {
      registeredVehicles: String(vehicles.length),
      completedOrders: String(completedOrders.length),
      lowStockParts: String(lowStockParts.length),
      registeredProviders: String(providers.length),
    },
    notifications,
  };
}

/**
 * Servicio agregador para el panel del Administrador que integra Vehículos,
 * Órdenes, Presupuestos, Repuestos, Proveedores y Avisos/Notificaciones,
 * incluyendo el resumen oficial `AdminSummary` mapeado desde los contratos MS1, MS2 y MS3.
 */
export class AdminDashboardService {
  private useMockSummary = process.env.EXPO_PUBLIC_USE_MOCK_AUTH === 'true';

  useMockAdapter(): void {
    this.useMockSummary = true;
  }

  useRealAdapter(): void {
    this.useMockSummary = false;
  }

  /**
   * Consulta los 8 endpoints de los contratos MS1, MS2 y MS3 para construir `AdminSummary`:
   * - `GET /ordenes` (MS2)
   * - `GET /vehiculos` (MS2)
   * - `GET /auth/usuarios` (MS1)
   * - `GET /presupuestos` (MS3)
   * - `GET /inventario/alertas` (MS3)
   * - `GET /ordenes/cancelaciones/pendientes` (MS2)
   * - `GET /ordenes/configuracion/capacidad/mecanicos` (MS2)
   * - `GET /ordenes/configuracion/capacidad/ingresos-diarios` (MS2)
   */
  async getAdminSummary(): Promise<AdminSummary> {
    if (this.useMockSummary) {
      return { ...mockAdminSummary };
    }

    const [
      ordersRes,
      vehiclesRes,
      usersRes,
      budgetsRes,
      inventoryRes,
      cancellationsRes,
      mechanicCapRes,
      dailyIntakeRes,
    ] = await Promise.allSettled([
      apiClient.get<OrderResponseDto[]>('/ordenes', {
        skipSessionLogoutOn403: true,
      }),
      apiClient.get<VehicleResponseDto[]>('/vehiculos', {
        skipSessionLogoutOn403: true,
      }),
      apiClient.get<UserResponseDto[]>('/auth/usuarios', {
        skipSessionLogoutOn403: true,
      }),
      apiClient.get<BudgetPageResponseDto>('/presupuestos', {
        skipSessionLogoutOn403: true,
      }),
      apiClient.get<StockAlertPageResponseDto>('/inventario/alertas', {
        skipSessionLogoutOn403: true,
      }),
      apiClient.get<CancellationRequestResponseDto[]>(
        '/ordenes/cancelaciones/pendientes',
        { skipSessionLogoutOn403: true }
      ),
      apiClient.get<MechanicCapacityResponseDto>(
        '/ordenes/configuracion/capacidad/mecanicos',
        { skipSessionLogoutOn403: true }
      ),
      apiClient.get<DailyIntakeCapacityResponseDto>(
        '/ordenes/configuracion/capacidad/ingresos-diarios',
        { skipSessionLogoutOn403: true }
      ),
    ]);

    return buildAdminSummary({
      orders:
        ordersRes.status === 'fulfilled'
          ? mapAdminOrderSummary(ordersRes.value.data)
          : null,
      vehicles:
        vehiclesRes.status === 'fulfilled'
          ? mapAdminVehicleSummary(vehiclesRes.value.data)
          : null,
      users:
        usersRes.status === 'fulfilled'
          ? mapAdminUserSummary(usersRes.value.data)
          : null,
      budgets:
        budgetsRes.status === 'fulfilled'
          ? mapAdminBudgetSummary(budgetsRes.value.data.presupuestos)
          : null,
      inventory:
        inventoryRes.status === 'fulfilled'
          ? mapAdminInventorySummary(inventoryRes.value.data)
          : null,
      cancellations:
        cancellationsRes.status === 'fulfilled'
          ? mapAdminCancellationSummary(cancellationsRes.value.data)
          : null,
      mechanicCapacity:
        mechanicCapRes.status === 'fulfilled'
          ? mapAdminMechanicCapacitySummary(mechanicCapRes.value.data)
          : null,
      dailyIntake:
        dailyIntakeRes.status === 'fulfilled'
          ? mapAdminDailyIntakeSummary(dailyIntakeRes.value.data)
          : null,
    });
  }

  async getDashboardData(): Promise<AdminDashboardData> {
    const [
      vehiclesResult,
      ordersResult,
      budgetsResult,
      partsResult,
      providersResult,
      notificationsResult,
    ] = await Promise.allSettled([
      vehiclesService.getVehicles(),
      ordersService.getOrders(),
      budgetsService.getBudgets(),
      partsService.getParts(),
      providersService.getProviders(),
      notificationsService.getNotifications({ role: ROLES.ADMINISTRADOR }),
    ]);

    const vehicles =
      vehiclesResult.status === 'fulfilled' ? vehiclesResult.value : [];
    const orders =
      ordersResult.status === 'fulfilled' ? ordersResult.value : [];
    const budgets =
      budgetsResult.status === 'fulfilled' ? budgetsResult.value : [];
    const parts =
      partsResult.status === 'fulfilled' ? partsResult.value : [];
    const providers =
      providersResult.status === 'fulfilled' ? providersResult.value : [];
    const notifications =
      notificationsResult.status === 'fulfilled'
        ? notificationsResult.value
        : [];

    if (
      vehicles.length === 0 &&
      orders.length === 0 &&
      budgets.length === 0 &&
      parts.length === 0 &&
      providers.length === 0
    ) {
      return {
        ...INITIAL_ADMIN_DASHBOARD_DATA,
        notifications,
      };
    }

    return buildAdminDashboardFromDomain({
      vehicles,
      orders,
      budgets,
      parts,
      providers,
      notifications,
    });
  }

  async assignMechanicToOrder(
    orderId: string | number,
    mechanicId: string | number,
    observation?: string
  ): Promise<WorkOrder> {
    return ordersService.assignMechanic(orderId, {
      mecanico_id: mechanicId,
      observacion: observation,
    });
  }

  async updateOrderStatus(
    orderId: string | number,
    status: WorkOrderStatus,
    observation?: string
  ): Promise<WorkOrder> {
    return ordersService.updateOrderStatus(orderId, status, observation);
  }

  async markNotificationAsRead(
    notificationId: string | number
  ): Promise<WorkshopNotification> {
    return notificationsService.markAsRead(notificationId);
  }
}

export const adminDashboardService = new AdminDashboardService();
