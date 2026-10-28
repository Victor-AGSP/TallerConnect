import type {
  BudgetDecisionResponseDto,
  BudgetDetailResponseDto,
  BudgetItemResponseDto,
  BudgetPageResponseDto,
  BudgetSummaryResponseDto,
  BudgetVersionResponseDto,
} from '@/dto/budget.dto';
import type {
  Budget,
  BudgetDecision,
  BudgetItem,
  BudgetSummary,
  BudgetVersion,
} from '@/models/budget.model';
import type { PaginatedList } from '@/models/pagination.model';

/**
 * Convierte un monto o cantidad recibido como texto decimal (ej. "15000.00") a número.
 * Lanza un error si el valor no representa un número válido.
 */
function parseDecimal(value: string, field: string): number {
  const text = String(value).trim();
  const parsed = Number(text);
  if (text === '' || !Number.isFinite(parsed)) {
    throw new Error(`Valor decimal inválido en ${field}: ${value}`);
  }
  return parsed;
}

/**
 * Mapea un ítem de una versión de presupuesto al modelo BudgetItem.
 */
function mapBudgetItemResponse(dto: BudgetItemResponseDto): BudgetItem {
  return {
    id: String(dto.item_id),
    type: dto.tipo,
    description: dto.descripcion,
    quantity: parseDecimal(dto.cantidad, 'cantidad'),
    unitPrice: parseDecimal(dto.precio_unitario, 'precio_unitario'),
    subtotal: parseDecimal(dto.subtotal, 'subtotal'),
    partId: dto.repuesto_id !== null ? String(dto.repuesto_id) : null,
    partName: dto.repuesto_nombre ?? null,
    providerName: dto.proveedor_nombre ?? null,
  };
}

/**
 * Mapea la decisión del cliente sobre una versión al modelo BudgetDecision.
 */
function mapBudgetDecisionResponse(dto: BudgetDecisionResponseDto): BudgetDecision {
  return {
    id: String(dto.decision_id),
    decision: dto.decision,
    clientUserId: String(dto.cliente_usuario_id),
    decidedAt: dto.fecha_hora,
    reason: dto.motivo,
  };
}

/**
 * Mapea una versión de presupuesto devuelta por la API Gateway al modelo BudgetVersion.
 */
export function mapBudgetVersionResponse(dto: BudgetVersionResponseDto): BudgetVersion {
  return {
    number: dto.numero,
    status: dto.estado,
    isModification: dto.es_modificacion,
    createdById: String(dto.creado_por_id),
    createdAt: dto.creado_en,
    sentAt: dto.enviado_en,
    lockedAt: dto.bloqueada_en,
    total: parseDecimal(dto.total, 'total'),
    items: dto.items.map(mapBudgetItemResponse),
    decision: dto.decision !== null ? mapBudgetDecisionResponse(dto.decision) : null,
  };
}

/**
 * Mapea el resumen de un presupuesto al modelo BudgetSummary.
 */
export function mapBudgetSummaryResponse(dto: BudgetSummaryResponseDto): BudgetSummary {
  return {
    id: String(dto.presupuesto_id),
    orderId: String(dto.orden_id),
    createdAt: dto.creado_en,
    versionCount: dto.cantidad_versiones,
    latestVersion: dto.ultima_version,
    latestVersionStatus: dto.estado_ultima_version,
    latestVersionTotal: parseDecimal(dto.total_ultima_version, 'total_ultima_version'),
    currentVersion: dto.version_vigente,
  };
}

/**
 * Mapea un presupuesto con sus versiones devuelto por la API Gateway al modelo Budget.
 */
export function mapBudgetDetailResponse(dto: BudgetDetailResponseDto): Budget {
  return {
    ...mapBudgetSummaryResponse(dto),
    versions: dto.versiones.map(mapBudgetVersionResponse),
  };
}

/**
 * Mapea una página de presupuestos devuelta por la API Gateway.
 */
export function mapBudgetPageResponse(dto: BudgetPageResponseDto): PaginatedList<BudgetSummary> {
  return {
    items: dto.presupuestos.map(mapBudgetSummaryResponse),
    total: dto.total,
    offset: dto.desde,
    limit: dto.limite,
  };
}
