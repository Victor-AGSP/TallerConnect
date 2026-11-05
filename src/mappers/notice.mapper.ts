import type {
  CancellationRequestResponseDto,
  CancellationRequestStatus,
  DailyIntakeCapacityResponseDto,
  MechanicCapacityResponseDto,
  StockAlertPageResponseDto,
} from '@/dto/notice.dto';
import type {
  DailyIntakeExceededNotice,
  LowStockNotice,
  MechanicsOverLimitNotice,
  PendingCancellationNotice,
} from '@/models/notice.model';
import { mapOrderStatus } from './order.mapper';

/**
 * Estados de una solicitud de cancelación definidos en el contrato MS2.
 */
const CANCELLATION_REQUEST_STATUSES: readonly CancellationRequestStatus[] = [
  'pendiente',
  'confirmada',
];

/**
 * Indica si una solicitud de cancelación está pendiente de revisión.
 * Lanza un error si su estado no pertenece al contrato, en lugar de ignorarla.
 */
export function isPendingCancellationRequest(dto: CancellationRequestResponseDto): boolean {
  if (!CANCELLATION_REQUEST_STATUSES.includes(dto.estado)) {
    throw new Error(`Estado de solicitud de cancelación desconocido: ${dto.estado}`);
  }
  return dto.estado === 'pendiente';
}

/**
 * Mapea las alertas de stock a avisos de stock bajo, uno por repuesto.
 */
export function mapLowStockNotices(dto: StockAlertPageResponseDto): LowStockNotice[] {
  return dto.alertas.map(
    (alerta): LowStockNotice => ({
      type: 'low_stock',
      partId: String(alerta.repuesto_id),
      partName: alerta.nombre,
      providerName: alerta.proveedor_nombre,
      stock: alerta.stock,
      effectiveThreshold: alerta.umbral_efectivo,
      missingUnits: alerta.faltan,
    }),
  );
}

/**
 * Mapea las solicitudes de cancelación a avisos de cancelación pendiente.
 * Solo las solicitudes en estado `pendiente` generan un aviso.
 * Lanza un error si el estado de una solicitud no pertenece al contrato
 * o si `estado_al_solicitar` no pertenece al catálogo de estados de orden.
 */
export function mapPendingCancellationNotices(
  dtos: CancellationRequestResponseDto[],
): PendingCancellationNotice[] {
  return dtos.filter(isPendingCancellationRequest).map(
    (dto): PendingCancellationNotice => ({
      type: 'pending_cancellation',
      requestId: String(dto.solicitud_id),
      orderId: String(dto.orden_id),
      clientUserId: String(dto.cliente_usuario_id),
      orderStatusAtRequest: mapOrderStatus(dto.estado_al_solicitar),
      reason: dto.motivo,
      requestedAt: dto.solicitada_en,
    }),
  );
}

/**
 * Mapea el límite de órdenes activas por mecánico a un aviso de mecánicos sobre el límite.
 * Devuelve `null` si ningún mecánico supera el límite.
 */
export function mapMechanicsOverLimitNotice(
  dto: MechanicCapacityResponseDto,
): MechanicsOverLimitNotice | null {
  if (dto.mecanicos_sobre_limite.length === 0) {
    return null;
  }

  return {
    type: 'mechanics_over_limit',
    maxActiveOrdersPerMechanic: dto.max_ordenes_activas,
    mechanicsOverLimit: dto.mecanicos_sobre_limite.length,
  };
}

/**
 * Mapea el cupo diario de ingresos a un aviso de cupo excedido.
 * Devuelve `null` si el cupo no se superó (`sobre_limite` es `false`).
 */
export function mapDailyIntakeExceededNotice(
  dto: DailyIntakeCapacityResponseDto,
): DailyIntakeExceededNotice | null {
  if (!dto.sobre_limite) {
    return null;
  }

  return {
    type: 'daily_intake_exceeded',
    localDate: dto.jornada_local,
    maxDailyIntakes: dto.max_ingresos_diarios,
    registeredIntakes: dto.ingresos_registrados,
  };
}