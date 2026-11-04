/**
 * Repuesto con stock bajo su umbral efectivo (`AlertaRepuesto` del contrato MS3).
 */
export interface StockAlertResponseDto {
  repuesto_id: number;
  nombre: string;
  proveedor_nombre: string;
  stock: number;
  umbral_efectivo: number;
  faltan: number;
}

/**
 * Alertas de stock (`PaginaAlertas` del contrato MS3).
 * Respuesta de GET /api/inventario/alertas, ordenada por los repuestos que más faltan primero.
 */
export interface StockAlertPageResponseDto {
  umbral_general: number | null;
  total: number;
  alertas: StockAlertResponseDto[];
}

/**
 * Estado de una solicitud de cancelación en el contrato MS2.
 */
export type CancellationRequestStatus = 'pendiente' | 'confirmada';

/**
 * Solicitud de cancelación de una orden (`SolicitudCancelacionRespuesta` del contrato MS2).
 * Respuesta de GET /api/ordenes/cancelaciones/pendientes (lista) y de POST /api/ordenes/{orden_id}/cancelacion.
 * `estado_al_solicitar` es el `estado_codigo` (1 a 8) que tenía la orden al pedir la cancelación.
 */
export interface CancellationRequestResponseDto {
  solicitud_id: number;
  orden_id: number;
  cliente_usuario_id: number;
  estado_al_solicitar: number;
  motivo: string;
  estado: CancellationRequestStatus;
  solicitada_en: string;
  administrador_id: number | null;
  confirmada_en: string | null;
}

/**
 * Límite de órdenes activas por mecánico (`CapacidadMecanicoRespuesta` del contrato MS2).
 * Respuesta de GET /api/ordenes/configuracion/capacidad/mecanicos.
 * El contrato declara `mecanicos_sobre_limite` como objetos con valores enteros, sin declarar sus claves.
 */
export interface MechanicCapacityResponseDto {
  max_ordenes_activas: number | null;
  actualizado_por_id: number | null;
  actualizado_en: string;
  mecanicos_sobre_limite: Record<string, number>[];
}

/**
 * Cupo diario de ingresos físicos (`CupoDiarioIngresosRespuesta` del contrato MS2).
 * Respuesta de GET /api/ordenes/configuracion/capacidad/ingresos-diarios.
 * `jornada_local` es una fecha sin hora (`YYYY-MM-DD`).
 */
export interface DailyIntakeCapacityResponseDto {
  max_ingresos_diarios: number | null;
  actualizado_por_id: number | null;
  actualizado_en: string;
  jornada_local: string;
  ingresos_registrados: number;
  sobre_limite: boolean;
}