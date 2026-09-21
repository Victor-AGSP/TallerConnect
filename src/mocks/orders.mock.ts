import { WorkOrder } from '@/models';

export const mockWorkOrders: WorkOrder[] = [
  {
    id: 'ot-00124',
    vehicleId: 'veh-001',
    status: 'en_reparacion',
    assignedMechanicId: 'usr-002',
    clientId: 'usr-001',
    description: 'Mantención preventiva',
    createdAt: '2026-03-01T09:00:00.000Z',
    updatedAt: '2026-03-05T14:00:00.000Z',
  },
  {
    id: 'ot-00125',
    vehicleId: 'veh-002',
    status: 'esperando_diagnostico',
    clientId: 'usr-001',
    createdAt: '2026-03-03T11:00:00.000Z',
  },
  {
    id: 'ot-00126',
    vehicleId: 'veh-001',
    status: 'esperando_aprobacion_presupuesto',
    assignedMechanicId: 'usr-002',
    clientId: 'usr-001',
    createdAt: '2026-03-04T08:00:00.000Z',
  },
];