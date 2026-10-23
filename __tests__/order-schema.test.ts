import {
  invalidOrderResponsePayloads,
  orderResponsePayloads,
} from '@/mocks/payloads/order.payload';
import {
  orderListResponseDtoSchema,
  orderResponseDtoSchema,
} from '@/schemas/order-dto.schema';

/** Campos obligatorios de `OrdenRespuesta` en el contrato de MS2 (`/ms2/openapi.json`). */
const CAMPOS_OBLIGATORIOS = [
  'orden_id',
  'vehiculo_id',
  'ingreso_id',
  'estado_codigo',
  'mecanico_actual_id',
  'creado_por_id',
  'creado_en',
  'actualizado_en',
] as const;

const orden = orderResponsePayloads.en_reparacion;

describe('Esquema de orden de trabajo recibida de la API (OrdenRespuesta)', () => {
  describe('datos válidos', () => {
    it.each(Object.entries(orderResponsePayloads))(
      'acepta la orden de ejemplo en estado "%s"',
      (_estado, payload) => {
        expect(orderResponseDtoSchema.safeParse(payload).success).toBe(true);
      },
    );

    it('acepta mecanico_actual_id en null', () => {
      const payload = { ...orden, mecanico_actual_id: null };

      expect(orderResponseDtoSchema.safeParse(payload).success).toBe(true);
    });

    it('acepta un estado_codigo fuera del catálogo, porque esa comprobación corresponde al mapper', () => {
      const payload = invalidOrderResponsePayloads.unknownStatus;

      expect(orderResponseDtoSchema.safeParse(payload).success).toBe(true);
    });
  });

  describe('campos obligatorios', () => {
    it.each(CAMPOS_OBLIGATORIOS)('rechaza una orden sin %s', (campo) => {
      const payload: Record<string, unknown> = { ...orden };
      delete payload[campo];

      expect(orderResponseDtoSchema.safeParse(payload).success).toBe(false);
    });
  });

  describe('tipos', () => {
    it.each([
      ['orden_id como texto', { orden_id: '105' }],
      ['orden_id decimal', { orden_id: 105.5 }],
      ['vehiculo_id como texto', { vehiculo_id: '1' }],
      ['estado_codigo como texto', { estado_codigo: 'en_reparacion' }],
      ['estado_codigo decimal', { estado_codigo: 5.5 }],
      ['mecanico_actual_id como texto', { mecanico_actual_id: '2' }],
    ])('rechaza %s', (_caso, cambio) => {
      expect(orderResponseDtoSchema.safeParse({ ...orden, ...cambio }).success).toBe(false);
    });

    it.each(['orden_id', 'vehiculo_id', 'ingreso_id', 'estado_codigo', 'creado_por_id', 'creado_en'])(
      'rechaza null en %s, que el contrato no admite como nulo',
      (campo) => {
        expect(orderResponseDtoSchema.safeParse({ ...orden, [campo]: null }).success).toBe(false);
      },
    );
  });

  describe('fechas', () => {
    it.each([
      ['UTC con Z', '2026-03-01T09:00:00Z'],
      ['con desplazamiento horario', '2026-03-01T09:00:00-03:00'],
      ['con fracciones de segundo', '2026-03-01T09:00:00.123456+00:00'],
    ])('acepta una fecha %s', (_caso, fecha) => {
      expect(orderResponseDtoSchema.safeParse({ ...orden, creado_en: fecha }).success).toBe(true);
    });

    it.each([
      ['sin zona horaria', '2026-03-01T09:00:00'],
      ['solo con la fecha', '2026-03-01'],
      ['en formato no ISO', '01-03-2026 09:00'],
      ['como texto cualquiera', 'ayer'],
    ])('rechaza una fecha %s en creado_en y en actualizado_en', (_caso, fecha) => {
      expect(orderResponseDtoSchema.safeParse({ ...orden, creado_en: fecha }).success).toBe(false);
      expect(orderResponseDtoSchema.safeParse({ ...orden, actualizado_en: fecha }).success).toBe(false);
    });
  });

  describe('listas', () => {
    it('acepta la lista con todas las órdenes de ejemplo', () => {
      const lista = Object.values(orderResponsePayloads);

      expect(orderListResponseDtoSchema.safeParse(lista).success).toBe(true);
    });

    it('acepta una lista vacía', () => {
      expect(orderListResponseDtoSchema.safeParse([]).success).toBe(true);
    });

    it('rechaza una lista con una orden inválida', () => {
      const lista = [orden, { ...orden, creado_en: '2026-03-01' }];

      expect(orderListResponseDtoSchema.safeParse(lista).success).toBe(false);
    });
  });
});