/** Tipo de entrada de la bitácora: nota libre u operación realizada. */
export type OrderLogType = 'observacion' | 'accion';

/**
 * Entrada persistida de la bitácora de trabajo de una orden (MS2): lo que el
 * mecánico observa o ejecuta sin cambiar el estado de la orden.
 */
export interface OrderLogEntry {
  id: string;
  orderId: string;
  authorUserId: string;
  type: OrderLogType;
  description: string;
  createdAt: string;
  parts: { name: string; quantity: number }[];
}

export interface CreateOrderLogEntryInput {
  type: OrderLogType;
  description: string;
}
