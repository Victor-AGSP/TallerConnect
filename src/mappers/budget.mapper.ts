import type {
  BudgetDecisionResponseDto,
  BudgetDetailResponseDto,
  BudgetItemResponseDto,
  BudgetOperationResultDto,
  BudgetVersionResponseDto,
  MissingPartResponseDto,
} from '@/dto/budget.dto';
import type {
  Budget,
  BudgetDecision,
  BudgetDecisionResult,
  BudgetItem,
  BudgetOrderEffect,
  BudgetVersion,
  BudgetVersionStatus,
  MissingPart,
} from '@/models/budget.model';

import type {
  BudgetPageResponseDto,
  BudgetSummaryResponseDto,
} from '@/dto/budget.dto';

import type { BudgetSummary } from '@/models/budget.model';
import type { PaginatedList } from '@/models/pagination.model';

/** Mensaje para respuestas que no cumplen el contrato del MS3. */
export const INVALID_BUDGET_RESPONSE =
  'La respuesta del servicio de presupuestos no es válida.';

const VERSION_STATUSES: readonly BudgetVersionStatus[] = [
  'borrador',
  'enviada',
  'aprobada',
  'rechazada',
];

const ORDER_EFFECTS: readonly BudgetOrderEffect[] = [
  'esperando_aprobacion',
  'en_reparacion',
  'esperando_repuestos',
  'cancelado',
];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function requireInteger(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new Error(INVALID_BUDGET_RESPONSE);
  }
  return value;
}

function requireArray(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error(INVALID_BUDGET_RESPONSE);
  return value;
}

/** Un estado desconocido no se interpreta: se rechaza la respuesta. */
function requireVersionStatus(value: unknown): BudgetVersionStatus {
  if (!VERSION_STATUSES.includes(value as BudgetVersionStatus)) {
    throw new Error(INVALID_BUDGET_RESPONSE);
  }
  return value as BudgetVersionStatus;
}

function toText(value: unknown): string {
  return typeof value === 'string' ? value : value != null ? String(value) : '';
}

function toIdOrNull(value: unknown): string | null {
  return typeof value === 'number' ? String(value) : null;
}

export function mapBudgetItemResponse(dto: BudgetItemResponseDto): BudgetItem {
  if (!isObject(dto)) throw new Error(INVALID_BUDGET_RESPONSE);

  return {
    id: String(requireInteger(dto.item_id)),
    type: dto.tipo === 'repuesto' ? 'repuesto' : 'mano_de_obra',
    description: toText(dto.descripcion),
    quantity: toText(dto.cantidad),
    unitPrice: toText(dto.precio_unitario),
    subtotal: toText(dto.subtotal),
    partId: toIdOrNull(dto.repuesto_id),
    partName: dto.repuesto_nombre ?? null,
    supplierName: dto.proveedor_nombre ?? null,
  };
}

export function mapBudgetDecisionResponse(
  dto: BudgetDecisionResponseDto,
): BudgetDecision {
  if (!isObject(dto)) throw new Error(INVALID_BUDGET_RESPONSE);
  if (dto.decision !== 'aprobado' && dto.decision !== 'rechazado') {
    throw new Error(INVALID_BUDGET_RESPONSE);
  }

  return {
    id: String(requireInteger(dto.decision_id)),
    decision: dto.decision,
    clientUserId: toText(dto.cliente_usuario_id),
    decidedAt: toText(dto.fecha_hora),
    reason: dto.motivo ?? null,
  };
}

export function mapBudgetVersionResponse(
  dto: BudgetVersionResponseDto,
): BudgetVersion {
  if (!isObject(dto)) throw new Error(INVALID_BUDGET_RESPONSE);

  return {
    number: requireInteger(dto.numero),
    status: requireVersionStatus(dto.estado),
    isModification: dto.es_modificacion === true,
    createdById: String(requireInteger(dto.creado_por_id)),
    lockedAt: dto.bloqueada_en ?? null,
    createdAt: toText(dto.creado_en),
    sentAt: dto.enviado_en ?? null,
    total: toText(dto.total),
    items: requireArray(dto.items).map((item) =>
      mapBudgetItemResponse(item as BudgetItemResponseDto),
    ),
    decision: dto.decision
      ? mapBudgetDecisionResponse(dto.decision)
      : null,
  };
}

/**
 * Mapea un `PresupuestoDetalle`. Las versiones se ordenan por número para
 * no depender del orden de la respuesta.
 */
export function mapBudgetDetailResponse(dto: BudgetDetailResponseDto): Budget {
  if (!isObject(dto)) throw new Error(INVALID_BUDGET_RESPONSE);

  const versions = requireArray(dto.versiones)
    .map((version) => mapBudgetVersionResponse(version as BudgetVersionResponseDto))
    .sort((a, b) => a.number - b.number);

  return {
    id: String(requireInteger(dto.presupuesto_id)),
    orderId: String(requireInteger(dto.orden_id)),
    createdAt: toText(dto.creado_en),
    latestVersion: requireInteger(dto.ultima_version),
    latestStatus: requireVersionStatus(dto.estado_ultima_version),
    latestTotal: toText(dto.total_ultima_version),
    currentVersion:
      typeof dto.version_vigente === 'number' ? dto.version_vigente : null,
    versions,
  };
}

function mapMissingPart(dto: MissingPartResponseDto): MissingPart {
  if (!isObject(dto)) throw new Error(INVALID_BUDGET_RESPONSE);

  return {
    partId: String(requireInteger(dto.repuesto_id)),
    name: toText(dto.nombre),
    required: toText(dto.requerido),
    available: typeof dto.disponible === 'number' ? dto.disponible : 0,
  };
}

/**
 * Mapea un `ResultadoOperacion` de una decisión.
 */
export function mapBudgetOperationResult(
  dto: BudgetOperationResultDto,
): BudgetDecisionResult {
  if (!isObject(dto)) throw new Error(INVALID_BUDGET_RESPONSE);

  const effect = dto.efecto_en_orden;

  return {
    budget: mapBudgetDetailResponse(dto.presupuesto),
    orderEffect: ORDER_EFFECTS.includes(effect as BudgetOrderEffect)
      ? (effect as BudgetOrderEffect)
      : null,
    missingParts: (dto.repuestos_faltantes ?? []).map(mapMissingPart),
    decisionId: toIdOrNull(dto.decision_id),
  };
}


/**
 * Convierte un resumen del backend al modelo paginado.
 */
function mapBudgetSummaryResponse(
  dto: BudgetSummaryResponseDto,
): BudgetSummary {
  if (!isObject(dto)) {
    throw new Error(INVALID_BUDGET_RESPONSE);
  }

  const decimal = dto.total_ultima_version;

  if (
    typeof decimal !== 'string' ||
    !/^\d+(\.\d+)?$/.test(decimal)
  ) {
    throw new Error(INVALID_BUDGET_RESPONSE);
  }

  const amount = Number(decimal);

  if (!Number.isFinite(amount)) {
    throw new Error(INVALID_BUDGET_RESPONSE);
  }

  return {
    id: String(requireInteger(dto.presupuesto_id)),
    orderId: String(requireInteger(dto.orden_id)),
    createdAt: toText(dto.creado_en),
    versionCount: requireInteger(dto.cantidad_versiones),
    latestVersion: requireInteger(dto.ultima_version),
    latestVersionStatus: requireVersionStatus(dto.estado_ultima_version),
    latestVersionTotal: amount,
    currentVersion:
      dto.version_vigente === null
        ? null
        : requireInteger(dto.version_vigente),
  };
}

/**
 * Mapea páginas de presupuestos de Develop.
 */
export function mapBudgetPageResponse(
  dto: BudgetPageResponseDto,
): PaginatedList<BudgetSummary> {
  if (!isObject(dto)) {
    throw new Error(INVALID_BUDGET_RESPONSE);
  }

  return {
    items: requireArray(dto.presupuestos).map((item) =>
      mapBudgetSummaryResponse(
        item as BudgetSummaryResponseDto,
      ),
    ),
    total: requireInteger(dto.total),
    offset: requireInteger(dto.desde),
    limit: requireInteger(dto.limite),
  };
}
