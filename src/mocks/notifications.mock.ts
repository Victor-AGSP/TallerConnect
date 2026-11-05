import { ROLES } from '@/constants/roles';
import { WorkshopNotification } from '@/models/notification.model';

export const mockNotifications: WorkshopNotification[] = [
  {
    id: 'not-001',
    title: 'Presupuesto pendiente de aprobación',
    message:
      'La orden OT-00124 tiene un presupuesto por $83.300 esperando confirmación.',
    category: 'budget_approval',
    priority: 'high',
    read: false,
    createdAt: '2026-03-26T15:30:00.000Z',
    targetRole: 'all',
    orderId: 'ot-00124',
    vehicleId: 'veh-001',
    budgetId: 'bud-001',
    partId: null,
  },
  {
    id: 'not-002',
    title: 'Stock bajo en Pastillas de freno cerámicas',
    message:
      'El SKU BRK-PAD-002 registra 5 unidades disponibles en bodega.',
    category: 'low_stock',
    priority: 'high',
    read: false,
    createdAt: '2026-03-26T14:15:00.000Z',
    targetRole: ROLES.ADMINISTRADOR,
    orderId: null,
    vehicleId: null,
    budgetId: null,
    partId: 'part-002',
  },
  {
    id: 'not-003',
    title: 'Orden OT-00124 en reparación',
    message:
      'El mecánico asignado inició la intervención técnica del vehículo AB-CD-12.',
    category: 'order_status',
    priority: 'normal',
    read: false,
    createdAt: '2026-03-26T12:10:00.000Z',
    targetRole: ROLES.CLIENTE,
    orderId: 'ot-00124',
    vehicleId: 'veh-001',
    budgetId: null,
    partId: null,
  },
  {
    id: 'not-004',
    title: 'Nueva evidencia técnica registrada',
    message:
      'Se adjuntó registro multimedia de ingreso en la orden OT-00124.',
    category: 'evidence_uploaded',
    priority: 'normal',
    read: true,
    createdAt: '2026-03-25T16:00:00.000Z',
    targetRole: 'all',
    orderId: 'ot-00124',
    vehicleId: 'veh-001',
    budgetId: null,
    partId: null,
  },
];
