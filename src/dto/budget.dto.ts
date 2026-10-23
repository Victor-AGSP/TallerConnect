import type {
  BudgetDecisionValue,
  BudgetItemType,
  BudgetVersionStatus,
} from '@/models/budget.model';

/**
 * Ítem de una versión de presupuesto (`ItemSalida` del contrato MS3).
 * Cantidad y montos llegan como texto decimal.
 */
export interface BudgetItemResponseDto {
  item_id: number;
  tipo: BudgetItemType;
  descripcion: string;
  cantidad: string;
  precio_unitario: string;
  subtotal: string;
  repuesto_id: number | null;
  repuesto_nombre?: string | null;
  proveedor_nombre?: string | null;
}

/**
 * Decisión del cliente sobre una versión (`DecisionSalida` del contrato MS3).
 */
export interface BudgetDecisionResponseDto {
  decision_id: number;
  decision: BudgetDecisionValue;
  cliente_usuario_id: number;
  fecha_hora: string;
  motivo: string | null;
}

/**
 * Versión de un presupuesto (`VersionDetalle` del contrato MS3).
 * Respuesta de GET /api/presupuestos/{presupuesto_id}/versiones/{numero}.
 */
export interface BudgetVersionResponseDto {
  numero: number;
  estado: BudgetVersionStatus;
  es_modificacion: boolean;
  creado_por_id: number;
  creado_en: string;
  enviado_en: string | null;
  bloqueada_en: string | null;
  total: string;
  items: BudgetItemResponseDto[];
  decision: BudgetDecisionResponseDto | null;
}

/**
 * Presupuesto resumido (`PresupuestoResumen` del contrato MS3).
 */
export interface BudgetSummaryResponseDto {
  presupuesto_id: number;
  orden_id: number;
  creado_en: string;
  cantidad_versiones: number;
  ultima_version: number;
  estado_ultima_version: BudgetVersionStatus;
  total_ultima_version: string;
  version_vigente: number | null;
}

/**
 * Presupuesto con sus versiones (`PresupuestoDetalle` del contrato MS3).
 * Respuesta de GET /api/presupuestos/{presupuesto_id}.
 */
export interface BudgetDetailResponseDto extends BudgetSummaryResponseDto {
  versiones: BudgetVersionResponseDto[];
}

/**
 * Página de presupuestos (`PaginaPresupuestos` del contrato MS3).
 * Respuesta de GET /api/presupuestos.
 */
export interface BudgetPageResponseDto {
  total: number;
  desde: number;
  limite: number;
  presupuestos: BudgetSummaryResponseDto[];
}