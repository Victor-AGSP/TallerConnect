/**
 * DTO de presupuestos del MS3, tal como los publica su contrato OpenAPI
 * (`/ms3/openapi.json`). La app los consume a través de la API Gateway
 * (`/api/presupuestos`).
 */

export type BudgetVersionStatusDto =
  | 'borrador'
  | 'enviada'
  | 'aprobada'
  | 'rechazada';

export type BudgetDecisionValueDto = 'aprobado' | 'rechazado';

/** Efecto que una decisión o un envío produce en la orden del MS2. */
export type BudgetOrderEffectDto =
  | 'esperando_aprobacion'
  | 'en_reparacion'
  | 'esperando_repuestos'
  | 'cancelado';

/** `ItemSalida`. Los importes llegan como texto decimal. */
export interface BudgetItemResponseDto {
  item_id: number;
  tipo: 'repuesto' | 'mano_de_obra';
  descripcion: string;
  cantidad: string;
  precio_unitario: string;
  subtotal: string;
  repuesto_id: number | null;
  repuesto_nombre?: string | null;
  proveedor_nombre?: string | null;
}

/** `DecisionSalida`. */
export interface BudgetDecisionResponseDto {
  decision_id: number;
  decision: BudgetDecisionValueDto;
  cliente_usuario_id: number;
  fecha_hora: string;
  motivo: string | null;
}

/** `VersionDetalle`. */
export interface BudgetVersionResponseDto {
  numero: number;
  estado: BudgetVersionStatusDto;
  es_modificacion: boolean;
  creado_por_id: number;
  creado_en: string;
  enviado_en: string | null;
  bloqueada_en: string | null;
  total: string;
  items: BudgetItemResponseDto[];
  decision: BudgetDecisionResponseDto | null;
}

/** `PresupuestoResumen`. */
export interface BudgetSummaryResponseDto {
  presupuesto_id: number;
  orden_id: number;
  creado_en: string;
  cantidad_versiones: number;
  ultima_version: number;
  estado_ultima_version: BudgetVersionStatusDto;
  total_ultima_version: string;
  version_vigente: number | null;
}

/** `PresupuestoDetalle` (GET /presupuestos/{presupuesto_id}). */
export interface BudgetDetailResponseDto extends BudgetSummaryResponseDto {
  versiones: BudgetVersionResponseDto[];
}

/** `PaginaPresupuestos` (GET /presupuestos?orden_id=). */
export interface BudgetsPageDto {
  total: number;
  desde: number;
  limite: number;
  presupuestos: BudgetSummaryResponseDto[];
}

/** `DecisionEntrada` (POST /presupuestos/{id}/versiones/{numero}/decision). */
export interface BudgetDecisionRequestDto {
  decision: BudgetDecisionValueDto;
  motivo?: string | null;
  confirmar_cancelacion?: boolean;
}

/** `RepuestoFaltante`. */
export interface MissingPartResponseDto {
  repuesto_id: number;
  nombre: string;
  requerido: string;
  disponible: number;
}

/** `AplicacionDecisionRespuesta`: efecto ya aplicado en la orden del MS2. */
export interface DecisionApplicationResponseDto {
  decision_id: number;
  orden_id: number;
  estado_aplicado: number;
  historial_id: number;
}

/** `ResultadoOperacion`. */
export interface BudgetOperationResultDto {
  presupuesto: BudgetDetailResponseDto;
  efecto_en_orden: BudgetOrderEffectDto | null;
  repuestos_faltantes?: MissingPartResponseDto[];
  decision_id?: number | null;
  aplicacion_en_orden?: DecisionApplicationResponseDto | null;
}

/**
 * `DecisionAplicacionPendiente` (503): la decisión quedó registrada en el
 * MS3, pero no se confirmó su aplicación en la orden del MS2.
 */
export interface DecisionApplicationPendingDto {
  detail: string;
  decision_id: number;
  orden_id: number;
  decision_registrada?: true;
  aplicacion_confirmada?: false;
  reintento: string;
  estado_ms2?: number | null;
  detalle_ms2?: string | null;
}

/** Alias compatible con Develop. */
export type BudgetPageResponseDto = BudgetsPageDto;
