import {
  mapBudgetDetailResponse,
  mapBudgetPageResponse,
} from '@/mappers/budget.mapper';
import {
  budgetDetailPayloads,
  budgetPagePayload,
} from '@/mocks/payloads/budget.payload';
import type { Budget, BudgetSummary } from '@/models/budget.model';

/**
 * Presupuestos completos simulados con sus versiones, derivados de los payloads del contrato MS3.
 */
export const mockBudgets: Budget[] = Object.values(budgetDetailPayloads).map(
  mapBudgetDetailResponse
);

/**
 * Resúmenes de presupuestos simulados para listados paginados.
 */
export const mockBudgetSummaries: BudgetSummary[] =
  mapBudgetPageResponse(budgetPagePayload).items;

