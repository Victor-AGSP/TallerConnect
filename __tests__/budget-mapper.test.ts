import {
  mapBudgetDetailResponse,
  mapBudgetPageResponse,
  mapBudgetVersionResponse,
} from '@/mappers/budget.mapper';
import { budgetDetailPayloads, budgetPagePayload } from '@/mocks/payloads/budget.payload';

const enviado = budgetDetailPayloads.enviado;
const conModificacion = budgetDetailPayloads.aprobadoConModificacion;

const VERSION_ENVIADA = {
  number: 1,
  status: 'enviada',
  isModification: false,
  createdById: '2',
  createdAt: '2026-03-04T08:30:00Z',
  sentAt: '2026-03-04T09:00:00Z',
  lockedAt: '2026-03-04T09:00:00Z',
  total: 20500,
  items: [
    {
      id: '3',
      type: 'repuesto',
      description: 'Filtro de aceite',
      quantity: 1,
      unitPrice: 8500,
      subtotal: 8500,
      partId: '10',
      partName: 'Filtro de aceite',
      providerName: 'Repuestos Sur',
    },
    {
      id: '4',
      type: 'mano_de_obra',
      description: 'Cambio de aceite y filtro',
      quantity: 1,
      unitPrice: 12000,
      subtotal: 12000,
      partId: null,
      partName: null,
      providerName: null,
    },
  ],
  decision: null,
};

describe('Transformación de presupuestos', () => {
  describe('mapBudgetDetailResponse', () => {
    it('convierte el presupuesto de la API al modelo Budget', () => {
      expect(mapBudgetDetailResponse(enviado)).toEqual({
        id: '2',
        orderId: '103',
        createdAt: '2026-03-04T08:30:00Z',
        versionCount: 1,
        latestVersion: 1,
        latestVersionStatus: 'enviada',
        latestVersionTotal: 20500,
        currentVersion: null,
        versions: [VERSION_ENVIADA],
      });
    });

    it.each(Object.entries(budgetDetailPayloads))(
      'convierte los identificadores del presupuesto de ejemplo "%s" a texto',
      (_caso, payload) => {
        const budget = mapBudgetDetailResponse(payload);

        expect(budget.id).toBe(String(payload.presupuesto_id));
        expect(budget.orderId).toBe(String(payload.orden_id));
        expect(budget.versions).toHaveLength(payload.versiones.length);
      },
    );

    it('convierte cantidades y montos decimales a número', () => {
      const [primeraVersion] = mapBudgetDetailResponse(conModificacion).versions;
      const manoDeObra = primeraVersion.items[1];

      expect(manoDeObra.quantity).toBe(2.5);
      expect(manoDeObra.unitPrice).toBe(18000);
      expect(manoDeObra.subtotal).toBe(45000);
      expect(primeraVersion.total).toBe(90000);
    });

    it('deja en null el repuesto y los nombres cuando no vienen en la respuesta', () => {
      const itemSinNombres = conModificacion.versiones[0].items[1];

      expect(itemSinNombres).not.toHaveProperty('repuesto_nombre');
      expect(itemSinNombres).not.toHaveProperty('proveedor_nombre');

      const manoDeObra = mapBudgetDetailResponse(conModificacion).versions[0].items[1];

      expect(manoDeObra.partId).toBeNull();
      expect(manoDeObra.partName).toBeNull();
      expect(manoDeObra.providerName).toBeNull();
    });

    it('convierte la decisión del cliente', () => {
      expect(mapBudgetDetailResponse(conModificacion).versions[0].decision).toEqual({
        id: '1',
        decision: 'aprobado',
        clientUserId: '1',
        decidedAt: '2026-03-01T15:00:00Z',
        reason: null,
      });
    });

    it('conserva el motivo de un rechazo', () => {
      const [version] = mapBudgetDetailResponse(budgetDetailPayloads.rechazado).versions;

      expect(version.decision?.decision).toBe('rechazado');
      expect(version.decision?.reason).toBe('El costo supera el presupuesto disponible del cliente.');
    });

    it('conserva todas las versiones en orden y la versión vigente', () => {
      const budget = mapBudgetDetailResponse(conModificacion);

      expect(budget.versions.map((version) => version.number)).toEqual([1, 2]);
      expect(budget.versions[1].isModification).toBe(true);
      expect(budget.currentVersion).toBe(1);
      expect(budget.latestVersionTotal).toBe(104000);
    });

    it('mantiene en null las fechas de envío y bloqueo de una versión no enviada', () => {
      const [version] = mapBudgetDetailResponse(budgetDetailPayloads.borrador).versions;

      expect(version.sentAt).toBeNull();
      expect(version.lockedAt).toBeNull();
    });

    it('no incluye campos del backend que no existen en el modelo', () => {
      const budget = mapBudgetDetailResponse(enviado);

      expect(budget).not.toHaveProperty('presupuesto_id');
      expect(budget).not.toHaveProperty('versiones');
      expect(budget.versions[0]).not.toHaveProperty('numero');
      expect(budget.versions[0].items[0]).not.toHaveProperty('repuesto_id');
    });
  });

  describe('montos inválidos', () => {
    const version = enviado.versiones[0];

    it.each([
      ['cantidad', { cantidad: 'abc' }],
      ['precio_unitario', { precio_unitario: '' }],
      ['subtotal', { subtotal: '12,5' }],
    ])('lanza un error si %s no es un decimal válido', (campo, cambio) => {
      const payload = { ...enviado, versiones: [{ ...version, items: [{ ...version.items[0], ...cambio }] }] };

      expect(() => mapBudgetDetailResponse(payload)).toThrow(`Valor decimal inválido en ${campo}:`);
    });

    it('lanza un error si el total de la versión no es un decimal válido', () => {
      const payload = { ...enviado, versiones: [{ ...version, total: 'abc' }] };

      expect(() => mapBudgetDetailResponse(payload)).toThrow('Valor decimal inválido en total:');
    });

    it('lanza un error si total_ultima_version no es un decimal válido', () => {
      const payload = { ...enviado, total_ultima_version: 'abc' };

      expect(() => mapBudgetDetailResponse(payload)).toThrow('Valor decimal inválido en total_ultima_version:');
    });
  });

  describe('mapBudgetVersionResponse', () => {
    it('convierte una versión individual', () => {
      expect(mapBudgetVersionResponse(enviado.versiones[0])).toEqual(VERSION_ENVIADA);
    });
  });

  describe('mapBudgetPageResponse', () => {
    it('convierte la página, con desde y limite como offset y limit', () => {
      const pagina = mapBudgetPageResponse(budgetPagePayload);

      expect(pagina.total).toBe(5);
      expect(pagina.offset).toBe(0);
      expect(pagina.limit).toBe(50);
      expect(pagina.items).toHaveLength(5);
      expect(pagina.items[0]).toEqual({
        id: '1',
        orderId: '102',
        createdAt: '2026-03-03T15:00:00Z',
        versionCount: 1,
        latestVersion: 1,
        latestVersionStatus: 'borrador',
        latestVersionTotal: 29000,
        currentVersion: null,
      });
    });

    it('los presupuestos del listado no incluyen versiones', () => {
      expect(mapBudgetPageResponse(budgetPagePayload).items[0]).not.toHaveProperty('versions');
    });

    it('convierte una página vacía', () => {
      const pagina = { total: 0, desde: 0, limite: 50, presupuestos: [] };

      expect(mapBudgetPageResponse(pagina)).toEqual({ items: [], total: 0, offset: 0, limit: 50 });
    });
  });
});