import type { CancellationRequestResponseDto } from '@/dto/notice.dto';
import {
  buildAdminSummary,
  mapAdminBudgetSummary,
  mapAdminCancellationSummary,
  mapAdminOrderSummary,
  mapAdminUserSummary,
} from '@/mappers/admin.mapper';
import {
  mapDailyIntakeExceededNotice,
  mapMechanicsOverLimitNotice,
  mapPendingCancellationNotices,
} from '@/mappers/notice.mapper';
import { invalidUserResponsePayloads } from '@/mocks/payloads/auth.payload';
import { budgetPagePayload } from '@/mocks/payloads/budget.payload';
import {
  cancellationRequestPayloads,
  dailyIntakeCapacityPayloads,
  invalidCancellationRequestPayloads,
  mechanicCapacityPayloads,
} from '@/mocks/payloads/notice.payload';
import { invalidOrderResponsePayloads } from '@/mocks/payloads/order.payload';
import type { BudgetVersionStatus } from '@/models/budget.model';

const solicitudConfirmada: CancellationRequestResponseDto = {
  ...cancellationRequestPayloads.pendienteRecibido,
  solicitud_id: 3,
  estado: 'confirmada',
  administrador_id: 3,
  confirmada_en: '2026-03-06T13:00:00-03:00',
};

const solicitudes = [...Object.values(cancellationRequestPayloads), solicitudConfirmada];

describe('Validación del resumen administrativo', () => {
  it('rechaza una orden con un estado_codigo fuera del catálogo', () => {
    expect(() => mapAdminOrderSummary([invalidOrderResponsePayloads.unknownStatus])).toThrow(
      'Estado de orden desconocido: 9',
    );
  });

  it('rechaza un usuario con un rol que no pertenece a la app', () => {
    expect(() => mapAdminUserSummary([invalidUserResponsePayloads.unknownRole])).toThrow(
      'Rol de usuario desconocido: supervisor',
    );
  });

  it('rechaza un presupuesto con un estado fuera del contrato', () => {
    const presupuesto = {
      ...budgetPagePayload.presupuestos[0],
      estado_ultima_version: 'archivada' as BudgetVersionStatus,
    };

    expect(() => mapAdminBudgetSummary([presupuesto])).toThrow('Estado de presupuesto desconocido: archivada');
  });

  it('rechaza una solicitud de cancelación con un estado fuera del contrato', () => {
    expect(() => mapAdminCancellationSummary([invalidCancellationRequestPayloads.unknownStatus])).toThrow(
      'Estado de solicitud de cancelación desconocido: rechazada',
    );
  });

  it('solo cuenta las solicitudes de cancelación pendientes', () => {
    expect(mapAdminCancellationSummary(solicitudes)).toEqual({ pendingCount: 2 });
  });

  it('deja en null las secciones no disponibles', () => {
    expect(buildAdminSummary({})).toEqual({
      orders: null,
      vehicles: null,
      users: null,
      budgets: null,
      inventory: null,
      cancellations: null,
      mechanicCapacity: null,
      dailyIntake: null,
    });
  });
});

describe('Validación de los avisos', () => {
  it('rechaza una solicitud de cancelación con un estado fuera del contrato', () => {
    expect(() => mapPendingCancellationNotices([invalidCancellationRequestPayloads.unknownStatus])).toThrow(
      'Estado de solicitud de cancelación desconocido: rechazada',
    );
  });

  it('rechaza una solicitud con un estado_al_solicitar fuera del catálogo', () => {
    expect(() => mapPendingCancellationNotices([invalidCancellationRequestPayloads.unknownOrderStatus])).toThrow(
      'Estado de orden desconocido: 9',
    );
  });

  it('solo genera avisos para las solicitudes pendientes', () => {
    const avisos = mapPendingCancellationNotices(solicitudes);

    expect(avisos.map((aviso) => aviso.requestId)).toEqual(['1', '2']);
  });

  it.each(['sinConfigurar', 'dentroDelLimite'] as const)(
    'no genera aviso de capacidad en el caso "%s"',
    (caso) => {
      expect(mapMechanicsOverLimitNotice(mechanicCapacityPayloads[caso])).toBeNull();
    },
  );

  it('genera el aviso de capacidad cuando hay mecánicos sobre el límite', () => {
    expect(mapMechanicsOverLimitNotice(mechanicCapacityPayloads.sobreLimite)).not.toBeNull();
  });

  it.each(['sinConfigurar', 'dentroDelCupo'] as const)('no genera aviso de cupo en el caso "%s"', (caso) => {
    expect(mapDailyIntakeExceededNotice(dailyIntakeCapacityPayloads[caso])).toBeNull();
  });

  it('genera el aviso de cupo cuando se superó', () => {
    expect(mapDailyIntakeExceededNotice(dailyIntakeCapacityPayloads.cupoExcedido)).not.toBeNull();
  });
});