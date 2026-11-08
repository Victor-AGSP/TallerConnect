import { useCallback } from 'react';
import { useLocalSearchParams } from 'expo-router';

import { OrderBudgetView } from '@/components/orders/OrderBudgetView';
import { budgetsService } from '@/services/budgets.service';

/** El cliente dueño de la orden es el único rol que decide el presupuesto. */
const decisionActions = {
  decide: budgetsService.decideBudgetVersion.bind(budgetsService),
  retryApplication: budgetsService.retryDecisionApplication.bind(budgetsService),
};

/**
 * Presupuesto de una orden de trabajo del cliente autenticado.
 * Consulta GET /api/presupuestos (MS3) y permite aprobar o rechazar la
 * versión enviada mediante BudgetsService.
 */
export default function MiOrdenPresupuestoScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();

  const loadBudget = useCallback(
    (orderId: string) => budgetsService.getBudgetForOrder(orderId),
    [],
  );

  return (
    <OrderBudgetView
      eyebrow="Portal del cliente"
      orderId={id}
      loadBudget={loadBudget}
      decisionActions={decisionActions}
    />
  );
}
