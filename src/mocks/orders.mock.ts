import { WorkOrder } from '@/models';

/**
 * Órdenes de trabajo simuladas: una por cada estado del catálogo del backend.
 * Las órdenes en estado "Recibido" y "Cancelado" no tienen mecánico asignado
 * (`assignedMechanicId: null`), para cubrir el valor nulo que permite el contrato.
 */
export const mockWorkOrders: WorkOrder[] = [
  {
    id: 'ot-00124',
    vehicleId: 'veh-001',
    intakeId: 'ing-001',
    status: 'en_reparacion',
    assignedMechanicId: 'usr-002',
    createdById: 'usr-003',
    createdAt: '2026-03-01T09:00:00.000Z',
    updatedAt: '2026-03-05T14:00:00.000Z',
  },
  {
    id: 'ot-00125',
    vehicleId: 'veh-002',
    intakeId: 'ing-002',
    status: 'esperando_diagnostico',
    assignedMechanicId: 'usr-002',
    createdById: 'usr-003',
    createdAt: '2026-03-03T11:00:00.000Z',
    updatedAt: '2026-03-03T15:30:00.000Z',
  },
  {
    id: 'ot-00126',
    vehicleId: 'veh-001',
    intakeId: 'ing-003',
    status: 'esperando_aprobacion_presupuesto',
    assignedMechanicId: 'usr-002',
    createdById: 'usr-003',
    createdAt: '2026-03-04T08:00:00.000Z',
    updatedAt: '2026-03-04T08:00:00.000Z',
  },
  {
    id: 'ot-00127',
    vehicleId: 'veh-003',
    intakeId: 'ing-004',
    status: 'recibido',
    assignedMechanicId: null,
    createdById: 'usr-003',
    createdAt: '2026-03-06T10:15:00.000Z',
    updatedAt: '2026-03-06T10:15:00.000Z',
  },
  {
    id: 'ot-00128',
    vehicleId: 'veh-002',
    intakeId: 'ing-005',
    status: 'esperando_repuestos',
    assignedMechanicId: 'usr-002',
    createdById: 'usr-003',
    createdAt: '2026-02-20T09:30:00.000Z',
    updatedAt: '2026-02-24T12:00:00.000Z',
  },
  {
    id: 'ot-00129',
    vehicleId: 'veh-003',
    intakeId: 'ing-006',
    status: 'listo_para_entrega',
    assignedMechanicId: 'usr-002',
    createdById: 'usr-003',
    createdAt: '2026-02-15T08:45:00.000Z',
    updatedAt: '2026-02-19T17:20:00.000Z',
  },
  {
    id: 'ot-00130',
    vehicleId: 'veh-001',
    intakeId: 'ing-007',
    status: 'entregado',
    assignedMechanicId: 'usr-002',
    createdById: 'usr-003',
    createdAt: '2026-01-10T09:00:00.000Z',
    updatedAt: '2026-01-14T16:00:00.000Z',
  },
  {
    id: 'ot-00131',
    vehicleId: 'veh-002',
    intakeId: 'ing-008',
    status: 'cancelado',
    assignedMechanicId: null,
    createdById: 'usr-003',
    createdAt: '2026-01-22T10:00:00.000Z',
    updatedAt: '2026-01-22T13:40:00.000Z',
  },
];