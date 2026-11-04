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
import { userResponsePayloads } from '@/mocks/payloads/auth.payload';
import { budgetPagePayload } from '@/mocks/payloads/budget.payload';
import {
  cancellationRequestPayloads,
  dailyIntakeCapacityPayloads,
  mechanicCapacityPayloads,
  stockAlertPagePayload,
} from '@/mocks/payloads/notice.payload';
import { orderResponsePayloads } from '@/mocks/payloads/order.payload';
import { vehicleResponsePayloads } from '@/mocks/payloads/vehicle.payload';
import type { AdminSummary } from '@/models/admin.model';

/**
 * Resumen administrativo simulado, derivado de los payloads de los contratos MS1, MS2 y MS3.
 * Representa un momento en que el mecánico de prueba supera el límite de órdenes activas
 * y se superó el cupo diario de ingresos.
 */
export const mockAdminSummary: AdminSummary = buildAdminSummary({
  orders: mapAdminOrderSummary(Object.values(orderResponsePayloads)),
  vehicles: mapAdminVehicleSummary(Object.values(vehicleResponsePayloads)),
  users: mapAdminUserSummary(Object.values(userResponsePayloads)),
  budgets: mapAdminBudgetSummary(budgetPagePayload.presupuestos),
  inventory: mapAdminInventorySummary(stockAlertPagePayload),
  cancellations: mapAdminCancellationSummary(Object.values(cancellationRequestPayloads)),
  mechanicCapacity: mapAdminMechanicCapacitySummary(mechanicCapacityPayloads.sobreLimite),
  dailyIntake: mapAdminDailyIntakeSummary(dailyIntakeCapacityPayloads.cupoExcedido),
});

/**
 * Resumen administrativo simulado con solo órdenes y vehículos disponibles,
 * como cuando fallan las demás consultas. Las secciones restantes quedan en `null`.
 */
export const mockPartialAdminSummary: AdminSummary = buildAdminSummary({
  orders: mockAdminSummary.orders,
  vehicles: mockAdminSummary.vehicles,
});