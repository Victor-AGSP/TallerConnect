import { Role, ROLES } from '@/constants/roles';
import { NotificationResponseDto } from '@/dto/notification.dto';
import { BudgetSummary } from '@/models/budget.model';
import {
  NotificationCategory,
  NotificationPriority,
  WorkshopNotification,
} from '@/models/notification.model';
import { WorkOrder } from '@/models/order.model';
import { Part } from '@/models/part.model';
import { notificationResponseDtoSchema } from '@/schemas/notification-dto.schema';

const CATEGORY_ALIASES: Record<string, NotificationCategory> = {
  order_status: 'order_status',
  orden: 'order_status',
  estado_orden: 'order_status',
  budget_approval: 'budget_approval',
  presupuesto: 'budget_approval',
  aprobacion_presupuesto: 'budget_approval',
  low_stock: 'low_stock',
  stock: 'low_stock',
  inventario: 'low_stock',
  evidence_uploaded: 'evidence_uploaded',
  evidencia: 'evidence_uploaded',
  multimedia: 'evidence_uploaded',
  system: 'system',
  sistema: 'system',
};

const PRIORITY_ALIASES: Record<string, NotificationPriority> = {
  low: 'low',
  baja: 'low',
  normal: 'normal',
  media: 'normal',
  high: 'high',
  alta: 'high',
  critical: 'critical',
  critica: 'critical',
};

function resolveCategory(raw?: string): NotificationCategory {
  if (!raw) {
    return 'system';
  }
  const key = raw.trim().toLowerCase();
  return CATEGORY_ALIASES[key] ?? 'system';
}

function resolvePriority(raw?: string): NotificationPriority {
  if (!raw) {
    return 'normal';
  }
  const key = raw.trim().toLowerCase();
  return PRIORITY_ALIASES[key] ?? 'normal';
}

function resolveTargetRole(raw?: string | null): Role | 'all' {
  if (!raw) {
    return 'all';
  }
  const normalized = raw.trim().toLowerCase();
  if (
    normalized === ROLES.CLIENTE ||
    normalized === ROLES.MECANICO ||
    normalized === ROLES.ADMINISTRADOR
  ) {
    return normalized as Role;
  }
  return 'all';
}

/**
 * Transforma un DTO individual de notificación al modelo de dominio `WorkshopNotification`.
 */
export function mapNotificationResponse(
  dto: NotificationResponseDto
): WorkshopNotification {
  const validated = notificationResponseDtoSchema.parse(dto);
  const rawId = validated.notificacion_id ?? validated.id ?? 'not-000';
  const rawTitle = (validated.titulo ?? validated.title ?? '').trim();
  const rawMessage = (validated.mensaje ?? validated.message ?? '').trim();
  const rawCategory = validated.categoria ?? validated.category;
  const rawPriority = validated.prioridad ?? validated.priority;
  const rawRead =
    validated.leida ?? validated.is_read ?? validated.read ?? false;
  const rawCreatedAt =
    validated.creado_en ??
    validated.created_at ??
    '1970-01-01T00:00:00.000Z';
  const rawRole = validated.rol_destino ?? validated.target_role;
  const rawOrderId = validated.orden_id ?? validated.order_id;
  const rawVehicleId = validated.vehiculo_id ?? validated.vehicle_id;
  const rawBudgetId = validated.presupuesto_id ?? validated.budget_id;
  const rawPartId = validated.repuesto_id ?? validated.part_id;

  return {
    id: String(rawId),
    title: rawTitle,
    message: rawMessage,
    category: resolveCategory(rawCategory),
    priority: resolvePriority(rawPriority),
    read: Boolean(rawRead),
    createdAt: rawCreatedAt,
    targetRole: resolveTargetRole(rawRole),
    orderId: rawOrderId != null ? String(rawOrderId) : null,
    vehicleId: rawVehicleId != null ? String(rawVehicleId) : null,
    budgetId: rawBudgetId != null ? String(rawBudgetId) : null,
    partId: rawPartId != null ? String(rawPartId) : null,
  };
}

/**
 * Transforma una lista de DTOs de notificación al modelo de dominio.
 */
export function mapNotificationsResponseList(
  dtos: NotificationResponseDto[]
): WorkshopNotification[] {
  if (!Array.isArray(dtos)) {
    return [];
  }
  return dtos.map(mapNotificationResponse);
}

/**
 * Deriva avisos operativos a partir de órdenes, presupuestos y repuestos
 * cuando el contrato dedicado `/api/notificaciones` aún no está publicado en la Gateway.
 */
export function deriveWorkshopNotificationsFromDomain(input: {
  orders?: WorkOrder[];
  budgets?: BudgetSummary[];
  parts?: Part[];
}): WorkshopNotification[] {
  const derived: WorkshopNotification[] = [];

  for (const budget of input.budgets ?? []) {
    if (
      budget.latestVersionStatus === 'enviada' ||
      budget.latestVersionStatus === 'borrador'
    ) {
      derived.push({
        id: `drv-budget-${budget.id}`,
        title: `Presupuesto pendiente (${budget.id.toUpperCase()})`,
        message: `La orden ${budget.orderId.toUpperCase()} tiene la versión v${budget.latestVersion} (${budget.latestVersionStatus}) por $${budget.latestVersionTotal.toLocaleString('es-CL')}.`,
        category: 'budget_approval',
        priority: 'high',
        read: false,
        createdAt: budget.createdAt || '2026-03-30T10:00:00.000Z',
        targetRole: 'all',
        orderId: budget.orderId,
        vehicleId: null,
        budgetId: budget.id,
        partId: null,
      });
    }
  }

  for (const part of input.parts ?? []) {
    if (part.belowThreshold || part.stock <= 5) {
      derived.push({
        id: `drv-part-${part.id}`,
        title: `Stock crítico: ${part.name}`,
        message: `Quedan ${part.stock} unidades disponibles (${part.providerName}). Se recomienda reposición con proveedor.`,
        category: 'low_stock',
        priority: part.stock <= 2 ? 'critical' : 'high',
        read: false,
        createdAt: '2026-03-30T09:00:00.000Z',
        targetRole: ROLES.ADMINISTRADOR,
        orderId: null,
        vehicleId: null,
        budgetId: null,
        partId: part.id,
      });
    }
  }

  for (const order of input.orders ?? []) {
    if (
      order.status === 'listo_para_entrega' ||
      order.status === 'esperando_aprobacion_presupuesto'
    ) {
      derived.push({
        id: `drv-order-${order.id}`,
        title:
          order.status === 'listo_para_entrega'
            ? `Vehículo listo para entrega (${order.id.toUpperCase()})`
            : `Orden esperando aprobación (${order.id.toUpperCase()})`,
        message: `La orden ${order.id.toUpperCase()} registra estado operativo "${order.status}".`,
        category: 'order_status',
        priority: 'normal',
        read: false,
        createdAt: order.updatedAt,
        targetRole: 'all',
        orderId: order.id,
        vehicleId: order.vehicleId,
        budgetId: null,
        partId: null,
      });
    }
  }

  return derived;
}
