import type {
  CancellationRequestResponseDto,
  CancellationRequestStatus,
  DailyIntakeCapacityResponseDto,
  MechanicCapacityResponseDto,
  StockAlertPageResponseDto,
  StockAlertResponseDto,
} from '@/dto/notice.dto';
import type { PartResponseDto } from '@/dto/part.dto';
import { orderResponsePayloads } from './order.payload';
import { partPagePayload, partResponsePayloads } from './part.payload';

/**
 * Alerta de stock que corresponde a un repuesto de `partResponsePayloads`.
 * `faltan` es el umbral efectivo menos el stock. Lanza un error si el repuesto no tiene umbral efectivo,
 * porque `AlertaRepuesto` lo exige.
 */
function alertaDe(part: PartResponseDto): StockAlertResponseDto {
  if (part.umbral_efectivo === null) {
    throw new Error(`El repuesto ${part.repuesto_id} no tiene umbral efectivo.`);
  }

  return {
    repuesto_id: part.repuesto_id,
    nombre: part.nombre,
    proveedor_nombre: part.proveedor_nombre,
    stock: part.stock,
    umbral_efectivo: part.umbral_efectivo,
    faltan: part.umbral_efectivo - part.stock,
  };
}

/**
 * Alertas de stock con la forma exacta de `PaginaAlertas` (GET /api/inventario/alertas).
 * Corresponden a los repuestos de `partResponsePayloads` con `bajo_umbral: true`,
 * ordenados por los que más faltan primero.
 */
export const stockAlertPagePayload: StockAlertPageResponseDto = {
  umbral_general: partPagePayload.umbral_general,
  total: 2,
  alertas: [alertaDe(partResponsePayloads.sinStock), alertaDe(partResponsePayloads.bajoUmbral)],
};

type CancellationRequestCase = 'pendienteRecibido' | 'pendienteDiagnostico';

/**
 * Solicitudes de cancelación con la forma exacta de `SolicitudCancelacionRespuesta`
 * (GET /api/ordenes/cancelaciones/pendientes).
 * Pertenecen a órdenes de `orderResponsePayloads` que aún no tienen un presupuesto aprobado,
 * y `estado_al_solicitar` es el estado de esa orden. Las solicita el cliente de prueba de la API (`1`).
 */
export const cancellationRequestPayloads: Record<
  CancellationRequestCase,
  CancellationRequestResponseDto
> = {
  pendienteRecibido: {
    solicitud_id: 1,
    orden_id: orderResponsePayloads.recibido.orden_id,
    cliente_usuario_id: 1,
    estado_al_solicitar: orderResponsePayloads.recibido.estado_codigo,
    motivo: 'Ya no necesito el servicio',
    estado: 'pendiente',
    solicitada_en: '2026-03-06T12:00:00Z',
    administrador_id: null,
    confirmada_en: null,
  },
  pendienteDiagnostico: {
    solicitud_id: 2,
    orden_id: orderResponsePayloads.esperando_diagnostico.orden_id,
    cliente_usuario_id: 1,
    estado_al_solicitar: orderResponsePayloads.esperando_diagnostico.estado_codigo,
    motivo: 'Prefiero llevar el vehículo a otro taller',
    estado: 'pendiente',
    solicitada_en: '2026-03-03T16:00:00Z',
    administrador_id: null,
    confirmada_en: null,
  },
};

/**
 * Solicitudes que cumplen el tipo del DTO, pero con valores fuera del contrato.
 * Sirven para comprobar que los mappers las rechazan.
 */
type InvalidCancellationRequestCase = 'unknownStatus' | 'unknownOrderStatus';

export const invalidCancellationRequestPayloads: Record<
  InvalidCancellationRequestCase,
  CancellationRequestResponseDto
> = {
  unknownStatus: {
    ...cancellationRequestPayloads.pendienteRecibido,
    estado: 'rechazada' as CancellationRequestStatus,
  },
  unknownOrderStatus: {
    ...cancellationRequestPayloads.pendienteRecibido,
    estado_al_solicitar: 9,
  },
};

type MechanicCapacityCase = 'sinConfigurar' | 'dentroDelLimite' | 'sobreLimite';

/**
 * Límite de órdenes activas por mecánico con la forma exacta de `CapacidadMecanicoRespuesta`
 * (GET /api/ordenes/configuracion/capacidad/mecanicos).
 * En `orderResponsePayloads`, el mecánico de prueba (`2`) tiene 5 órdenes activas:
 * un límite de 5 no lo supera y uno de 3 sí.
 * El contrato no declara las claves de los objetos de `mecanicos_sobre_limite`, así que se simulan vacíos.
 */
export const mechanicCapacityPayloads: Record<MechanicCapacityCase, MechanicCapacityResponseDto> = {
  sinConfigurar: {
    max_ordenes_activas: null,
    actualizado_por_id: null,
    actualizado_en: '2026-01-05T09:00:00Z',
    mecanicos_sobre_limite: [],
  },
  dentroDelLimite: {
    max_ordenes_activas: 5,
    actualizado_por_id: 3,
    actualizado_en: '2026-03-01T08:00:00Z',
    mecanicos_sobre_limite: [],
  },
  sobreLimite: {
    max_ordenes_activas: 3,
    actualizado_por_id: 3,
    actualizado_en: '2026-03-06T09:00:00Z',
    mecanicos_sobre_limite: [{}],
  },
};

type DailyIntakeCase = 'sinConfigurar' | 'dentroDelCupo' | 'cupoExcedido';

/**
 * Cupo diario de ingresos físicos con la forma exacta de `CupoDiarioIngresosRespuesta`
 * (GET /api/ordenes/configuracion/capacidad/ingresos-diarios).
 * `jornada_local` es una fecha sin hora. En `dentroDelCupo`, el único ingreso de la jornada
 * es el de la orden `recibido` de `orderResponsePayloads`. `cupoExcedido` es un escenario independiente:
 * sus ingresos no corresponden a órdenes de los payloads, porque la respuesta solo entrega el contador.
 * Sin cupo configurado, `sobre_limite` es `false`.
 */
export const dailyIntakeCapacityPayloads: Record<DailyIntakeCase, DailyIntakeCapacityResponseDto> = {
  sinConfigurar: {
    max_ingresos_diarios: null,
    actualizado_por_id: null,
    actualizado_en: '2026-01-05T09:00:00Z',
    jornada_local: '2026-03-06',
    ingresos_registrados: 1,
    sobre_limite: false,
  },
  dentroDelCupo: {
    max_ingresos_diarios: 10,
    actualizado_por_id: 3,
    actualizado_en: '2026-03-01T08:00:00Z',
    jornada_local: '2026-03-06',
    ingresos_registrados: 1,
    sobre_limite: false,
  },
  cupoExcedido: {
    max_ingresos_diarios: 2,
    actualizado_por_id: 3,
    actualizado_en: '2026-03-07T09:00:00Z',
    jornada_local: '2026-03-07',
    ingresos_registrados: 3,
    sobre_limite: true,
  },
};