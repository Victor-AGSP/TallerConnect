import { cleanup, fireEvent, renderWithProviders, waitFor } from '../test-utils';
import { OrderBudgetView } from '@/components/orders/OrderBudgetView';
import { apiClient } from '@/services/api/client';
import { budgetsService, RealBudgetAdapter } from '@/services/budgets.service';
import { budgetDetail, budgetPage } from './fixtures/sprint3-budget';

jest.mock('@/services/api/client', () => ({ apiClient: { get: jest.fn() } }));
const get = jest.mocked(apiClient.get);
const load = (id: string) => budgetsService.getBudgetForOrder(id);
const managed = new RealBudgetAdapter();
beforeEach(() => jest.resetAllMocks());
afterEach(cleanup);

describe.each([
  ['vista Cliente', load],
  ['adaptador de administración', (id: string) => managed.getBudgetByOrderId(id)],
] as const)('%s: integridad de relación', (_name, read) => {
  it('no selecciona el único presupuesto si es de otra orden', async () => {
    get.mockResolvedValueOnce({ data: budgetPage({ ...budgetDetail, orden_id: 32 }) });
    get.mockResolvedValueOnce({ data: { ...budgetDetail, orden_id: 32 } });
    expect(await read('31')).toBeNull();
    expect(get).toHaveBeenCalledTimes(1);
  });

  it.each([
    { ...budgetDetail, orden_id: 32 },
    { ...budgetDetail, presupuesto_id: 6 },
  ])('rechaza detalle que no coincide con orden/presupuesto solicitado: %j', async (detail) => {
    get.mockResolvedValueOnce({ data: budgetPage() });
    get.mockResolvedValueOnce({ data: detail });
    await expect(read('31')).rejects.toThrow('no corresponde');
  });
});

it('refresh y reapertura hacen nuevas lecturas y sustituyen los datos sin caché persistente', async () => {
  let detail = budgetDetail;
  get.mockImplementation(async (url) => ({ data: url === '/presupuestos' ? budgetPage(detail) : detail }));
  const view = await renderWithProviders(<OrderBudgetView eyebrow="Cliente" orderId="31" loadBudget={load} />);
  await waitFor(() => expect(view.getByTestId('order-budget-5')).toBeTruthy());
  expect(get).toHaveBeenCalledTimes(2);
  detail = { ...budgetDetail, total_ultima_version: '140000.00', versiones: [{ ...budgetDetail.versiones[0], total: '140000.00' }] };
  await fireEvent.press(view.getByTestId('order-budget-refresh'));
  await waitFor(() => expect(view.getByLabelText('Total del presupuesto: $140.000')).toBeTruthy());
  expect(get).toHaveBeenCalledTimes(4);
  await view.unmount();
  const reopened = await renderWithProviders(<OrderBudgetView eyebrow="Cliente" orderId="31" loadBudget={load} />);
  await waitFor(() => expect(reopened.getByLabelText('Total del presupuesto: $140.000')).toBeTruthy());
  expect(get).toHaveBeenCalledTimes(6);
  expect(get.mock.calls.filter(([url]) => url === '/presupuestos')).toHaveLength(3);
  expect(get).toHaveBeenCalledWith('/presupuestos', { params: { orden_id: 31 } });
});

it('el refresh fallido muestra error, retira datos y permite volver a consultar', async () => {
  get.mockResolvedValueOnce({ data: budgetPage() }).mockResolvedValueOnce({ data: budgetDetail });
  const view = await renderWithProviders(<OrderBudgetView eyebrow="Cliente" orderId="31" loadBudget={load} />);
  await waitFor(() => expect(view.getByTestId('order-budget-5')).toBeTruthy());
  get.mockRejectedValueOnce(new Error('Red QA desconectada'));
  await fireEvent.press(view.getByTestId('order-budget-refresh'));
  await waitFor(() => expect(view.getByTestId('order-budget-error')).toBeTruthy());
  expect(view.queryByTestId('order-budget-5')).toBeNull();
  get.mockResolvedValueOnce({ data: budgetPage() }).mockResolvedValueOnce({ data: budgetDetail });
  await fireEvent.press(view.getByRole('button', { name: 'Reintentar' }));
  await waitFor(() => expect(view.getByTestId('order-budget-5')).toBeTruthy());
});
