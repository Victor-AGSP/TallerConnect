import {
  cancellationRequestPayloads,
  dailyIntakeCapacityPayloads,
  invalidCancellationRequestPayloads,
  mechanicCapacityPayloads,
  stockAlertPagePayload,
} from '@/mocks/payloads/notice.payload';
import {
  cancellationRequestListResponseDtoSchema,
  cancellationRequestResponseDtoSchema,
  dailyIntakeCapacityResponseDtoSchema,
  mechanicCapacityResponseDtoSchema,
  stockAlertPageResponseDtoSchema,
  stockAlertResponseDtoSchema,
} from '@/schemas/notice-dto.schema';

/** Campos obligatorios definidos por los contratos de MS2 y MS3 (`/ms2/openapi.json`, `/ms3/openapi.json`). */
const CAMPOS_OBLIGATORIOS_ALERTA = [
  'repuesto_id',
  'nombre',
  'proveedor_nombre',
  'stock',
  'umbral_efectivo',
  'faltan',
] as const;

const CAMPOS_OBLIGATORIOS_PAGINA_ALERTAS = ['umbral_general', 'total', 'alertas'] as const;

const CAMPOS_OBLIGATORIOS_SOLICITUD = [
  'solicitud_id',
  'orden_id',
  'cliente_usuario_id',
  'estado_al_solicitar',
  'motivo',
  'estado',
  'solicitada_en',
  'administrador_id',
  'confirmada_en',
] as const;

const CAMPOS_OBLIGATORIOS_CAPACIDAD = [
  'max_ordenes_activas',
  'actualizado_por_id',
  'actualizado_en',
  'mecanicos_sobre_limite',
] as const;

const CAMPOS_OBLIGATORIOS_CUPO = [
  'max_ingresos_diarios',
  'actualizado_por_id',
  'actualizado_en',
  'jornada_local',
  'ingresos_registrados',
  'sobre_limite',
] as const;

const alerta = stockAlertPagePayload.alertas[0];
const solicitud = cancellationRequestPayloads.pendienteRecibido;
const capacidad = mechanicCapacityPayloads.sobreLimite;
const cupo = dailyIntakeCapacityPayloads.cupoExcedido;

const sin = (objeto: object, campo: string) => {
  const copia: Record<string, unknown> = { ...objeto };
  delete copia[campo];
  return copia;
};

describe('Esquema de alertas de stock recibidas de la API (PaginaAlertas)', () => {
  describe('datos válidos', () => {
    it('acepta la página de alertas de ejemplo', () => {
      expect(stockAlertPageResponseDtoSchema.safeParse(stockAlertPagePayload).success).toBe(true);
    });

    it.each(stockAlertPagePayload.alertas.map((item) => [item.nombre, item] as const))(
      'acepta la alerta de "%s"',
      (_nombre, item) => {
        expect(stockAlertResponseDtoSchema.safeParse(item).success).toBe(true);
      },
    );

    it('acepta umbral_general en null', () => {
      const pagina = { ...stockAlertPagePayload, umbral_general: null };

      expect(stockAlertPageResponseDtoSchema.safeParse(pagina).success).toBe(true);
    });
  });

  describe('campos obligatorios', () => {
    it.each(CAMPOS_OBLIGATORIOS_ALERTA)('rechaza una alerta sin %s', (campo) => {
      expect(stockAlertResponseDtoSchema.safeParse(sin(alerta, campo)).success).toBe(false);
    });

    it.each(CAMPOS_OBLIGATORIOS_PAGINA_ALERTAS)('rechaza una página sin %s', (campo) => {
      expect(stockAlertPageResponseDtoSchema.safeParse(sin(stockAlertPagePayload, campo)).success).toBe(false);
    });
  });

  describe('tipos', () => {
    it.each([
      ['repuesto_id como texto', { repuesto_id: '12' }],
      ['nombre como número', { nombre: 12 }],
      ['proveedor_nombre en null', { proveedor_nombre: null }],
      ['stock decimal', { stock: 1.5 }],
      ['umbral_efectivo en null', { umbral_efectivo: null }],
      ['faltan como texto', { faltan: '5' }],
    ])('rechaza una alerta con %s', (_caso, cambio) => {
      expect(stockAlertResponseDtoSchema.safeParse({ ...alerta, ...cambio }).success).toBe(false);
    });

    it.each([
      ['total como texto', { total: '2' }],
      ['umbral_general como texto', { umbral_general: '5' }],
    ])('rechaza una página con %s', (_caso, cambio) => {
      expect(stockAlertPageResponseDtoSchema.safeParse({ ...stockAlertPagePayload, ...cambio }).success).toBe(false);
    });

    it('rechaza una página cuyas alertas no son una lista', () => {
      const pagina = { ...stockAlertPagePayload, alertas: alerta };

      expect(stockAlertPageResponseDtoSchema.safeParse(pagina).success).toBe(false);
    });

    it('rechaza una página con una alerta inválida', () => {
      const pagina = { ...stockAlertPagePayload, alertas: [{ ...alerta, repuesto_id: '12' }] };

      expect(stockAlertPageResponseDtoSchema.safeParse(pagina).success).toBe(false);
    });
  });
});

describe('Esquema de solicitud de cancelación recibida de la API (SolicitudCancelacionRespuesta)', () => {
  describe('datos válidos', () => {
    it.each(Object.entries(cancellationRequestPayloads))('acepta la solicitud de ejemplo "%s"', (_caso, payload) => {
      expect(cancellationRequestResponseDtoSchema.safeParse(payload).success).toBe(true);
    });

    it('acepta una solicitud confirmada, con administrador y fecha de confirmación', () => {
      const confirmada = {
        ...solicitud,
        estado: 'confirmada',
        administrador_id: 3,
        confirmada_en: '2026-03-06T13:00:00-03:00',
      };

      expect(cancellationRequestResponseDtoSchema.safeParse(confirmada).success).toBe(true);
    });

    it('acepta la lista de solicitudes de ejemplo', () => {
      const lista = Object.values(cancellationRequestPayloads);

      expect(cancellationRequestListResponseDtoSchema.safeParse(lista).success).toBe(true);
    });
  });

  describe('campos obligatorios', () => {
    it.each(CAMPOS_OBLIGATORIOS_SOLICITUD)('rechaza una solicitud sin %s', (campo) => {
      expect(cancellationRequestResponseDtoSchema.safeParse(sin(solicitud, campo)).success).toBe(false);
    });
  });

  describe('tipos y valores', () => {
    it.each([
      ['solicitud_id como texto', { solicitud_id: '1' }],
      ['orden_id como texto', { orden_id: '101' }],
      ['cliente_usuario_id decimal', { cliente_usuario_id: 1.5 }],
      ['estado_al_solicitar como texto', { estado_al_solicitar: '1' }],
      ['motivo en null', { motivo: null }],
      ['solicitada_en sin formato de fecha', { solicitada_en: '06-03-2026' }],
      ['administrador_id como texto', { administrador_id: '3' }],
      ['confirmada_en sin formato de fecha', { confirmada_en: 'ayer' }],
    ])('rechaza una solicitud con %s', (_caso, cambio) => {
      expect(cancellationRequestResponseDtoSchema.safeParse({ ...solicitud, ...cambio }).success).toBe(false);
    });

    it('rechaza una solicitud con un estado fuera del contrato', () => {
      const resultado = cancellationRequestResponseDtoSchema.safeParse(invalidCancellationRequestPayloads.unknownStatus);

      expect(resultado.success).toBe(false);
    });

    it('acepta un estado_al_solicitar fuera del catálogo, porque su conversión la valida el mapper', () => {
      const resultado = cancellationRequestResponseDtoSchema.safeParse(
        invalidCancellationRequestPayloads.unknownOrderStatus,
      );

      expect(resultado.success).toBe(true);
    });
  });
});

describe('Esquema de capacidad de mecánicos recibida de la API (CapacidadMecanicoRespuesta)', () => {
  describe('datos válidos', () => {
    it.each(Object.entries(mechanicCapacityPayloads))('acepta la capacidad de ejemplo "%s"', (_caso, payload) => {
      expect(mechanicCapacityResponseDtoSchema.safeParse(payload).success).toBe(true);
    });
  });

  describe('campos obligatorios', () => {
    it.each(CAMPOS_OBLIGATORIOS_CAPACIDAD)('rechaza una capacidad sin %s', (campo) => {
      expect(mechanicCapacityResponseDtoSchema.safeParse(sin(capacidad, campo)).success).toBe(false);
    });
  });

  describe('tipos', () => {
    it.each([
      ['max_ordenes_activas como texto', { max_ordenes_activas: '3' }],
      ['actualizado_por_id como texto', { actualizado_por_id: '3' }],
      ['actualizado_en sin formato de fecha', { actualizado_en: '06-03-2026' }],
      ['mecanicos_sobre_limite que no es una lista', { mecanicos_sobre_limite: {} }],
    ])('rechaza una capacidad con %s', (_caso, cambio) => {
      expect(mechanicCapacityResponseDtoSchema.safeParse({ ...capacidad, ...cambio }).success).toBe(false);
    });

    it('rechaza un mecánico sobre el límite con un valor que no es entero', () => {
      const payload = { ...capacidad, mecanicos_sobre_limite: [{ ordenes: 4.5 }] };

      expect(mechanicCapacityResponseDtoSchema.safeParse(payload).success).toBe(false);
    });

    it('rechaza un mecánico sobre el límite con un valor de texto', () => {
      const payload = { ...capacidad, mecanicos_sobre_limite: [{ ordenes: 'cuatro' }] };

      expect(mechanicCapacityResponseDtoSchema.safeParse(payload).success).toBe(false);
    });
  });
});

describe('Esquema de cupo diario recibido de la API (CupoDiarioIngresosRespuesta)', () => {
  describe('datos válidos', () => {
    it.each(Object.entries(dailyIntakeCapacityPayloads))('acepta el cupo de ejemplo "%s"', (_caso, payload) => {
      expect(dailyIntakeCapacityResponseDtoSchema.safeParse(payload).success).toBe(true);
    });
  });

  describe('campos obligatorios', () => {
    it.each(CAMPOS_OBLIGATORIOS_CUPO)('rechaza un cupo sin %s', (campo) => {
      expect(dailyIntakeCapacityResponseDtoSchema.safeParse(sin(cupo, campo)).success).toBe(false);
    });
  });

  describe('jornada_local como fecha sin hora', () => {
    it.each(['2026-03-07T00:00:00Z', '07-03-2026'])('rechaza la jornada "%s"', (jornada) => {
      const payload = { ...cupo, jornada_local: jornada };

      expect(dailyIntakeCapacityResponseDtoSchema.safeParse(payload).success).toBe(false);
    });
  });

  describe('tipos', () => {
    it.each([
      ['max_ingresos_diarios como texto', { max_ingresos_diarios: '2' }],
      ['actualizado_por_id como texto', { actualizado_por_id: '3' }],
      ['actualizado_en sin formato de fecha', { actualizado_en: '07-03-2026' }],
      ['ingresos_registrados decimal', { ingresos_registrados: 3.5 }],
      ['sobre_limite como texto', { sobre_limite: 'true' }],
    ])('rechaza un cupo con %s', (_caso, cambio) => {
      expect(dailyIntakeCapacityResponseDtoSchema.safeParse({ ...cupo, ...cambio }).success).toBe(false);
    });
  });
});