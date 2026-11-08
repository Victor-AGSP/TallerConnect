import { WorkOrderStatus } from '@/constants/orderStatus';
import { OrderResponseDto } from '@/dto/order.dto';

/**
 * Órdenes con la forma exacta de `OrdenRespuesta` (GET /api/ordenes),
 * una por cada `estado_codigo` del catálogo del backend.
 * Usan los ids de los usuarios de prueba de la API: mecánico `2` y administrador `3`.
 */
type BackendWorkOrderStatus = Exclude<
  WorkOrderStatus,
  'pausado_por_presupuesto_rechazado' | 'control_calidad'
>;

export const orderResponsePayloads: Record<BackendWorkOrderStatus, OrderResponseDto> = {
  recibido: {
    orden_id: 101,
    vehiculo_id: 3,
    ingreso_id: 201,
    estado_codigo: 1,
    mecanico_actual_id: null,
    creado_por_id: 3,
    creado_en: '2026-03-06T10:15:00Z',
    actualizado_en: '2026-03-06T10:15:00Z',
  },
  esperando_diagnostico: {
    orden_id: 102,
    vehiculo_id: 2,
    ingreso_id: 202,
    estado_codigo: 2,
    mecanico_actual_id: 2,
    creado_por_id: 3,
    creado_en: '2026-03-03T11:00:00Z',
    actualizado_en: '2026-03-03T15:30:00Z',
  },
  esperando_aprobacion_presupuesto: {
    orden_id: 103,
    vehiculo_id: 1,
    ingreso_id: 203,
    estado_codigo: 3,
    mecanico_actual_id: 2,
    creado_por_id: 3,
    creado_en: '2026-03-04T08:00:00Z',
    actualizado_en: '2026-03-04T08:00:00Z',
  },
  esperando_repuestos: {
    orden_id: 104,
    vehiculo_id: 2,
    ingreso_id: 204,
    estado_codigo: 4,
    mecanico_actual_id: 2,
    creado_por_id: 3,
    creado_en: '2026-02-20T09:30:00Z',
    actualizado_en: '2026-02-24T12:00:00Z',
  },
  en_reparacion: {
    orden_id: 105,
    vehiculo_id: 1,
    ingreso_id: 205,
    estado_codigo: 5,
    mecanico_actual_id: 2,
    creado_por_id: 3,
    creado_en: '2026-03-01T09:00:00Z',
    actualizado_en: '2026-03-05T14:00:00Z',
  },
  listo_para_entrega: {
    orden_id: 106,
    vehiculo_id: 3,
    ingreso_id: 206,
    estado_codigo: 6,
    mecanico_actual_id: 2,
    creado_por_id: 3,
    creado_en: '2026-02-15T08:45:00Z',
    actualizado_en: '2026-02-19T17:20:00Z',
  },
  entregado: {
    orden_id: 107,
    vehiculo_id: 1,
    ingreso_id: 207,
    estado_codigo: 7,
    mecanico_actual_id: 2,
    creado_por_id: 3,
    creado_en: '2026-01-10T09:00:00Z',
    actualizado_en: '2026-01-14T16:00:00Z',
  },
  cancelado: {
    orden_id: 108,
    vehiculo_id: 2,
    ingreso_id: 208,
    estado_codigo: 8,
    mecanico_actual_id: null,
    creado_por_id: 3,
    creado_en: '2026-01-22T10:00:00Z',
    actualizado_en: '2026-01-22T13:40:00Z',
  },
};

/**
 * Orden que cumple el tipo del DTO, pero con un `estado_codigo` fuera del catálogo.
 * Sirve para comprobar que el mapper la rechaza.
 */
type InvalidOrderCase = 'unknownStatus';

export const invalidOrderResponsePayloads: Record<InvalidOrderCase, OrderResponseDto> = {
  unknownStatus: {
    ...orderResponsePayloads.recibido,
    estado_codigo: 9,
  },
};