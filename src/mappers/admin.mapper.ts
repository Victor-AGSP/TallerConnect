import { ORDER_STATUS, type WorkOrderStatus } from '@/constants/orderStatus';
import type { UserRole } from '@/constants/roles';
import type { UserResponseDto } from '@/dto/auth.dto';
import type { BudgetSummaryResponseDto } from '@/dto/budget.dto';
import type {
  CancellationRequestResponseDto,
  DailyIntakeCapacityResponseDto,
  MechanicCapacityResponseDto,
  StockAlertPageResponseDto,
} from '@/dto/notice.dto';
import type { OrderResponseDto } from '@/dto/order.dto';
import type { VehicleResponseDto } from '@/dto/vehicle.dto';
import type {
  AdminBudgetSummary,
  AdminCancellationSummary,
  AdminDailyIntakeSummary,
  AdminInventorySummary,
  AdminMechanicCapacitySummary,
  AdminOrderSummary,
  AdminSummary,
  AdminUserSummary,
  AdminVehicleSummary,
} from '@/models/admin.model';
import type { BudgetVersionStatus } from '@/models/budget.model';
import { isUserRole } from './auth.mapper';
import { isPendingCancellationRequest } from './notice.mapper';
import { mapOrderResponse } from './order.mapper';

/**
 * Estados terminales de una orden según el contrato MS2: no admiten más transiciones.
 */
const TERMINAL_ORDER_STATUSES: readonly WorkOrderStatus[] = [
  ORDER_STATUS.ENTREGADO,
  ORDER_STATUS.CANCELADO,
];

/**
 * Mapea las órdenes recibidas al resumen de órdenes del administrador.
 * Cada orden se convierte con `mapOrderResponse`, que rechaza un `estado_codigo` fuera del catálogo.
 */
export function mapAdminOrderSummary(dtos: OrderResponseDto[]): AdminOrderSummary {
  const byStatus: Record<WorkOrderStatus, number> = {
    recibido: 0,
    esperando_diagnostico: 0,
    esperando_aprobacion_presupuesto: 0,
    pausado_por_presupuesto_rechazado: 0,
    control_calidad: 0,
    esperando_repuestos: 0,
    en_reparacion: 0,
    listo_para_entrega: 0,
    entregado: 0,
    cancelado: 0,
  };
  const mechanicsWithActiveOrders = new Set<string>();
  let active = 0;

  for (const order of dtos.map(mapOrderResponse)) {
    byStatus[order.status] += 1;

    if (!TERMINAL_ORDER_STATUSES.includes(order.status)) {
      active += 1;
      if (order.assignedMechanicId !== null) {
        mechanicsWithActiveOrders.add(order.assignedMechanicId);
      }
    }
  }

  return {
    total: dtos.length,
    byStatus,
    active,
    mechanicsWithActiveOrders: mechanicsWithActiveOrders.size,
  };
}

/**
 * Mapea los vehículos recibidos al resumen de vehículos del administrador.
 */
export function mapAdminVehicleSummary(dtos: VehicleResponseDto[]): AdminVehicleSummary {
  return { total: dtos.length };
}

/**
 * Mapea los usuarios recibidos al resumen de usuarios del administrador.
 * Un usuario con varios roles se cuenta una vez en cada uno de ellos.
 * Lanza un error si algún rol no pertenece a la app.
 */
export function mapAdminUserSummary(dtos: UserResponseDto[]): AdminUserSummary {
  const byRole: Record<UserRole, number> = {
    cliente: 0,
    mecanico: 0,
    administrador: 0,
  };

  for (const dto of dtos) {
    for (const role of new Set(dto.roles)) {
      if (!isUserRole(role)) {
        throw new Error(`Rol de usuario desconocido: ${role}`);
      }
      byRole[role] += 1;
    }
  }

  return { total: dtos.length, byRole };
}

/**
 * Mapea los presupuestos recibidos al resumen de presupuestos del administrador.
 * Lanza un error si el estado de la última versión no pertenece al contrato.
 */
export function mapAdminBudgetSummary(dtos: BudgetSummaryResponseDto[]): AdminBudgetSummary {
  const byLatestVersionStatus: Record<BudgetVersionStatus, number> = {
    borrador: 0,
    enviada: 0,
    aprobada: 0,
    rechazada: 0,
  };

  for (const dto of dtos) {
    const status = dto.estado_ultima_version;
    if (!Object.prototype.hasOwnProperty.call(byLatestVersionStatus, status)) {
      throw new Error(`Estado de presupuesto desconocido: ${status}`);
    }
    byLatestVersionStatus[status] += 1;
  }

  return { total: dtos.length, byLatestVersionStatus };
}

/**
 * Mapea las alertas de stock al resumen de inventario del administrador.
 */
export function mapAdminInventorySummary(dto: StockAlertPageResponseDto): AdminInventorySummary {
  return {
    partsBelowThreshold: dto.total,
    generalThreshold: dto.umbral_general,
  };
}

/**
 * Mapea las solicitudes de cancelación al resumen de cancelaciones del administrador.
 * Solo cuenta las solicitudes en estado `pendiente`.
 * Lanza un error si alguna solicitud tiene un estado que no pertenece al contrato.
 */
export function mapAdminCancellationSummary(
  dtos: CancellationRequestResponseDto[],
): AdminCancellationSummary {
  return {
    pendingCount: dtos.filter(isPendingCancellationRequest).length,
  };
}

/**
 * Mapea el límite de órdenes activas por mecánico al resumen de capacidad del administrador.
 */
export function mapAdminMechanicCapacitySummary(
  dto: MechanicCapacityResponseDto,
): AdminMechanicCapacitySummary {
  return {
    maxActiveOrdersPerMechanic: dto.max_ordenes_activas,
    mechanicsOverLimit: dto.mecanicos_sobre_limite.length,
  };
}

/**
 * Mapea el cupo diario de ingresos al resumen del administrador.
 * `jornada_local` se conserva como texto `YYYY-MM-DD`.
 */
export function mapAdminDailyIntakeSummary(
  dto: DailyIntakeCapacityResponseDto,
): AdminDailyIntakeSummary {
  return {
    localDate: dto.jornada_local,
    maxDailyIntakes: dto.max_ingresos_diarios,
    registeredIntakes: dto.ingresos_registrados,
    overLimit: dto.sobre_limite,
  };
}

/**
 * Junta las secciones ya mapeadas en el resumen del administrador.
 * Una sección que no se entrega queda en `null`, que el modelo define como "no disponible".
 */
export function buildAdminSummary(sections: Partial<AdminSummary>): AdminSummary {
  return {
    orders: sections.orders ?? null,
    vehicles: sections.vehicles ?? null,
    users: sections.users ?? null,
    budgets: sections.budgets ?? null,
    inventory: sections.inventory ?? null,
    cancellations: sections.cancellations ?? null,
    mechanicCapacity: sections.mechanicCapacity ?? null,
    dailyIntake: sections.dailyIntake ?? null,
  };
}