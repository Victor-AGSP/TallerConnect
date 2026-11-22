import { fireEvent, renderWithProviders, screen } from '../test-utils';
import ClienteScreen from '@/app/(cliente)/cliente';
import { BudgetDetailScreen } from '@/components/budgets/BudgetDetailScreen';
import { budgetsService } from '@/services/budgets.service';

const mockPush = jest.fn();
const mockParams = jest.fn((): { id?: string } => ({}));
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useRouter: () => ({ push: mockPush }),
  useLocalSearchParams: () => mockParams(),
}));
jest.mock('@/config/env', () => ({
  ...jest.requireActual('@/config/env'),
  ENV: { ...jest.requireActual('@/config/env').ENV, USE_DEMO_DATA: false },
}));

describe('Consulta del cliente sin demostración', () => {
  beforeEach(() => { mockPush.mockClear(); mockParams.mockReturnValue({}); });
  afterEach(() => jest.restoreAllMocks());

  it('ofrece la consulta real de vehículos sin inventar una orden o presupuesto', async () => {
    await renderWithProviders(<ClienteScreen />);
    expect(screen.queryByText('AB-CD-12')).toBeNull();
    expect(screen.queryByText('OT-00124')).toBeNull();
    expect(screen.queryByText(/demostración/)).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Ver mis vehículos' }));
    expect(mockPush).toHaveBeenCalledWith('/(cliente)/mis-vehiculos');
  });

  it('no consulta ni selecciona una orden fija si falta su identificador', async () => {
    const load = jest.spyOn(budgetsService, 'getBudgetForOrder');
    await renderWithProviders(<BudgetDetailScreen />);
    expect(screen.getByTestId('order-budget-missing-id')).toBeTruthy();
    expect(load).not.toHaveBeenCalled();
    expect(screen.queryByText('OT-00124')).toBeNull();
  });

  it('consulta el servicio para la orden solicitada y conserva el resultado vacío', async () => {
    mockParams.mockReturnValue({ id: '987' });
    const load = jest.spyOn(budgetsService, 'getBudgetForOrder').mockResolvedValue(null);
    await renderWithProviders(<BudgetDetailScreen />);
    await screen.findByTestId('order-budget-empty');
    expect(load).toHaveBeenCalledWith('987');
    expect(screen.queryByText('OT-00124')).toBeNull();
  });

  it('muestra el error de consulta sin sustituirlo por presupuesto demo', async () => {
    mockParams.mockReturnValue({ id: '987' });
    jest.spyOn(budgetsService, 'getBudgetForOrder').mockRejectedValue(new Error('Servicio no disponible'));
    await renderWithProviders(<BudgetDetailScreen />);
    await screen.findByTestId('order-budget-error');
    expect(screen.queryByText('OT-00124')).toBeNull();
  });
});
