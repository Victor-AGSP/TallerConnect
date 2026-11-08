import { partPagePayload, partResponsePayloads } from '@/mocks/payloads/part.payload';
import { providerDetailPayloads, providerPagePayload } from '@/mocks/payloads/provider.payload';
import { partPageResponseDtoSchema, partResponseDtoSchema } from '@/schemas/part-dto.schema';
import {
  providerDetailResponseDtoSchema,
  providerPageResponseDtoSchema,
  providerResponseDtoSchema,
} from '@/schemas/provider-dto.schema';

/** Campos obligatorios definidos por el contrato de MS3 (`/ms3/openapi.json`). */
const CAMPOS_OBLIGATORIOS_REPUESTO = [
  'repuesto_id',
  'nombre',
  'proveedor_id',
  'proveedor_nombre',
  'stock',
  'umbral_particular',
  'umbral_efectivo',
  'bajo_umbral',
] as const;

const CAMPOS_OBLIGATORIOS_PROVEEDOR = ['proveedor_id', 'nombre', 'contacto', 'cantidad_repuestos'] as const;

const repuesto = partResponsePayloads.conStock;
const proveedor = providerDetailPayloads.conRepuestos;

const sin = (objeto: object, campo: string) => {
  const copia: Record<string, unknown> = { ...objeto };
  delete copia[campo];
  return copia;
};

describe('Esquema de repuesto recibido de la API (RepuestoSalida)', () => {
  describe('datos válidos', () => {
    it.each(Object.entries(partResponsePayloads))('acepta el repuesto de ejemplo "%s"', (_caso, payload) => {
      expect(partResponseDtoSchema.safeParse(payload).success).toBe(true);
    });

    it('acepta umbral_particular y umbral_efectivo en null', () => {
      const payload = { ...repuesto, umbral_particular: null, umbral_efectivo: null };

      expect(partResponseDtoSchema.safeParse(payload).success).toBe(true);
    });
  });

  describe('campos obligatorios', () => {
    it.each(CAMPOS_OBLIGATORIOS_REPUESTO)('rechaza un repuesto sin %s', (campo) => {
      expect(partResponseDtoSchema.safeParse(sin(repuesto, campo)).success).toBe(false);
    });
  });

  describe('tipos', () => {
    it.each([
      ['repuesto_id como texto', { repuesto_id: '10' }],
      ['stock decimal', { stock: 1.5 }],
      ['stock como texto', { stock: '12' }],
      ['umbral_particular como texto', { umbral_particular: '4' }],
      ['bajo_umbral como texto', { bajo_umbral: 'false' }],
    ])('rechaza %s', (_caso, cambio) => {
      expect(partResponseDtoSchema.safeParse({ ...repuesto, ...cambio }).success).toBe(false);
    });

    it.each(['repuesto_id', 'nombre', 'proveedor_id', 'proveedor_nombre', 'stock', 'bajo_umbral'])(
      'rechaza null en %s, que el contrato no admite como nulo',
      (campo) => {
        expect(partResponseDtoSchema.safeParse({ ...repuesto, [campo]: null }).success).toBe(false);
      },
    );
  });

  describe('páginas', () => {
    it('acepta la página de repuestos de ejemplo', () => {
      expect(partPageResponseDtoSchema.safeParse(partPagePayload).success).toBe(true);
    });

    it('acepta una página vacía sin umbral general', () => {
      const pagina = { total: 0, desde: 0, limite: 50, umbral_general: null, repuestos: [] };

      expect(partPageResponseDtoSchema.safeParse(pagina).success).toBe(true);
    });

    it('rechaza una página con un repuesto inválido', () => {
      const pagina = { ...partPagePayload, repuestos: [repuesto, { ...repuesto, stock: '12' }] };

      expect(partPageResponseDtoSchema.safeParse(pagina).success).toBe(false);
    });
  });
});

describe('Esquema de proveedor recibido de la API (ProveedorDetalle)', () => {
  describe('datos válidos', () => {
    it.each(Object.entries(providerDetailPayloads))('acepta el proveedor de ejemplo "%s"', (_caso, payload) => {
      expect(providerDetailResponseDtoSchema.safeParse(payload).success).toBe(true);
    });

    it('acepta cada proveedor del listado, sin su lista de repuestos', () => {
      for (const item of providerPagePayload.proveedores) {
        expect(providerResponseDtoSchema.safeParse(item).success).toBe(true);
      }
    });
  });

  describe('campos obligatorios', () => {
    it.each([...CAMPOS_OBLIGATORIOS_PROVEEDOR, 'repuestos'])('rechaza un proveedor sin %s', (campo) => {
      expect(providerDetailResponseDtoSchema.safeParse(sin(proveedor, campo)).success).toBe(false);
    });
  });

  describe('tipos', () => {
    it.each([
      ['proveedor_id como texto', { proveedor_id: '1' }],
      ['contacto en null', { contacto: null }],
      ['cantidad_repuestos como texto', { cantidad_repuestos: '2' }],
      ['repuestos que no es una lista', { repuestos: repuesto }],
    ])('rechaza %s', (_caso, cambio) => {
      expect(providerDetailResponseDtoSchema.safeParse({ ...proveedor, ...cambio }).success).toBe(false);
    });

    it('rechaza un proveedor con un repuesto inválido', () => {
      const payload = { ...proveedor, repuestos: [{ ...repuesto, repuesto_id: '10' }] };

      expect(providerDetailResponseDtoSchema.safeParse(payload).success).toBe(false);
    });
  });

  describe('páginas', () => {
    it('acepta la página de proveedores de ejemplo', () => {
      expect(providerPageResponseDtoSchema.safeParse(providerPagePayload).success).toBe(true);
    });

    it('rechaza una página con un proveedor inválido', () => {
      const invalido = { ...providerPagePayload.proveedores[0], proveedor_id: '1' };
      const pagina = { ...providerPagePayload, proveedores: [invalido] };

      expect(providerPageResponseDtoSchema.safeParse(pagina).success).toBe(false);
    });
  });
});