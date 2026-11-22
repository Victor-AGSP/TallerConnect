import { act, cleanup, fireEvent, renderWithProviders, waitFor } from '../test-utils';
import { OrderBudgetView } from '@/components/orders/OrderBudgetView';
import type { BudgetDecisionResult } from '@/models/budget.model';
import { mapBudgetDetailResponse } from '@/mappers/budget.mapper';
import { budgetDetail } from '../test-utils/fixtures/sprint3-budget';

// Todas las decisiones y consultas son funciones locales; ninguna solicitud HTTP.
const budget = mapBudgetDetailResponse(budgetDetail);
afterEach(cleanup);

it('no conserva el resultado de una decisión de otra orden al navegar', async () => {
  const approved = { ...budget, versions: [{ ...budget.versions[0], status: 'aprobada' as const }] };
  const next = { ...budget, id: '6', orderId: '32' };
  const load = jest.fn().mockResolvedValueOnce(budget).mockResolvedValueOnce(approved).mockResolvedValueOnce(next);
  const result: BudgetDecisionResult = { budget: approved, orderEffect: 'en_reparacion', missingParts: [], decisionId: '77' };
  const actions = { decide: jest.fn().mockResolvedValue(result), retryApplication: jest.fn() };
  const view = await renderWithProviders(<OrderBudgetView eyebrow="QA" orderId="31" loadBudget={load} decisionActions={actions} />);
  await waitFor(() => expect(view.getByTestId('order-budget-approve')).toBeTruthy());
  await fireEvent.press(view.getByTestId('order-budget-approve'));
  await fireEvent.press(view.getByTestId('order-budget-confirm'));
  await waitFor(() => expect(view.getByTestId('order-budget-decision-result')).toBeTruthy());
  await waitFor(() => expect(view.queryByTestId('order-budget-decision-form')).toBeNull());
  await view.rerender(<OrderBudgetView eyebrow="QA" orderId="32" loadBudget={load} decisionActions={actions} />);
  await waitFor(() => expect(view.getByTestId('order-budget-6')).toBeTruthy());
  expect(view.queryByTestId('order-budget-decision-result')).toBeNull();
  expect(view.getByTestId('order-budget-decision-form')).toBeTruthy();
  expect(actions.decide).toHaveBeenCalledTimes(1);
});

it('el cambio de orden inicia su lectura aunque la anterior no haya terminado', async () => {
  let resolve!: (value: typeof budget) => void;
  const pending = new Promise<typeof budget>((done) => { resolve = done; });
  const load = jest.fn().mockReturnValueOnce(pending).mockResolvedValueOnce({ ...budget, id: '6', orderId: '32' });
  const view = await renderWithProviders(<OrderBudgetView eyebrow="QA" orderId="31" loadBudget={load} />);
  await view.rerender(<OrderBudgetView eyebrow="QA" orderId="32" loadBudget={load} />);
  await waitFor(() => expect(view.getByTestId('order-budget-6')).toBeTruthy());
  await act(async () => { resolve(budget); });
  expect(view.queryByTestId('order-budget-5')).toBeNull();
  expect(load).toHaveBeenCalledWith('32');
});
