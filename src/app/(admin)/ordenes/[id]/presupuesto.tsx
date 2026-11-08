import { useCallback } from 'react';
import { useLocalSearchParams } from 'expo-router';

import { OrderBudgetView } from '@/components/orders/OrderBudgetView';
import { budgetsService } from '@/services/budgets.service';

/**
 * Presupuesto de una orden de trabajo para la administración del taller.
 * Consulta GET /api/presupuestos (MS3) mediante BudgetsService.
 * Solo lectura: la decisión corresponde al cliente.
 */
export default function OrdenPresupuestoScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();

  const loadBudget = useCallback(
    (orderId: string) => budgetsService.getBudgetForOrder(orderId),
    [],
  );

  return (
    <OrderBudgetView
      eyebrow="Administración"
      orderId={id}
      loadBudget={loadBudget}
    />
  );
}
