export type BudgetVersionStatus = 'borrador' | 'enviada' | 'aprobada' | 'rechazada';

export type BudgetDecisionValue = 'aprobado' | 'rechazado';

export type BudgetOrderEffect =
  | 'esperando_aprobacion'
  | 'en_reparacion'
  | 'esperando_repuestos'
  | 'cancelado';

/**
 * Ítem de una versión del presupuesto. Los importes se conservan como el
 * texto decimal que entrega el MS3 para no perder precisión.
 */
export interface BudgetItem {
  id: string;
  type: 'repuesto' | 'mano_de_obra';
  description: string;
  quantity: string;
  unitPrice: string;
  subtotal: string;
  partId: string | null;
  partName: string | null;
  supplierName: string | null;
}

/** Decisión del cliente sobre una versión enviada. */
export interface BudgetDecision {
  id: string;
  decision: BudgetDecisionValue;
  clientUserId: string;
  decidedAt: string;
  reason: string | null;
}

export interface BudgetVersion {
  number: number;
  status: BudgetVersionStatus;
  isModification: boolean;
  createdById?: string;
  lockedAt?: string | null;
  createdAt: string;
  sentAt: string | null;
  total: string;
  items: BudgetItem[];
  decision: BudgetDecision | null;
}

/**
 * Presupuesto de una orden de trabajo con sus versiones. El cliente solo
 * recibe las versiones enviadas.
 */
export interface Budget {
  id: string;
  orderId: string;
  createdAt: string;
  latestVersion: number;
  latestStatus: BudgetVersionStatus;
  latestTotal: string;

  /** Versión aprobada vigente; `null` si nunca se aprobó una. */
  currentVersion: number | null;

  versions: BudgetVersion[];
}

export interface MissingPart {
  partId: string;
  name: string;
  required: string;
  available: number;
}

/** Resultado de una decisión del cliente. */
export interface BudgetDecisionResult {
  budget: Budget;

  /** Efecto en la orden; `null` si la decisión no cambia su estado. */
  orderEffect: BudgetOrderEffect | null;

  missingParts: MissingPart[];
  decisionId: string | null;
}

/** Datos que el cliente envía al decidir. */
export interface BudgetDecisionInput {
  decision: BudgetDecisionValue;
  reason?: string;

  /** Obligatorio al rechazar antes de la primera aprobación (cancela el servicio). */
  confirmCancellation?: boolean;
}

/** Tipo compartido con Develop. */
export type BudgetItemType = BudgetItem['type'];

/** Resumen paginado compatible con Develop. */
export interface BudgetSummary {
  id: string;
  orderId: string;
  createdAt: string;
  versionCount: number;
  latestVersion: number;
  latestVersionStatus: BudgetVersionStatus;
  latestVersionTotal: number;
  currentVersion: number | null;
}
