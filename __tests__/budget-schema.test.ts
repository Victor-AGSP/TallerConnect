import { budgetDetailPayloads, budgetPagePayload } from '@/mocks/payloads/budget.payload';
import {
  budgetDetailResponseDtoSchema,
  budgetPageResponseDtoSchema,
  budgetSummaryResponseDtoSchema,
  budgetVersionResponseDtoSchema,
} from '@/schemas/budget-dto.schema';

/** Campos obligatorios definidos por el contrato de MS3 (`/ms3/openapi.json`). */
const CAMPOS_OBLIGATORIOS_PRESUPUESTO = [
  'presupuesto_id',
  'orden_id',
  'creado_en',
  'cantidad_versiones',
  'ultima_version',
  'estado_ultima_version',
  'total_ultima_version',
  'version_vigente',
  'versiones',
] as const;

const CAMPOS_OBLIGATORIOS_VERSION = [
  'numero',
  'estado',
  'es_modificacion',
  'creado_por_id',
  'creado_en',
  'enviado_en',
  'bloqueada_en',
  'total',
  'items',
  'decision',
] as const;

const CAMPOS_OBLIGATORIOS_ITEM = [
  'item_id',
  'tipo',
  'descripcion',
  'cantidad',
  'precio_unitario',
  'subtotal',
  'repuesto_id',
] as const;

const CAMPOS_OBLIGATORIOS_DECISION = [
  'decision_id',
  'decision',
  'cliente_usuario_id',
  'fecha_hora',
  'motivo',
] as const;

const presupuesto = budgetDetailPayloads.enviado;
const version = presupuesto.versiones[0];
const item = version.items[0];
const versionConDecision = budgetDetailPayloads.aprobadoConModificacion.versiones[0];
const decision = versionConDecision.decision!;

const sin = (objeto: object, campo: string) => {
  const copia: Record<string, unknown> = { ...objeto };
  delete copia[campo];
  return copia;
};

const versionConItem = (cambio: Record<string, unknown>) => ({
  ...version,
  items: [{ ...item, ...cambio }],
});

describe('Esquema de presupuesto recibido de la API (PresupuestoDetalle)', () => {
  describe('datos válidos', () => {
    it.each(Object.entries(budgetDetailPayloads))(
      'acepta el presupuesto de ejemplo "%s"',
      (_caso, payload) => {
        expect(budgetDetailResponseDtoSchema.safeParse(payload).success).toBe(true);
      },
    );

    it('acepta el resumen de cada presupuesto, sin sus versiones', () => {
      for (const resumen of budgetPagePayload.presupuestos) {
        expect(budgetSummaryResponseDtoSchema.safeParse(resumen).success).toBe(true);
      }
    });

    it('acepta un ítem sin repuesto_nombre ni proveedor_nombre, o con ellos en null', () => {
      const { repuesto_nombre: _nombre, proveedor_nombre: _proveedor, ...itemSinNombres } = item;
      const itemConNulos = { ...item, repuesto_nombre: null, proveedor_nombre: null };

      expect(budgetVersionResponseDtoSchema.safeParse({ ...version, items: [itemSinNombres] }).success).toBe(true);
      expect(budgetVersionResponseDtoSchema.safeParse({ ...version, items: [itemConNulos] }).success).toBe(true);
    });

    it('acepta fechas con una zona horaria distinta de UTC', () => {
      const payload = { ...presupuesto, creado_en: '2026-03-04T05:30:00-03:00' };

      expect(budgetDetailResponseDtoSchema.safeParse(payload).success).toBe(true);
    });
  });

  describe('campos obligatorios', () => {
    it.each(CAMPOS_OBLIGATORIOS_PRESUPUESTO)('rechaza un presupuesto sin %s', (campo) => {
      expect(budgetDetailResponseDtoSchema.safeParse(sin(presupuesto, campo)).success).toBe(false);
    });

    it.each(CAMPOS_OBLIGATORIOS_VERSION)('rechaza una versión sin %s', (campo) => {
      expect(budgetVersionResponseDtoSchema.safeParse(sin(version, campo)).success).toBe(false);
    });

    it.each(CAMPOS_OBLIGATORIOS_ITEM)('rechaza un ítem sin %s', (campo) => {
      const payload = { ...version, items: [sin(item, campo)] };

      expect(budgetVersionResponseDtoSchema.safeParse(payload).success).toBe(false);
    });

    it.each(CAMPOS_OBLIGATORIOS_DECISION)('rechaza una decisión sin %s', (campo) => {
      const payload = { ...versionConDecision, decision: sin(decision, campo) };

      expect(budgetVersionResponseDtoSchema.safeParse(payload).success).toBe(false);
    });
  });

  describe('tipos', () => {
    it.each([
      ['presupuesto_id como texto', { presupuesto_id: '2' }],
      ['orden_id decimal', { orden_id: 103.5 }],
      ['total_ultima_version como número', { total_ultima_version: 20500 }],
      ['creado_en sin formato de fecha', { creado_en: '04-03-2026' }],
      ['version_vigente como texto', { version_vigente: '1' }],
    ])('rechaza un presupuesto con %s', (_caso, cambio) => {
      expect(budgetDetailResponseDtoSchema.safeParse({ ...presupuesto, ...cambio }).success).toBe(false);
    });

    it.each([
      ['es_modificacion como texto', { es_modificacion: 'false' }],
      ['enviado_en sin formato de fecha', { enviado_en: 'ayer' }],
      ['items que no es una lista', { items: item }],
    ])('rechaza una versión con %s', (_caso, cambio) => {
      expect(budgetVersionResponseDtoSchema.safeParse({ ...version, ...cambio }).success).toBe(false);
    });

    it('rechaza un ítem con repuesto_id como texto', () => {
      expect(budgetVersionResponseDtoSchema.safeParse(versionConItem({ repuesto_id: '10' })).success).toBe(false);
    });
  });

  describe('montos en texto decimal', () => {
    it.each(['0', '1', '1.5', '15000.00'])('acepta "%s"', (valor) => {
      expect(budgetVersionResponseDtoSchema.safeParse(versionConItem({ precio_unitario: valor })).success).toBe(true);
    });

    it.each(['abc', '', '-100', '12,5', '1.', '.5'])('rechaza "%s"', (valor) => {
      expect(budgetVersionResponseDtoSchema.safeParse(versionConItem({ precio_unitario: valor })).success).toBe(false);
    });
  });

  describe('valores del contrato', () => {
    it.each(['borrador', 'enviada', 'aprobada', 'rechazada'])('acepta el estado %s', (estado) => {
      expect(budgetVersionResponseDtoSchema.safeParse({ ...version, estado }).success).toBe(true);
    });

    it('rechaza un estado fuera del contrato', () => {
      expect(budgetVersionResponseDtoSchema.safeParse({ ...version, estado: 'cancelada' }).success).toBe(false);
      expect(
        budgetDetailResponseDtoSchema.safeParse({ ...presupuesto, estado_ultima_version: 'cancelada' }).success,
      ).toBe(false);
    });

    it('rechaza un tipo de ítem fuera del contrato', () => {
      expect(budgetVersionResponseDtoSchema.safeParse(versionConItem({ tipo: 'servicio' })).success).toBe(false);
    });

    it('rechaza una decisión fuera del contrato', () => {
      const payload = { ...versionConDecision, decision: { ...decision, decision: 'pendiente' } };

      expect(budgetVersionResponseDtoSchema.safeParse(payload).success).toBe(false);
    });
  });

  describe('nulos', () => {
    it.each(['presupuesto_id', 'orden_id', 'estado_ultima_version', 'total_ultima_version'])(
      'rechaza null en %s, que el contrato no admite como nulo',
      (campo) => {
        expect(budgetDetailResponseDtoSchema.safeParse({ ...presupuesto, [campo]: null }).success).toBe(false);
      },
    );

    it('acepta null en version_vigente, enviado_en, bloqueada_en y decision', () => {
      const borrador = budgetDetailPayloads.borrador;

      expect(borrador.version_vigente).toBeNull();
      expect(borrador.versiones[0].enviado_en).toBeNull();
      expect(borrador.versiones[0].bloqueada_en).toBeNull();
      expect(borrador.versiones[0].decision).toBeNull();
      expect(budgetDetailResponseDtoSchema.safeParse(borrador).success).toBe(true);
    });
  });

  describe('páginas', () => {
    it('acepta la página de presupuestos de ejemplo', () => {
      expect(budgetPageResponseDtoSchema.safeParse(budgetPagePayload).success).toBe(true);
    });

    it('acepta una página vacía', () => {
      const pagina = { total: 0, desde: 0, limite: 50, presupuestos: [] };

      expect(budgetPageResponseDtoSchema.safeParse(pagina).success).toBe(true);
    });

    it('rechaza una página con un presupuesto inválido', () => {
      const invalido = { ...budgetPagePayload.presupuestos[0], presupuesto_id: '9' };
      const pagina = { ...budgetPagePayload, presupuestos: [...budgetPagePayload.presupuestos, invalido] };

      expect(budgetPageResponseDtoSchema.safeParse(pagina).success).toBe(false);
    });
  });
});