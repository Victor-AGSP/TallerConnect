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

/**
 * Parámetros de consulta de `GET /api/presupuestos` en el contrato MS3.
 */
export interface BudgetQueryParamsDto {
  orden_id?: number | string | null;
  orderId?: string;
  estado?: BudgetVersionStatus;
  status?: BudgetVersionStatus;
  desde?: number;
  limite?: number;
  skip?: number;
  limit?: number;
}

/**
 * Ítem enviado al crear un presupuesto o al reemplazar los ítems de un borrador (`ItemEntrada` del contrato MS3).
 */
export interface BudgetItemInputDto {
  tipo: BudgetItemType;
  descripcion: string;
  cantidad: number | string;
  precio_unitario?: number | string;
  repuesto_id?: number | string | null;
}

/**
 * Cuerpo para crear el presupuesto de una orden (`PresupuestoCrear` en `POST /api/presupuestos`).
 */
export interface CreateBudgetRequestDto {
  orden_id: number | string;
  items?: BudgetItemInputDto[];
}

/**
 * Cuerpo opcional para crear una nueva versión (`NuevaVersion` en `POST /api/presupuestos/{presupuesto_id}/versiones`).
 */
export interface CreateBudgetVersionRequestDto {
  items?: BudgetItemInputDto[] | null;
  copiar_de?: number | null;
}

/**
 * Cuerpo para reemplazar los ítems de una versión en borrador (`ItemsVersion` en `PUT /api/presupuestos/{presupuesto_id}/versiones/{numero}/items`).
 */
export interface UpdateBudgetVersionItemsRequestDto {
  items: BudgetItemInputDto[];
}

/**
 * Cuerpo para aprobar o rechazar una versión enviada (`DecisionEntrada` en `POST /api/presupuestos/{presupuesto_id}/versiones/{numero}/decision`).
 */
export interface BudgetDecisionRequestDto {
  decision: BudgetDecisionValue;
  motivo?: string | null;
  confirmar_cancelacion?: boolean;
}

/**
 * Efecto producido sobre la orden de trabajo en MS2 tras enviar o decidir un presupuesto.
 */
export type BudgetOperationEffect =
  | 'esperando_aprobacion'
  | 'en_reparacion'
  | 'esperando_repuestos'
  | 'cancelado'
  | null;

/**
 * Repuesto faltante reportado por MS3 (`RepuestoFaltante`).
 */
export interface BudgetMissingPartDto {
  repuesto_id: number;
  nombre: string;
  requerido: string;
  disponible: number;
}

/**
 * Respuesta de enviar o decidir una versión de presupuesto (`ResultadoOperacion` del contrato MS3).
 */
export interface BudgetOperationResultDto {
  presupuesto: BudgetDetailResponseDto;
  efecto_en_orden: BudgetOperationEffect;
  repuestos_faltantes?: BudgetMissingPartDto[];
  repuestos_reservados?: Record<string, number>;
  decision_id?: number | null;
  aplicacion_en_orden?: Record<string, unknown> | null;
}
