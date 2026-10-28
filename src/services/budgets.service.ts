import axios from 'axios';

import { apiClient } from '@/services/api/client';
import { normalizeApiError } from '@/services/api/interceptors';
import type {
  BudgetDecisionRequestDto,
  BudgetDetailResponseDto,
  BudgetOperationResultDto,
  BudgetsPageDto,
  DecisionApplicationPendingDto,
} from '@/dto/budget.dto';
import {
  INVALID_BUDGET_RESPONSE,
  mapBudgetDetailResponse,
  mapBudgetOperationResult,
} from '@/mappers/budget.mapper';
import type {
  Budget,
  BudgetDecisionInput,
  BudgetDecisionResult,
} from '@/models/budget.model';
import { mockBudgetsByOrder } from '@/mocks/budgets.mock';

const USE_MOCKS = process.env.EXPO_PUBLIC_USE_MOCK_AUTH === 'true';

const SERVICE_UNAVAILABLE = 503;

/**
 * La decisión quedó registrada en el MS3, pero no se confirmó su aplicación
 * en la orden (503 `DecisionAplicacionPendiente`). Se reintenta con
 * `retryDecisionApplication(decisionId)` sin volver a decidir.
 */
export class DecisionApplicationPendingError extends Error {
  readonly decisionId: string;

  constructor(message: string, decisionId: string) {
    super(message);
    this.name = 'DecisionApplicationPendingError';
    this.decisionId = decisionId;
  }
}

/** `maxLength` de `DecisionEntrada.motivo` (MS3). */
const DECISION_REASON_MAX_LENGTH = 1000;

/** Identificador entero positivo, como exige el contrato. */
function requirePositiveId(id: string, message: string): number {
  if (!/^[1-9]\d*$/.test(id)) {
    throw new Error(message);
  }
  return Number(id);
}

/** Detecta la respuesta 503 que indica una decisión ya registrada. */
function toPendingApplicationError(
  error: unknown,
): DecisionApplicationPendingError | null {
  if (!axios.isAxiosError(error)) return null;
  if (error.response?.status !== SERVICE_UNAVAILABLE) return null;

  const data = error.response.data as Partial<DecisionApplicationPendingDto> | undefined;
  if (typeof data?.decision_id !== 'number') return null;

  return new DecisionApplicationPendingError(
    'Tu decisión quedó registrada, pero la orden aún no refleja el cambio.',
    String(data.decision_id),
  );
}

/**
 * Presupuestos de las órdenes de trabajo (MS3) a través de la API Gateway.
 */
export class BudgetsService {
  /**
   * Presupuesto de una orden con sus versiones, o `null` si la orden aún no
   * tiene presupuesto (o el cliente no tiene versiones enviadas visibles).
   *
   * Rutas Gateway: GET /api/presupuestos?orden_id={id} y
   * GET /api/presupuestos/{presupuesto_id}
   */
  async getBudgetForOrder(orderId: string): Promise<Budget | null> {
    if (USE_MOCKS) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return mockBudgetsByOrder[orderId] ?? null;
    }

    const ordenId = requirePositiveId(
      orderId,
      'El identificador de la orden no es válido.',
    );

    try {
      const page = await apiClient.get<BudgetsPageDto>('/presupuestos', {
        params: { orden_id: ordenId },
      });

      const summaries = page.data?.presupuestos;
      if (!Array.isArray(summaries)) {
        throw new Error(INVALID_BUDGET_RESPONSE);
      }

      const summary = summaries.find((item) => item?.orden_id === ordenId);
      if (!summary) return null;

      const detail = await apiClient.get<BudgetDetailResponseDto>(
        `/presupuestos/${summary.presupuesto_id}`,
      );
      return mapBudgetDetailResponse(detail.data);
    } catch (error: unknown) {
      const normalized = normalizeApiError(error);
      throw new Error(normalized.message || 'No fue posible cargar el presupuesto.');
    }
  }

  /**
   * Aprueba o rechaza una versión enviada (solo el cliente dueño de la orden).
   * El MS3 registra la decisión y solicita al MS2 su aplicación en la orden.
   *
   * Ruta Gateway: POST /api/presupuestos/{presupuesto_id}/versiones/{numero}/decision
   *
   * @throws DecisionApplicationPendingError si la decisión quedó registrada
   *   pero su aplicación en la orden está pendiente.
   */
  async decideBudgetVersion(
    budgetId: string,
    versionNumber: number,
    input: BudgetDecisionInput,
  ): Promise<BudgetDecisionResult> {
    const presupuestoId = requirePositiveId(
      budgetId,
      'El identificador del presupuesto no es válido.',
    );
    if (!Number.isInteger(versionNumber) || versionNumber < 1) {
      throw new Error('La versión del presupuesto no es válida.');
    }
    const reason = input.reason?.trim() ?? '';

    if (input.decision === 'rechazado' && !reason) {
      throw new Error('Indica el motivo del rechazo.');
    }
    if (reason.length > DECISION_REASON_MAX_LENGTH) {
      throw new Error(
        `El motivo admite como máximo ${DECISION_REASON_MAX_LENGTH} caracteres.`,
      );
    }

    if (USE_MOCKS) {
      throw new Error('Las decisiones de presupuesto requieren conexión con el servidor.');
    }

    const payload: BudgetDecisionRequestDto = {
      decision: input.decision,
      motivo: reason || null,
      confirmar_cancelacion: input.confirmCancellation === true,
    };

    try {
      const response = await apiClient.post<BudgetOperationResultDto>(
        `/presupuestos/${presupuestoId}/versiones/${versionNumber}/decision`,
        payload,
      );
      return mapBudgetOperationResult(response.data);
    } catch (error: unknown) {
      const pending = toPendingApplicationError(error);
      if (pending) throw pending;

      const normalized = normalizeApiError(error);
      throw new Error(normalized.message || 'No fue posible registrar tu decisión.');
    }
  }

  /**
   * Reintenta aplicar en la orden una decisión inicial ya registrada, sin
   * crear otra.
   *
   * Ruta Gateway: POST /api/presupuestos/decisiones/{decision_id}/aplicacion
   *
   * @throws DecisionApplicationPendingError si la aplicación sigue pendiente.
   */
  async retryDecisionApplication(decisionId: string): Promise<void> {
    const id = requirePositiveId(
      decisionId,
      'El identificador de la decisión no es válido.',
    );

    try {
      await apiClient.post(`/presupuestos/decisiones/${id}/aplicacion`);
    } catch (error: unknown) {
      const pending = toPendingApplicationError(error);
      if (pending) throw pending;

      const normalized = normalizeApiError(error);
      throw new Error(
        normalized.message || 'No fue posible aplicar la decisión en la orden.',
      );
    }
  }
}

export const budgetsService = new BudgetsService();
