import { cleanup, renderWithProviders, screen } from '../test-utils';
import ClienteScreen from '@/app/(cliente)/cliente';
import { BudgetDetailScreen } from '@/components/budgets/BudgetDetailScreen';
import { ENV } from '@/config/env';
import { calculateBudgetTotal, getBudgetById } from '@/services';

/**
 * SCRUM-225 — Cifras del portal Cliente.
 *
 * La vista de demostración debe derivar sus cifras de su propia fuente demo
 * (`getBudgetById('OT-00124')`), coincidir con el detalle que abre, declararse
 * como demostración y mostrar «No disponible» cuando no existe fuente. La vista
 * real no muestra cifras.
 */

const demoEnv = ENV as { USE_DEMO_DATA: boolean };
jest.mock('@/config/env', () => {
  const actual = jest.requireActual('@/config/env');
  return { ...actual, ENV: { ...actual.ENV, USE_DEMO_DATA: true } };
});
jest.mock('@/services', () => {
  const actual = jest.requireActual('@/services');
  return { ...actual, getBudgetById: jest.fn(actual.getBudgetById) };
});
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

const demoBudget = jest.requireActual('@/services').getBudgetById('OT-00124');
const formatCLP = (amount: number) =>
  amount.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

beforeEach(() => {
  demoEnv.USE_DEMO_DATA = true;
  jest.mocked(getBudgetById)
    .mockClear()
    .mockImplementation(jest.requireActual('@/services').getBudgetById);
});
afterEach(cleanup);

describe('Portal Cliente en modo demostración', () => {
  it('existe una fuente demo para la orden mostrada', () => {
    expect(demoBudget).toBeDefined();
  });

  it('se declara explícitamente como demostración', async () => {
    await renderWithProviders(<ClienteScreen />);
    expect(screen.getByTestId('cliente-demo-notice')).toHaveTextContent(/datos ficticios/i);
  });

  it('el presupuesto coincide con la fuente demo y con el detalle que abre', async () => {
    const expected = formatCLP(calculateBudgetTotal(demoBudget));

    await renderWithProviders(<ClienteScreen />);
    expect(screen.getByLabelText(`Presupuesto: ${expected}`)).toBeTruthy();
    expect(screen.getByLabelText(`Total estimado: ${expected}`)).toBeTruthy();
    expect(screen.getByLabelText(`Estado del presupuesto: ${demoBudget.status}`)).toBeTruthy();
    expect(screen.queryByText('$125.000')).toBeNull();
    await cleanup();

    await renderWithProviders(<BudgetDetailScreen />);
    expect(screen.getAllByText(expected).length).toBeGreaterThan(0);
  });

  it('el conteo corresponde a los ítems del presupuesto demo', async () => {
    await renderWithProviders(<ClienteScreen />);
    expect(screen.getByLabelText(`Ítems del presupuesto: ${demoBudget.items.length}`)).toBeTruthy();
    expect(screen.queryByLabelText(/^Repuestos:/)).toBeNull();
  });

  it('sin fuente demo de evidencias no inventa una cantidad', async () => {
    await renderWithProviders(<ClienteScreen />);
    expect(screen.getByLabelText('Evidencias: No disponible')).toBeTruthy();
    expect(screen.queryByText(/\d+ archivos disponibles/)).toBeNull();
  });

  it('si falta el presupuesto demo muestra «No disponible» y ningún monto', async () => {
    jest.mocked(getBudgetById).mockReturnValue(undefined);
    await renderWithProviders(<ClienteScreen />);
    expect(screen.getByLabelText('Presupuesto: No disponible')).toBeTruthy();
    expect(screen.getByLabelText('Total estimado: No disponible')).toBeTruthy();
    expect(screen.getByLabelText('Ítems del presupuesto: No disponible')).toBeTruthy();
    expect(screen.queryByText(/\$\d/)).toBeNull();
  });
});

describe('Portal Cliente real', () => {
  it('no muestra cifras ni consulta la fuente demo', async () => {
    demoEnv.USE_DEMO_DATA = false;
    await renderWithProviders(<ClienteScreen />);
    expect(screen.queryByText(/\$\d/)).toBeNull();
    expect(screen.queryByTestId('cliente-demo-notice')).toBeNull();
    expect(getBudgetById).not.toHaveBeenCalled();
  });
});
