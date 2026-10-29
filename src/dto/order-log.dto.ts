/**
 * DTO de la bitácora de trabajo de una orden (MS2), tal como los publica su
 * contrato OpenAPI (`/ms2/openapi.json`). La app los consume a través de la
 * API Gateway (`/api/ordenes/{orden_id}/bitacora`).
 */

export type OrderLogTypeDto = 'observacion' | 'accion';

/** `RepuestoBitacoraRespuesta`. */
export interface OrderLogPartResponseDto {
  nombre: string;
  cantidad: number;
}

/** `BitacoraRespuesta`. */
export interface OrderLogEntryResponseDto {
  bitacora_id: number;
  orden_id: number;
  autor_usuario_id: number;
  tipo: OrderLogTypeDto;
  descripcion: string;
  creado_en: string;
  repuestos?: OrderLogPartResponseDto[];
}

/**
 * `BitacoraCrear`. No acepta estado, actor ni fecha: MS2 los toma del JWT y
 * del servidor. `repuestos` (solo para acciones) no se usa en esta vista.
 */
export interface CreateOrderLogEntryRequestDto {
  tipo: OrderLogTypeDto;
  descripcion: string;
}
