import { Text } from 'react-native';

import {
  cleanup,
  fireEvent,
  renderRouterWithProviders,
  resetStores,
  screen,
  waitFor,
} from '../test-utils';
import AdminLayout from '@/app/(admin)/_layout';
import OrdenScreen from '@/app/(admin)/ordenes/[id]';
import OrdenPresupuestoScreen from '@/app/(admin)/ordenes/[id]/presupuesto';
import AuthLayout from '@/app/(auth)/_layout';
import ClienteLayout from '@/app/(cliente)/_layout';
import MiOrdenScreen from '@/app/(cliente)/mis-ordenes/[id]';
import MiOrdenPresupuestoScreen from '@/app/(cliente)/mis-ordenes/[id]/presupuesto';
import MecanicoLayout from '@/app/(mecanico)/_layout';
import OrdenAsignadaScreen from '@/app/(mecanico)/ordenes-asignadas/[id]';
import type { UserRole } from '@/constants/roles';
import { mockUserByRole } from '@/mocks/users.mock';
import type { Budget, BudgetDecisionResult } from '@/models/budget.model';
import type { WorkOrder } from '@/models/order.model';
import {
  budgetsService,
  DecisionApplicationPendingError,
} from '@/services/budgets.service';
import { ordersService } from '@/services/orders.service';

jest.mock('@/services/budgets.service', () => {
  const actual = jest.requireActual('@/services/budgets.service');
  return {
    DecisionApplicationPendingError: actual.DecisionApplicationPendingError,
    budgetsService: {
      getBudgetForOrder: jest.fn(),
      decideBudgetVersion: jest.fn(),
      retryDecisionApplication: jest.fn(),
    },
  };
});

jest.mock('@/services/orders.service', () => ({
  ordersService: { getOrderById: jest.fn() },
}));

const mockedBudgets = jest.mocked(budgetsService);
const mockedOrders = jest.mocked(ordersService);

/**
 * Integración del presupuesto con la orden de trabajo en las vistas.
 *
 * Pantallas y layouts reales; solo se simulan los servicios. El recorrido
 * con el cliente HTTP real está en `budget-flow-integration.test.tsx`.
 */

/** Pantallas sin layouts: navegación, estados y decisiones. */
const screenRoutes = {
  '(admin)/ordenes/[id]': OrdenScreen,
  '(admin)/ordenes/[id]/presupuesto': OrdenPresupuestoScreen,
  '(cliente)/mis-ordenes/[id]': MiOrdenScreen,
  '(cliente)/mis-ordenes/[id]/presupuesto': MiOrdenPresupuestoScreen,
  '(mecanico)/ordenes-asignadas/[id]': OrdenAsignadaScreen,
};

/** Layouts reales (RoleGuard): restricciones por rol. */
const guardedRoutes = {
  '(auth)/_layout': AuthLayout,
  '(auth)/login': () => <Text>Iniciar sesión</Text>,
  '(admin)/_layout': AdminLayout,
  '(admin)/administrador': () => <Text>Panel administrador</Text>,
  '(admin)/ordenes/[id]/presupuesto': OrdenPresupuestoScreen,
  '(cliente)/_layout': ClienteLayout,
  '(cliente)/cliente': () => <Text>Portal cliente</Text>,
  '(cliente)/mis-ordenes/[id]/presupuesto': MiOrdenPresupuestoScreen,
  '(mecanico)/_layout': MecanicoLayout,
  '(mecanico)/mecanico': () => <Text>Panel mecánico</Text>,
};

const order: WorkOrder = {
  id: '31',
  vehicleId: '12',
  intakeId: '18',
  clientId: '99',
  createdById: '99',
  status: 'esperando_aprobacion_presupuesto',
  assignedMechanicId: '50',
  createdAt: '2026-10-09T10:00:00-03:00',
  updatedAt: '2026-10-09T12:00:00-03:00',
};

/** Presupuesto enviado y nunca aprobado: rechazar cancela el servicio. */
const sentBudget: Budget = {
  id: '5',
  orderId: '31',
  createdAt: '2026-10-09T10:00:00-03:00',
  latestVersion: 1,
  latestStatus: 'enviada',
  latestTotal: '125000.00',
  currentVersion: null,
  versions: [
    {
      number: 1,
      status: 'enviada',
      isModification: false,
      createdAt: '2026-10-09T10:00:00-03:00',
      sentAt: '2026-10-09T12:00:00-03:00',
      total: '125000.00',
      items: [
        {
          id: '11',
          type: 'repuesto',
          description: 'Pastillas de freno delanteras',
          quantity: '2',
          unitPrice: '32500.00',
          subtotal: '65000.00',
          partId: '8',
          partName: 'Pastillas de freno',
          supplierName: 'Frenos Chile',
        },
        {
          id: '12',
          type: 'mano_de_obra',
          description: 'Cambio de pastillas',
          quantity: '1',
          unitPrice: '60000.00',
          subtotal: '60000.00',
          partId: null,
          partName: null,
          supplierName: null,
        },
      ],
      decision: null,
    },
  ],
};

const approvedBudget: Budget = {
  ...sentBudget,
  latestStatus: 'aprobada',
  currentVersion: 1,
  versions: [
    {
      ...sentBudget.versions[0],
      status: 'aprobada',
      decision: {
        id: '77',
        decision: 'aprobado',
        clientUserId: '4',
        decidedAt: '2026-10-10T15:00:00-03:00',
        reason: null,
      },
    },
  ],
};

/** Modificación enviada tras una aprobación: rechazarla no cancela. */
const modificationBudget: Budget = {
  ...sentBudget,
  latestVersion: 2,
  currentVersion: 1,
  versions: [
    approvedBudget.versions[0],
    { ...sentBudget.versions[0], number: 2, isModification: true, total: '150000.00' },
  ],
};

function decisionResult(
  overrides: Partial<BudgetDecisionResult> = {},
): BudgetDecisionResult {
  return {
    budget: approvedBudget,
    orderEffect: 'en_reparacion',
    missingParts: [],
    decisionId: '77',
    ...overrides,
  };
}

function sessionForRole(role: UserRole) {
  return {
    user: mockUserByRole[role],
    token: 'token-de-prueba',
    role,
    isAuthenticated: true,
    isLoading: false,
    isHydrated: true,
  };
}

let view: ReturnType<typeof renderRouterWithProviders>;

async function renderAs(
  role: UserRole,
  initialUrl: string,
  routes: Record<string, unknown> = screenRoutes,
) {
  view = renderRouterWithProviders(routes as typeof screenRoutes, {
    initialUrl,
    initialAuthState: sessionForRole(role),
  });
  await view;
}

async function waitForTestId(testID: string) {
  await waitFor(() => expect(screen.getByTestId(testID)).toBeTruthy());
}

beforeEach(() => {
  // resetAllMocks también descarta las respuestas `Once` no consumidas.
  jest.resetAllMocks();
  resetStores();
});

afterEach(() => {
  cleanup();
});

describe('Orden → presupuesto', () => {
  it.each([
    ['cliente', '/mis-ordenes/31', '/mis-ordenes/31/presupuesto'],
    ['administrador', '/ordenes/31', '/ordenes/31/presupuesto'],
  ] as const)(
    'el %s abre el presupuesto desde el detalle de la orden',
    async (role, orderPath, budgetPath) => {
      mockedOrders.getOrderById.mockResolvedValueOnce(order);
      mockedBudgets.getBudgetForOrder.mockResolvedValueOnce(sentBudget);

      await renderAs(role, orderPath);
      await waitForTestId('order-detail-open-budget');

      // El detalle de la orden no consulta el presupuesto por sí mismo.
      expect(mockedBudgets.getBudgetForOrder).not.toHaveBeenCalled();

      await fireEvent.press(screen.getByTestId('order-detail-open-budget'));

      await waitForTestId('order-budget-5');
      expect(view.getPathname()).toBe(budgetPath);
      expect(mockedBudgets.getBudgetForOrder).toHaveBeenCalledWith('31');
    },
  );

  it('el mecánico no tiene acceso al presupuesto desde la orden', async () => {
    mockedOrders.getOrderById.mockResolvedValueOnce(order);

    await renderAs('mecanico', '/ordenes-asignadas/31');
    await waitForTestId('order-detail-31');

    expect(screen.queryByTestId('order-detail-open-budget')).toBeNull();
  });
});

describe('Representación del presupuesto', () => {
  it('muestra total, estado, ítems con repuesto/proveedor e importes', async () => {
    mockedBudgets.getBudgetForOrder.mockResolvedValueOnce(sentBudget);

    await renderAs('administrador', '/ordenes/31/presupuesto');
    await waitForTestId('order-budget-5');

    expect(screen.getByRole('header', { name: 'Presupuesto de la orden 31' })).toBeTruthy();
    expect(screen.getByLabelText('Total del presupuesto: $125.000')).toBeTruthy();
    expect(screen.getByLabelText('Estado del presupuesto: Esperando decisión')).toBeTruthy();
    expect(
      screen.getByLabelText(
        'Repuesto: Pastillas de freno delanteras. 2 × $32.500. Pastillas de freno · Frenos Chile. Subtotal: $65.000',
      ),
    ).toBeTruthy();
    expect(
      screen.getByLabelText(
        'Mano de obra: Cambio de pastillas. 1 × $60.000. Subtotal: $60.000',
      ),
    ).toBeTruthy();
  });

  it('el administrador no puede decidir el presupuesto', async () => {
    mockedBudgets.getBudgetForOrder.mockResolvedValueOnce(sentBudget);

    await renderAs('administrador', '/ordenes/31/presupuesto');
    await waitForTestId('order-budget-5');

    expect(screen.queryByTestId('order-budget-decision-form')).toBeNull();
  });

  it('muestra la decisión registrada de una versión aprobada', async () => {
    mockedBudgets.getBudgetForOrder.mockResolvedValueOnce(approvedBudget);

    await renderAs('cliente', '/mis-ordenes/31/presupuesto');
    await waitForTestId('order-budget-decision');

    expect(screen.getByLabelText('Estado del presupuesto: Aprobado')).toBeTruthy();
    expect(screen.queryByTestId('order-budget-decision-form')).toBeNull();
  });

  it('indica la versión vigente cuando hay una modificación pendiente', async () => {
    mockedBudgets.getBudgetForOrder.mockResolvedValueOnce(modificationBudget);

    await renderAs('cliente', '/mis-ordenes/31/presupuesto');
    await waitForTestId('order-budget-version-2');

    expect(screen.getByText('Versión aprobada vigente: 1')).toBeTruthy();
    expect(screen.getByText('Modificación de un presupuesto anterior.')).toBeTruthy();
  });

  it('muestra el estado vacío si la orden no tiene presupuesto', async () => {
    mockedBudgets.getBudgetForOrder
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(sentBudget);

    await renderAs('cliente', '/mis-ordenes/31/presupuesto');
    await waitForTestId('order-budget-empty');

    await fireEvent.press(screen.getByText('Actualizar'));

    await waitForTestId('order-budget-5');
    expect(mockedBudgets.getBudgetForOrder).toHaveBeenCalledTimes(2);
  });

  it('muestra el error de carga y se recupera con el reintento', async () => {
    mockedBudgets.getBudgetForOrder
      .mockRejectedValueOnce(new Error('Error interno en el servidor. Intenta nuevamente más tarde.'))
      .mockResolvedValueOnce(sentBudget);

    await renderAs('cliente', '/mis-ordenes/31/presupuesto');
    await waitForTestId('order-budget-error');

    await fireEvent.press(screen.getByText('Reintentar'));

    await waitForTestId('order-budget-5');
  });
});

describe('Decisión del cliente', () => {
  async function openSentBudget(budget: Budget = sentBudget) {
    mockedBudgets.getBudgetForOrder
      .mockResolvedValueOnce(budget)
      .mockResolvedValueOnce(approvedBudget);

    await renderAs('cliente', '/mis-ordenes/31/presupuesto');
    await waitForTestId('order-budget-decision-form');
  }

  it('aprueba tras confirmar, muestra el efecto y recarga el presupuesto', async () => {
    mockedBudgets.decideBudgetVersion.mockResolvedValueOnce(decisionResult());
    await openSentBudget();

    await fireEvent.press(screen.getByTestId('order-budget-approve'));
    expect(mockedBudgets.decideBudgetVersion).not.toHaveBeenCalled();
    expect(
      screen.getByText('¿Confirmas que apruebas el presupuesto por $125.000?'),
    ).toBeTruthy();

    await fireEvent.press(screen.getByTestId('order-budget-confirm'));

    await waitForTestId('order-budget-decision-result');
    expect(mockedBudgets.decideBudgetVersion).toHaveBeenCalledWith('5', 1, {
      decision: 'aprobado',
      reason: undefined,
      confirmCancellation: false,
    });
    expect(
      screen.getByText('Presupuesto aprobado. La orden pasa a reparación.'),
    ).toBeTruthy();
    await waitForTestId('order-budget-decision');
    expect(mockedBudgets.getBudgetForOrder).toHaveBeenCalledTimes(2);
  });

  it('informa los repuestos faltantes al aprobar sin stock suficiente', async () => {
    mockedBudgets.decideBudgetVersion.mockResolvedValueOnce(
      decisionResult({
        orderEffect: 'esperando_repuestos',
        missingParts: [
          { partId: '8', name: 'Pastillas de freno', required: '2', available: 0 },
        ],
      }),
    );
    await openSentBudget();

    await fireEvent.press(screen.getByTestId('order-budget-approve'));
    await fireEvent.press(screen.getByTestId('order-budget-confirm'));

    await waitForTestId('order-budget-missing-parts');
    expect(
      screen.getByText('Presupuesto aprobado. La orden queda esperando repuestos.'),
    ).toBeTruthy();
    expect(screen.getByText('Pastillas de freno: se requieren 2, hay 0')).toBeTruthy();
  });

  it('exige el motivo antes de rechazar', async () => {
    await openSentBudget();

    await fireEvent.press(screen.getByTestId('order-budget-reject'));

    expect(screen.getByText('Indica el motivo del rechazo.')).toBeTruthy();
    expect(screen.queryByTestId('order-budget-confirm')).toBeNull();
    expect(mockedBudgets.decideBudgetVersion).not.toHaveBeenCalled();
  });

  it('el primer rechazo advierte y confirma la cancelación del servicio', async () => {
    mockedBudgets.decideBudgetVersion.mockResolvedValueOnce(
      decisionResult({ orderEffect: 'cancelado' }),
    );
    await openSentBudget();

    expect(
      screen.getByText('Si rechazas este presupuesto se cancelará el servicio de la orden.'),
    ).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('order-budget-reason'), 'Muy caro');
    await fireEvent.press(screen.getByTestId('order-budget-reject'));
    expect(
      screen.getByText('¿Confirmas que rechazas el presupuesto y cancelas el servicio?'),
    ).toBeTruthy();

    await fireEvent.press(screen.getByTestId('order-budget-confirm'));

    await waitForTestId('order-budget-decision-result');
    expect(mockedBudgets.decideBudgetVersion).toHaveBeenCalledWith('5', 1, {
      decision: 'rechazado',
      reason: 'Muy caro',
      confirmCancellation: true,
    });
    expect(
      screen.getByText('Presupuesto rechazado. El servicio de la orden fue cancelado.'),
    ).toBeTruthy();
  });

  it('rechazar una modificación no pide cancelar el servicio', async () => {
    mockedBudgets.decideBudgetVersion.mockResolvedValueOnce(
      decisionResult({ orderEffect: null }),
    );
    await openSentBudget(modificationBudget);

    expect(
      screen.queryByText('Si rechazas este presupuesto se cancelará el servicio de la orden.'),
    ).toBeNull();

    await fireEvent.changeText(screen.getByTestId('order-budget-reason'), 'No lo necesito');
    await fireEvent.press(screen.getByTestId('order-budget-reject'));
    await fireEvent.press(screen.getByTestId('order-budget-confirm'));

    await waitForTestId('order-budget-decision-result');
    expect(mockedBudgets.decideBudgetVersion).toHaveBeenCalledWith('5', 2, {
      decision: 'rechazado',
      reason: 'No lo necesito',
      confirmCancellation: false,
    });
    expect(
      screen.getByText('Decisión registrada. El estado de la orden no cambia.'),
    ).toBeTruthy();
  });

  it('permite volver sin enviar la decisión', async () => {
    await openSentBudget();

    await fireEvent.press(screen.getByTestId('order-budget-approve'));
    await fireEvent.press(screen.getByText('Volver'));

    expect(screen.getByTestId('order-budget-approve')).toBeTruthy();
    expect(mockedBudgets.decideBudgetVersion).not.toHaveBeenCalled();
  });

  it('muestra el error del MS3 y conserva el formulario', async () => {
    mockedBudgets.decideBudgetVersion.mockRejectedValueOnce(
      new Error('No enviada, ya decidida o reemplazada'),
    );
    await openSentBudget();

    await fireEvent.press(screen.getByTestId('order-budget-approve'));
    await fireEvent.press(screen.getByTestId('order-budget-confirm'));

    await waitForTestId('order-budget-decision-error');
    expect(screen.getByText('No enviada, ya decidida o reemplazada')).toBeTruthy();
    expect(screen.getByTestId('order-budget-approve')).toBeTruthy();
    expect(mockedBudgets.getBudgetForOrder).toHaveBeenCalledTimes(1);
  });

  it('ante una aplicación pendiente reintenta sin volver a decidir', async () => {
    mockedBudgets.decideBudgetVersion.mockRejectedValueOnce(
      new DecisionApplicationPendingError(
        'Tu decisión quedó registrada, pero la orden aún no refleja el cambio.',
        '77',
      ),
    );
    mockedBudgets.retryDecisionApplication
      .mockRejectedValueOnce(
        new DecisionApplicationPendingError(
          'Tu decisión quedó registrada, pero la orden aún no refleja el cambio.',
          '77',
        ),
      )
      .mockResolvedValueOnce(undefined);
    await openSentBudget();

    await fireEvent.press(screen.getByTestId('order-budget-approve'));
    await fireEvent.press(screen.getByTestId('order-budget-confirm'));

    await waitForTestId('order-budget-decision-pending');
    expect(
      screen.getByText('Tu decisión quedó registrada, pero la orden aún no refleja el cambio.'),
    ).toBeTruthy();

    // Primer reintento: sigue pendiente.
    await fireEvent.press(screen.getByTestId('order-budget-retry-application'));
    await waitFor(() =>
      expect(mockedBudgets.retryDecisionApplication).toHaveBeenCalledTimes(1),
    );
    await waitForTestId('order-budget-decision-pending');

    // Segundo reintento: aplicada.
    await fireEvent.press(screen.getByTestId('order-budget-retry-application'));

    await waitForTestId('order-budget-decision-result');
    expect(screen.getByText('Tu decisión ya se aplicó en la orden.')).toBeTruthy();
    expect(mockedBudgets.retryDecisionApplication).toHaveBeenNthCalledWith(2, '77');
    expect(mockedBudgets.decideBudgetVersion).toHaveBeenCalledTimes(1);
  });
});

describe('Restricciones de acceso por rol', () => {
  it.each([
    ['cliente', '/ordenes/31/presupuesto', '/cliente', 'Portal cliente'],
    ['mecanico', '/ordenes/31/presupuesto', '/mecanico', 'Panel mecánico'],
    ['administrador', '/mis-ordenes/31/presupuesto', '/administrador', 'Panel administrador'],
    ['mecanico', '/mis-ordenes/31/presupuesto', '/mecanico', 'Panel mecánico'],
  ] as const)(
    'el rol %s no accede a %s ni consulta el MS3',
    async (role, path, home, content) => {
      await renderAs(role, path, guardedRoutes);

      await waitFor(() => expect(view.getPathname()).toBe(home));
      expect(screen.getByText(content)).toBeTruthy();
      expect(mockedBudgets.getBudgetForOrder).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['cliente', '/mis-ordenes/31/presupuesto'],
    ['administrador', '/ordenes/31/presupuesto'],
  ] as const)('el rol %s accede a %s a través de su layout', async (role, path) => {
    mockedBudgets.getBudgetForOrder.mockResolvedValueOnce(sentBudget);

    await renderAs(role, path, guardedRoutes);

    await waitForTestId('order-budget-5');
    expect(view.getPathname()).toBe(path);
  });
});
