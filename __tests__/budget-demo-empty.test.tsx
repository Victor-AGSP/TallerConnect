import { Text } from 'react-native';
import { act, cleanup, fireEvent, renderRouterWithProviders, resetStores, screen, waitFor } from '../test-utils';
import BudgetScreen from '@/app/(cliente)/presupuesto';
import { getBudgetById } from '@/services';
import { budgetsService } from '@/services/budgets.service';
import { ENV } from '@/config/env';

const demoEnv = ENV as { USE_DEMO_DATA: boolean };
jest.mock('@/config/env', () => {
  const actual = jest.requireActual('@/config/env');
  return { ...actual, ENV: { ...actual.ENV, USE_DEMO_DATA: true } };
});
jest.mock('@/services', () => ({ getBudgetById: jest.fn(), calculateBudgetTotal: jest.fn(() => 0) }));
jest.mock('@/services/budgets.service', () => ({ budgetsService: { getBudgetForOrder: jest.fn() } }));
const demo = jest.mocked(getBudgetById);
const read = jest.mocked(budgetsService.getBudgetForOrder);
const routes = { '(cliente)/presupuesto': BudgetScreen, '(cliente)/cliente': () => <Text>Inicio de prueba</Text> };
beforeEach(() => { resetStores(); jest.resetAllMocks(); demoEnv.USE_DEMO_DATA = true; });
afterEach(cleanup);

it('DEMO: ausencia de presupuesto muestra vacío explícito sin total ficticio y permite navegar', async () => {
  demo.mockReturnValue(undefined);
  await renderRouterWithProviders(routes, { initialUrl: '/presupuesto' });
  await waitFor(() => expect(screen.getByTestId('demo-budget-empty')).toBeTruthy());
  expect(screen.getByText('Sin presupuesto')).toBeTruthy();
  expect(screen.queryByText('TOTAL DEL PRESUPUESTO')).toBeNull();
  expect(read).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Volver al inicio' }));
  await waitFor(() => expect(screen.getByText('Inicio de prueba')).toBeTruthy());
});

it('modo real con lista vacía no consulta ni muestra el presupuesto demo', async () => {
  demoEnv.USE_DEMO_DATA = false;
  read.mockResolvedValueOnce(null);
  await renderRouterWithProviders(routes, { initialUrl: '/presupuesto?id=31' });
  await waitFor(() => expect(screen.getByTestId('order-budget-empty')).toBeTruthy());
  expect(read).toHaveBeenCalledWith('31');
  expect(demo).not.toHaveBeenCalled();
  expect(screen.queryByText('TOTAL DEL PRESUPUESTO')).toBeNull();
});

it('un error HTTP real simulado se presenta como error, nunca como vacío demo', async () => {
  demoEnv.USE_DEMO_DATA = false;
  read.mockRejectedValueOnce(new Error('HTTP 503 QA'));
  await renderRouterWithProviders(routes, { initialUrl: '/presupuesto?id=31' });
  await waitFor(() => expect(screen.getByTestId('order-budget-error')).toBeTruthy());
  expect(screen.queryByTestId('order-budget-empty')).toBeNull();
  expect(screen.queryByTestId('demo-budget-empty')).toBeNull();
  expect(demo).not.toHaveBeenCalled();
});

it('una carga pendiente permanece en loading hasta resolver la lista vacía', async () => {
  demoEnv.USE_DEMO_DATA = false;
  let resolve!: (value: null) => void;
  read.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
  await renderRouterWithProviders(routes, { initialUrl: '/presupuesto?id=31' });
  expect(screen.getByTestId('order-budget-loading')).toBeTruthy();
  expect(screen.queryByTestId('order-budget-empty')).toBeNull();
  await act(async () => { resolve(null); });
  await waitFor(() => expect(screen.getByTestId('order-budget-empty')).toBeTruthy());
  expect(ENV.USE_MOCK_SERVICES).toBe(false);
  expect(demo).not.toHaveBeenCalled();
});
