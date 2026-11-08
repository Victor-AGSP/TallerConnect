import type { BudgetDecision, BudgetItemType, BudgetSummary, BudgetVersionStatus } from './budget.model';
/** Numeric view for budget administration; photographic order/decision views keep exact decimal strings. */
export interface ManagedBudgetItem {
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
export interface ManagedBudgetVersion {
  number: number;
  status: BudgetVersionStatus;
  isModification: boolean;
  createdById?: string;
  createdAt: string;
  sentAt: string | null;
  lockedAt?: string | null;
  total: number;
  items: ManagedBudgetItem[];
  decision: BudgetDecision | null;
}
export interface ManagedBudget extends BudgetSummary { versions: ManagedBudgetVersion[]; }
