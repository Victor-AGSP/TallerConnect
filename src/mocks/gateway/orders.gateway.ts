import type { OrderResponseDto } from '@/dto/order.dto';

/**
 * Forma real de `OrdenRespuesta` en `/ms2/openapi.json`. Incluye `devuelto_en`
 * y `devuelto_por_id`, que el contrato declara obligatorios y `OrderResponseDto` no tiene.
 */
export type OrderGatewayResponse = OrderResponseDto & {
  devuelto_en: string | null;
  devuelto_por_id: number | null;
};

/**
 * Respuesta real de GET /api/ordenes obtenida con la cuenta de prueba del rol administrador.
 * Anonimización: los identificadores se reemplazaron por valores ficticios que mantienen
 * las relaciones entre registros (vehículos 1xx, órdenes 2xx, ingresos 3xx, usuarios 5xx),
 * con la misma correspondencia que `vehicles.gateway.ts`. El vehículo 104 es un vehículo
 * adicional de la respuesta del administrador y no está en la fixture de vehículos del rol
 * cliente. Las fechas se reemplazaron por valores ficticios que conservan su formato y su
 * orden. Los códigos de estado y los valores nulos se mantienen tal como los entregó la API.
 */
export const ordersGatewayResponse: OrderGatewayResponse[] = [
  {
    orden_id: 201,
    vehiculo_id: 101,
    ingreso_id: 301,
    estado_codigo: 6,
    mecanico_actual_id: 502,
    creado_por_id: 503,
    creado_en: '2026-01-05T10:15:30.123456Z',
    actualizado_en: '2026-01-20T16:40:12.654321Z',
    devuelto_en: null,
    devuelto_por_id: null,
  },
  {
    orden_id: 202,
    vehiculo_id: 102,
    ingreso_id: 302,
    estado_codigo: 5,
    mecanico_actual_id: 502,
    creado_por_id: 503,
    creado_en: '2026-01-07T09:05:10.111111Z',
    actualizado_en: '2026-01-25T11:30:45.222222Z',
    devuelto_en: null,
    devuelto_por_id: null,
  },
  {
    orden_id: 203,
    vehiculo_id: 104,
    ingreso_id: 303,
    estado_codigo: 8,
    mecanico_actual_id: 506,
    creado_por_id: 503,
    creado_en: '2026-02-02T14:00:00.333333Z',
    actualizado_en: '2026-02-02T15:30:00.444444Z',
    devuelto_en: '2026-02-02T15:30:00.444444Z',
    devuelto_por_id: 503,
  },
];