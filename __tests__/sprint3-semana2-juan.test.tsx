import {
  cleanup,
  fireEvent,
  renderWithProviders,
  resetStores,
  screen,
  waitFor,
} from '../test-utils';
import { BudgetDetailScreen } from '@/components/budgets/BudgetDetailScreen';
import {
  EVIDENCE_LIST_FALLBACK_ERROR,
  OrderEvidenceList,
} from '@/components/evidence/OrderEvidenceList';
import { OrderBudgetView } from '@/components/orders/OrderBudgetView';
import type { Budget } from '@/models/budget.model';
import type { WorkOrder } from '@/models/order.model';
import { budgetsService } from '@/services/budgets.service';
import { evidenceService } from '@/services/evidence.service';
import { ordersService } from '@/services/orders.service';

const SAMPLE_ORDER: WorkOrder = {
  id: '1',
  vehicleId: '1',
  intakeId: '1',
  clientId: '1',
  createdById: '3',
  status: 'en_reparacion',
  assignedMechanicId: '2',
  createdAt: '2026-11-15T10:00:00Z',
  updatedAt: '2026-11-15T12:00:00Z',
};

const SAMPLE_BUDGET: Budget = {
  id: '1',
  orderId: '1',
  createdAt: '2026-11-15T10:00:00Z',
  latestVersion: 1,
  latestStatus: 'enviada',
  latestTotal: '52000.00',
  currentVersion: null,
  versions: [
    {
      number: 1,
      status: 'enviada',
      isModification: false,
      createdAt: '2026-11-15T10:00:00Z',
      sentAt: '2026-11-15T11:00:00Z',
      total: '52000.00',
      items: [
        {
          id: '1',
          type: 'repuesto',
          description: 'Filtro de aceite Toyota',
          quantity: '1',
          unitPrice: '12000.00',
          subtotal: '12000.00',
          partId: '1',
          partName: 'Filtro de aceite Toyota',
          supplierName: 'Repuestos Central UCT',
        },
        {
          id: '2',
          type: 'mano_de_obra',
          description: 'Cambio de aceite y filtro',
          quantity: '1',
          unitPrice: '40000.00',
          subtotal: '40000.00',
          partId: null,
          partName: null,
          supplierName: null,
        },
      ],
      decision: null,
    },
  ],
};

describe('Sprint 3 Semana 2 — Presupuesto MS3, evidencias MS4 y permisos por rol', () => {
  beforeEach(() => {
    resetStores();
  });

  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });

  describe('S3-AMP-S2-JUAN-01 / JUAN-02 / S3-S2: BudgetDetailScreen conectado a MS3', () => {
    it('muestra estado de carga inicial, carga datos reales de MS3 sin textos demo y permite refrescar', async () => {
      let resolveOrders: (value: WorkOrder[]) => void = () => {};
      jest.spyOn(ordersService, 'getOrders').mockReturnValueOnce(
        new Promise<WorkOrder[]>((resolve) => {
          resolveOrders = resolve;
        }),
      );
      jest
        .spyOn(budgetsService, 'getBudgetForOrder')
        .mockResolvedValueOnce(SAMPLE_BUDGET)
        .mockResolvedValueOnce({
          ...SAMPLE_BUDGET,
          latestTotal: '60000.00',
          versions: [{ ...SAMPLE_BUDGET.versions[0], total: '60000.00' }],
        });

      await renderWithProviders(<BudgetDetailScreen />);

      expect(screen.getByTestId('budget-detail-loading')).toBeTruthy();

      resolveOrders([SAMPLE_ORDER]);

      expect(await screen.findByTestId('budget-detail-1')).toBeTruthy();
      expect(screen.getByText('OT #1')).toBeTruthy();
      expect(screen.getByText('$52.000')).toBeTruthy();
      expect(screen.queryByText(/Información de demostración/i)).toBeNull();

      // Refresco manual
      jest.spyOn(ordersService, 'getOrders').mockResolvedValueOnce([SAMPLE_ORDER]);
      await fireEvent.press(screen.getByTestId('budget-detail-refresh'));

      expect(await screen.findByText('$60.000')).toBeTruthy();
    });

    it('muestra error claro con reintento cuando falla la carga del presupuesto', async () => {
      jest
        .spyOn(ordersService, 'getOrders')
        .mockRejectedValueOnce(new Error('MS3 temporalmente no disponible'));

      await renderWithProviders(<BudgetDetailScreen />);

      expect(await screen.findByTestId('budget-detail-error')).toBeTruthy();
      expect(screen.getByText('MS3 temporalmente no disponible')).toBeTruthy();
    });
  });

  describe('S3-AMP-S2-JUAN-02 / JUAN-04 / S3-S2: Controles de presupuesto durante refresco y permisos por rol', () => {
    it('deshabilita controles de decisión mientras el presupuesto se está actualizando y valida motivo de rechazo', async () => {
      let resolveRefresh: (value: Budget | null) => void = () => {};
      const loadBudget = jest
        .fn<Promise<Budget | null>, [string]>()
        .mockResolvedValueOnce(SAMPLE_BUDGET)
        .mockReturnValueOnce(
          new Promise<Budget | null>((resolve) => {
            resolveRefresh = resolve;
          }),
        );

      const decide = jest.fn();
      const retryApplication = jest.fn();

      await renderWithProviders(
        <OrderBudgetView
          eyebrow="Portal del cliente"
          orderId="1"
          loadBudget={loadBudget}
          decisionActions={{ decide, retryApplication }}
        />,
      );

      expect(await screen.findByTestId('order-budget-1')).toBeTruthy();

      // Validación de formulario: rechazar sin motivo muestra alerta y se limpia al escribir
      await fireEvent.press(screen.getByTestId('order-budget-reject'));
      expect(screen.getByTestId('order-budget-decision-error')).toBeTruthy();
      expect(screen.getByText('Indica el motivo del rechazo.')).toBeTruthy();

      await fireEvent.changeText(
        screen.getByTestId('order-budget-reason'),
        'Prefiero esperar',
      );
      expect(screen.queryByTestId('order-budget-decision-error')).toBeNull();

      // Durante refresco manual, tanto el botón Actualizar como los controles de decisión se deshabilitan
      void fireEvent.press(screen.getByTestId('order-budget-refresh'));

      await waitFor(() => {
        expect(
          screen.getByTestId('order-budget-refresh').props.accessibilityState
            ?.disabled,
        ).toBe(true);
        expect(
          screen.getByTestId('order-budget-approve').props.accessibilityState
            ?.disabled,
        ).toBe(true);
        expect(
          screen.getByTestId('order-budget-reject').props.accessibilityState
            ?.disabled,
        ).toBe(true);
      });

      resolveRefresh(SAMPLE_BUDGET);

      await waitFor(() => {
        expect(
          screen.getByTestId('order-budget-approve').props.accessibilityState
            ?.disabled,
        ).toBe(false);
      });
    });

    it('oculta el formulario de decisión para roles sin permiso (administrador)', async () => {
      const loadBudget = jest.fn().mockResolvedValueOnce(SAMPLE_BUDGET);

      await renderWithProviders(
        <OrderBudgetView
          eyebrow="Administración"
          orderId="1"
          loadBudget={loadBudget}
        />,
      );

      expect(await screen.findByTestId('order-budget-1')).toBeTruthy();
      expect(screen.queryByTestId('order-budget-decision-form')).toBeNull();
    });
  });

  describe('S3-AMP-S2-JUAN-03 / S3-S2: Error claro cuando MS4 no puede listar evidencias', () => {
    it('muestra título y mensaje claro de servicio indisponible sin confundirlo con estado vacío', async () => {
      jest
        .spyOn(evidenceService, 'listEvidence')
        .mockRejectedValueOnce(new Error(''))
        .mockResolvedValueOnce([]);

      await renderWithProviders(
        <OrderEvidenceList orderId="1" role="cliente" />,
      );

      await fireEvent.press(screen.getByTestId('order-evidence-show'));

      expect(await screen.findByTestId('order-evidence-error')).toBeTruthy();
      expect(
        screen.getByText('No se pudieron cargar las evidencias'),
      ).toBeTruthy();
      expect(screen.getByText(EVIDENCE_LIST_FALLBACK_ERROR)).toBeTruthy();
      expect(screen.queryByTestId('order-evidence-empty')).toBeNull();

      await fireEvent.press(screen.getByText('Reintentar'));

      expect(await screen.findByTestId('order-evidence-empty')).toBeTruthy();
      expect(screen.queryByTestId('order-evidence-error')).toBeNull();
    });
  });
});
