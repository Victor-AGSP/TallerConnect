import type { WorkOrderStatus } from '@/constants/orderStatus';
import type { UserRole } from '@/constants/roles';
import type { BudgetVersionStatus } from './budget.model';

/**
 * Resumen de las órdenes de trabajo visibles para el administrador (`GET /api/ordenes` en MS2).
 * `active` cuenta las órdenes que no están en un estado terminal (`entregado` o `cancelado`).
 * `mechanicsWithActiveOrders` cuenta los mecánicos distintos asignados a órdenes activas.
 */
export interface AdminOrderSummary {
  total: number;
  byStatus: Record<WorkOrderStatus, number>;
  active: number;
  mechanicsWithActiveOrders: number;
}

/**
 * Resumen de los vehículos registrados (`GET /api/vehiculos` en MS2).
 */
export interface AdminVehicleSummary {
  total: number;
}

/**
 * Resumen de los usuarios del sistema (`GET /api/auth/usuarios` en MS1).
 * Un usuario con varios roles se cuenta en cada uno de ellos, por lo que la suma de `byRole`
 * puede ser mayor que `total`.
 */
export interface AdminUserSummary {
  total: number;
  byRole: Record<UserRole, number>;
}

/**
 * Resumen de los presupuestos según el estado de su última versión (`GET /api/presupuestos` en MS3).
 * `total` y `byLatestVersionStatus` se calculan sobre los presupuestos recibidos, no sobre el `total`
 * que informa la página de la API; obtener todas las páginas corresponde al servicio.
 */
export interface AdminBudgetSummary {
  total: number;
  byLatestVersionStatus: Record<BudgetVersionStatus, number>;
}

/**
 * Resumen del inventario según las alertas de stock (`GET /api/inventario/alertas` en MS3).
 * Cada alerta corresponde a un repuesto con stock bajo su umbral efectivo, así que
 * `partsBelowThreshold` es la cantidad de esos repuestos.
 * `generalThreshold` es `null` mientras el umbral general no esté configurado.
 */
export interface AdminInventorySummary {
  partsBelowThreshold: number;
  generalThreshold: number | null;
}

/**
 * Resumen de las solicitudes de cancelación por revisar (`GET /api/ordenes/cancelaciones/pendientes` en MS2).
 */
export interface AdminCancellationSummary {
  pendingCount: number;
}

/**
 * Resumen del límite de órdenes activas por mecánico
 * (`GET /api/ordenes/configuracion/capacidad/mecanicos` en MS2).
 * `maxActiveOrdersPerMechanic` es `null` mientras el límite no esté configurado.
 */
export interface AdminMechanicCapacitySummary {
  maxActiveOrdersPerMechanic: number | null;
  mechanicsOverLimit: number;
}

/**
 * Resumen del cupo diario de ingresos físicos
 * (`GET /api/ordenes/configuracion/capacidad/ingresos-diarios` en MS2).
 * `localDate` es una fecha sin hora (`YYYY-MM-DD`): no se convierte con `new Date()`,
 * porque se interpretaría como medianoche UTC y mostraría el día anterior.
 * `maxDailyIntakes` es `null` mientras el cupo no esté configurado.
 */
export interface AdminDailyIntakeSummary {
  localDate: string;
  maxDailyIntakes: number | null;
  registeredIntakes: number;
  overLimit: boolean;
}

/**
 * Información resumida que se muestra al administrador.
 * El backend no tiene un endpoint de resumen: cada sección proviene de una consulta distinta.
 * Una sección es `null` cuando su información no está disponible, por ejemplo si la consulta falló.
 */
export interface AdminSummary {
  orders: AdminOrderSummary | null;
  vehicles: AdminVehicleSummary | null;
  users: AdminUserSummary | null;
  budgets: AdminBudgetSummary | null;
  inventory: AdminInventorySummary | null;
  cancellations: AdminCancellationSummary | null;
  mechanicCapacity: AdminMechanicCapacitySummary | null;
  dailyIntake: AdminDailyIntakeSummary | null;
}