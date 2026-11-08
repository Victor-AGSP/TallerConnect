import { isAxiosError } from 'axios';

import { apiClient } from '@/services/api/client';
import { normalizeApiError } from '@/services/api/interceptors';
import type { CreateOrderLogEntryRequestDto } from '@/dto/order-log.dto';
import {
  InvalidOrderLogResponseError,
  mapOrderLogEntryResponse,
  mapOrderLogResponse,
} from '@/mappers/order-log.mapper';
import type {
  CreateOrderLogEntryInput,
  OrderLogEntry,
} from '@/models/order-log.model';

/** Mensajes según las respuestas documentadas por MS2 para la bitácora. */
const LOG_MESSAGES: Record<number, string> = {
  403: 'Solo el mecánico asignado o un administrador pueden registrar avances en esta orden.',
  404: 'La orden no existe o no está asignada a tu usuario.',
  422: 'El tipo o la descripción del avance no son válidos.',
};

/** Identificador entero positivo, como exige el contrato. */
function requirePositiveId(id: string): number {
  if (!/^[1-9]\d*$/.test(id)) {
    throw new Error('El identificador de la orden no es válido.');
  }
  return Number(id);
}

function toError(error: unknown, fallback: string): Error {
  if (error instanceof InvalidOrderLogResponseError) return error;

  const normalized = normalizeApiError(error);
  if (normalized.isTimeout || normalized.isNetworkError) {
    return new Error(normalized.message);
  }

  const detail = isAxiosError(error) ? error.response?.data?.detail : undefined;
  const status = normalized.status;
  return new Error(
    (typeof detail === 'string' && detail.trim()) ||
      (status !== undefined && LOG_MESSAGES[status]) ||
      normalized.message ||
      fallback,
  );
}

/**
 * Bitácora de trabajo de las órdenes (MS2): las actualizaciones que registra
 * el mecánico sin cambiar el estado de la orden.
 */
export class OrderLogService {
  /**
   * Entradas de la bitácora en orden cronológico. Aplica la misma visibilidad
   * que el detalle de la orden (404 si es ajena).
   *
   * Ruta Gateway: GET /api/ordenes/{orden_id}/bitacora
   */
  async getOrderLog(orderId: string): Promise<OrderLogEntry[]> {
    const ordenId = requirePositiveId(orderId);
    try {
      const response = await apiClient.get(`/ordenes/${ordenId}/bitacora`);
      const entries = mapOrderLogResponse(response.data);
      if (entries.some((entry) => entry.orderId !== String(ordenId))) {
        throw new InvalidOrderLogResponseError();
      }
      return entries;
    } catch (error: unknown) {
      throw toError(error, 'No fue posible cargar los avances de la orden.');
    }
  }

  /**
   * Registra una observación o acción. Solo el mecánico asignado o un
   * administrador; el autor y la fecha los fija MS2. No es idempotente: no se
   * reintenta automáticamente.
   *
   * Ruta Gateway: POST /api/ordenes/{orden_id}/bitacora
   */
  async addOrderLogEntry(
    orderId: string,
    input: CreateOrderLogEntryInput,
  ): Promise<OrderLogEntry> {
    const ordenId = requirePositiveId(orderId);
    const descripcion = input.description.trim();
    if (!descripcion) {
      throw new Error('Describe el avance realizado.');
    }
    if (input.type !== 'observacion' && input.type !== 'accion') {
      throw new Error('El tipo de avance no es válido.');
    }

    const payload: CreateOrderLogEntryRequestDto = { tipo: input.type, descripcion };

    try {
      const response = await apiClient.post(`/ordenes/${ordenId}/bitacora`, payload);
      const entry = mapOrderLogEntryResponse(response.data);
      if (entry.orderId !== String(ordenId)) {
        throw new InvalidOrderLogResponseError();
      }
      return entry;
    } catch (error: unknown) {
      throw toError(error, 'No fue posible registrar el avance.');
    }
  }
}

export const orderLogService = new OrderLogService();
