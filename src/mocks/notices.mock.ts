import {
  mapDailyIntakeExceededNotice,
  mapLowStockNotices,
  mapMechanicsOverLimitNotice,
  mapPendingCancellationNotices,
} from '@/mappers/notice.mapper';
import {
  cancellationRequestPayloads,
  dailyIntakeCapacityPayloads,
  mechanicCapacityPayloads,
  stockAlertPagePayload,
} from '@/mocks/payloads/notice.payload';
import type { Notice } from '@/models/notice.model';

/**
 * Avisos simulados derivados de los payloads de los contratos MS2 y MS3.
 * Corresponden al mismo momento que `mockAdminSummary`: incluyen los cuatro tipos de aviso.
 */
export const mockNotices: Notice[] = [
  ...mapLowStockNotices(stockAlertPagePayload),
  ...mapPendingCancellationNotices(Object.values(cancellationRequestPayloads)),
  mapMechanicsOverLimitNotice(mechanicCapacityPayloads.sobreLimite),
  mapDailyIntakeExceededNotice(dailyIntakeCapacityPayloads.cupoExcedido),
].filter((notice): notice is Notice => notice !== null);