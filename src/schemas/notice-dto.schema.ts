import { z } from 'zod';

import type {
  CancellationRequestResponseDto,
  DailyIntakeCapacityResponseDto,
  MechanicCapacityResponseDto,
  StockAlertPageResponseDto,
  StockAlertResponseDto,
} from '@/dto/notice.dto';

/**
 * Valida un repuesto con stock bajo su umbral (contrato `AlertaRepuesto`).
 * A diferencia de `RepuestoSalida`, el contrato exige `umbral_efectivo` sin null.
 */
export const stockAlertResponseDtoSchema: z.ZodType<StockAlertResponseDto> = z.object({
  repuesto_id: z.number().int(),
  nombre: z.string(),
  proveedor_nombre: z.string(),
  stock: z.number().int(),
  umbral_efectivo: z.number().int(),
  faltan: z.number().int(),
});

/**
 * Valida las alertas de stock recibidas de la API (GET /api/inventario/alertas).
 * Comprueba la forma del contrato `PaginaAlertas`.
 */
export const stockAlertPageResponseDtoSchema: z.ZodType<StockAlertPageResponseDto> = z.object({
  umbral_general: z.number().int().nullable(),
  total: z.number().int(),
  alertas: z.array(stockAlertResponseDtoSchema),
});

/**
 * Valida una solicitud de cancelación recibida de la API (contrato `SolicitudCancelacionRespuesta`).
 * Comprueba que `estado_al_solicitar` sea un entero; su conversión al estado de la app sigue a cargo del mapper.
 */
export const cancellationRequestResponseDtoSchema: z.ZodType<CancellationRequestResponseDto> = z.object({
  solicitud_id: z.number().int(),
  orden_id: z.number().int(),
  cliente_usuario_id: z.number().int(),
  estado_al_solicitar: z.number().int(),
  motivo: z.string(),
  estado: z.enum(['pendiente', 'confirmada']),
  solicitada_en: z.iso.datetime({ offset: true }),
  administrador_id: z.number().int().nullable(),
  confirmada_en: z.iso.datetime({ offset: true }).nullable(),
});

/**
 * Valida la lista de solicitudes de cancelación recibida de la API (GET /api/ordenes/cancelaciones/pendientes).
 */
export const cancellationRequestListResponseDtoSchema = z.array(cancellationRequestResponseDtoSchema);

/**
 * Valida el límite de órdenes activas por mecánico recibido de la API
 * (GET /api/ordenes/configuracion/capacidad/mecanicos). Comprueba la forma del contrato
 * `CapacidadMecanicoRespuesta`. Los objetos de `mecanicos_sobre_limite` solo se validan
 * como valores enteros, porque el contrato no declara sus claves.
 */
export const mechanicCapacityResponseDtoSchema: z.ZodType<MechanicCapacityResponseDto> = z.object({
  max_ordenes_activas: z.number().int().nullable(),
  actualizado_por_id: z.number().int().nullable(),
  actualizado_en: z.iso.datetime({ offset: true }),
  mecanicos_sobre_limite: z.array(z.record(z.string(), z.number().int())),
});

/**
 * Valida el cupo diario de ingresos recibido de la API
 * (GET /api/ordenes/configuracion/capacidad/ingresos-diarios).
 * Comprueba la forma del contrato `CupoDiarioIngresosRespuesta`; `jornada_local` es una fecha sin hora.
 */
export const dailyIntakeCapacityResponseDtoSchema: z.ZodType<DailyIntakeCapacityResponseDto> = z.object({
  max_ingresos_diarios: z.number().int().nullable(),
  actualizado_por_id: z.number().int().nullable(),
  actualizado_en: z.iso.datetime({ offset: true }),
  jornada_local: z.iso.date(),
  ingresos_registrados: z.number().int(),
  sobre_limite: z.boolean(),
});