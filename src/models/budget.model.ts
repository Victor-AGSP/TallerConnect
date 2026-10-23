/**
 * Estado de una versión de presupuesto.
 */
export type BudgetVersionStatus = 'borrador' | 'enviada' | 'aprobada' | 'rechazada';

/**
 * Tipo de ítem de un presupuesto: un repuesto o un trabajo de mano de obra.
 */
export type BudgetItemType = 'repuesto' | 'mano_de_obra';

/**
 * Decisión del cliente sobre una versión enviada.
 */
export type BudgetDecisionValue = 'aprobado' | 'rechazado';

/**
 * Ítem de una versión de presupuesto. Cantidades y montos se representan como número.
 * Si el ítem es un repuesto, `partId` lo identifica; en mano de obra es `null`.
 */
export interface BudgetItem {
  id: string;
  type: BudgetItemType;
  description: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  partId: string | null;
  partName: string | null;
  providerName: string | null;
}

/**
 * Decisión registrada por el cliente sobre una versión del presupuesto.
 */
export interface BudgetDecision {
  id: string;
  decision: BudgetDecisionValue;
  clientUserId: string;
  decidedAt: string;
  reason: string | null;
}

/**
 * Versión de un presupuesto. Cada corrección o modificación crea una versión nueva
 * y las anteriores se conservan en el historial.
 */
export interface BudgetVersion {
  number: number;
  status: BudgetVersionStatus;
  isModification: boolean;
  createdById: string;
  createdAt: string;
  sentAt: string | null;
  lockedAt: string | null;
  total: number;
  items: BudgetItem[];
  decision: BudgetDecision | null;
}

/**
 * Resumen de un presupuesto, usado en listados.
 * Cada orden de trabajo tiene como máximo un presupuesto.
 */
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

/**
 * Presupuesto completo, con todas sus versiones.
 */
export interface Budget extends BudgetSummary {
  versions: BudgetVersion[];
}