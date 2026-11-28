/**
 * Catálogo unificado de textos de estado vacío entre pantallas (S3-AMP-S4-JUAN-01).
 * Mantiene redacción consistente en español para todos los módulos de TallerConnect.
 */
export const EMPTY_STATE_COPY = {
  vehicles: {
    title: 'Sin vehículos',
    clientMessage: 'Todavía no tienes vehículos registrados en el taller.',
    mechanicMessage: 'No tienes vehículos asignados en este momento.',
    adminMessage: 'Todavía no hay vehículos registrados en el sistema.',
  },
  orders: {
    title: 'Sin órdenes registradas',
    clientMessage: 'No existen órdenes de trabajo asociadas a tu cuenta.',
    mechanicTitle: 'Sin órdenes asignadas',
    mechanicMessage: 'No existen órdenes asociadas a tu usuario.',
    vehicleOrdersTitle: 'Sin órdenes de trabajo',
    vehicleOrdersMessage:
      'Este vehículo no tiene órdenes visibles para tu cuenta.',
  },
  budgets: {
    title: 'Sin presupuesto',
    orderMessage: 'La orden todavía no tiene un presupuesto disponible.',
    clientMessage: 'Todavía no tienes un presupuesto disponible en tus órdenes.',
  },
  evidences: {
    title: 'Sin evidencias',
    message: 'Esta orden aún no tiene evidencias disponibles.',
  },
  parts: {
    title: 'Sin repuestos',
    message: 'No hay repuestos registrados en el inventario.',
  },
  suppliers: {
    title: 'Sin proveedores',
    message: 'No hay proveedores registrados en el sistema.',
  },
} as const;
