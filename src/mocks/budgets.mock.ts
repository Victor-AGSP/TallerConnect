import type { Budget } from '@/models/budget.model';

/**
 * Presupuestos locales para el modo sin backend
 * (`EXPO_PUBLIC_USE_MOCK_AUTH=true`), indexados por orden. No provienen del
 * MS3.
 */
export const mockBudgetsByOrder: Record<string, Budget> = {
  'ot-00126': {
    id: '1',
    orderId: 'ot-00126',
    createdAt: '2026-03-02T10:00:00.000Z',
    latestVersion: 1,
    latestStatus: 'enviada',
    latestTotal: '125000.00',
    currentVersion: null,
    versions: [
      {
        number: 1,
        status: 'enviada',
        isModification: false,
        createdAt: '2026-03-02T10:00:00.000Z',
        sentAt: '2026-03-02T12:00:00.000Z',
        total: '125000.00',
        items: [
          {
            id: '1',
            type: 'repuesto',
            description: 'Pastillas de freno delanteras',
            quantity: '1',
            unitPrice: '65000.00',
            subtotal: '65000.00',
            partId: '3',
            partName: 'Pastillas de freno',
            supplierName: 'Frenos Chile',
          },
          {
            id: '2',
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
  },
};
