import {
  MockPartAdapter,
  PartsService,
  ServiceError,
  partsService,
} from '@/services/parts.service';
import { apiClient } from '@/services/api/client';
import {
  partPagePayload,
  partResponsePayloads,
} from '@/mocks/payloads/part.payload';

jest.mock('@/services/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('partsService (Capa de Servicios de Repuestos — MS3)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    partsService.useRealAdapter();
    partsService.resetMocks();
  });

  describe('getParts y getPartsPage (GET /repuestos)', () => {
    it('obtiene y mapea la página de repuestos desde la API Gateway (/repuestos)', async () => {
      mockedApiClient.get.mockResolvedValueOnce({
        data: partPagePayload,
      } as never);

      const page = await partsService.getPartsPage();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/repuestos');
      expect(page.total).toBe(4);
      expect(page.items).toHaveLength(4);
      expect(page.items[0]).toEqual({
        id: '10',
        name: 'Filtro de aceite',
        providerId: '1',
        providerName: 'Repuestos Sur',
        stock: 12,
        customThreshold: null,
        effectiveThreshold: 5,
        belowThreshold: false,
      });
    });

    it('envía parámetros de consulta tipados (proveedor_id, q, bajo_umbral, con_stock, ordenar, desde, limite)', async () => {
      mockedApiClient.get.mockResolvedValueOnce({
        data: {
          total: 1,
          desde: 0,
          limite: 20,
          umbral_general: 5,
          repuestos: [partResponsePayloads.bajoUmbral],
        },
      } as never);

      const parts = await partsService.getParts({
        proveedor_id: 1,
        q: 'bujia',
        bajo_umbral: true,
        con_stock: true,
        ordenar: 'stock_asc',
        desde: 0,
        limite: 20,
      });

      expect(mockedApiClient.get).toHaveBeenCalledWith('/repuestos', {
        params: {
          proveedor_id: 1,
          q: 'bujia',
          bajo_umbral: true,
          con_stock: true,
          ordenar: 'stock_asc',
          desde: 0,
          limite: 20,
        },
      });
      expect(parts).toHaveLength(1);
      expect(parts[0].id).toBe('11');
      expect(parts[0].belowThreshold).toBe(true);
    });
  });

  describe('getPartById, createPart, updatePart y deletePart', () => {
    it('obtiene el detalle de un repuesto por su identificador (GET /repuestos/{repuesto_id})', async () => {
      mockedApiClient.get.mockResolvedValueOnce({
        data: partResponsePayloads.conUmbralParticular,
      } as never);

      const part = await partsService.getPartById(13);

      expect(mockedApiClient.get).toHaveBeenCalledWith('/repuestos/13');
      expect(part.id).toBe('13');
      expect(part.name).toBe('Correa de distribución');
      expect(part.customThreshold).toBe(2);
    });

    it('registra un nuevo repuesto (POST /repuestos)', async () => {
      mockedApiClient.post.mockResolvedValueOnce({
        data: partResponsePayloads.conStock,
      } as never);

      const created = await partsService.createPart({
        proveedor_id: 1,
        nombre: 'Filtro de aceite',
        stock_inicial: 12,
      });

      expect(mockedApiClient.post).toHaveBeenCalledWith('/repuestos', {
        proveedor_id: 1,
        nombre: 'Filtro de aceite',
        stock_inicial: 12,
      });
      expect(created.id).toBe('10');
      expect(created.stock).toBe(12);
    });

    it('actualiza parcialmente un repuesto (PATCH /repuestos/{repuesto_id})', async () => {
      mockedApiClient.patch.mockResolvedValueOnce({
        data: {
          ...partResponsePayloads.conStock,
          umbral_particular: 8,
          umbral_efectivo: 8,
        },
      } as never);

      const updated = await partsService.updatePart(10, {
        umbral_particular: 8,
        observacion: 'Aumento de demanda estacional',
      });

      expect(mockedApiClient.patch).toHaveBeenCalledWith('/repuestos/10', {
        umbral_particular: 8,
        observacion: 'Aumento de demanda estacional',
      });
      expect(updated.customThreshold).toBe(8);
    });

    it('elimina un repuesto sin historial (DELETE /repuestos/{repuesto_id})', async () => {
      mockedApiClient.delete.mockResolvedValueOnce({ data: undefined } as never);

      await partsService.deletePart(10);

      expect(mockedApiClient.delete).toHaveBeenCalledWith('/repuestos/10');
    });
  });

  describe('Manejo de errores y Adaptador Simulado (MockPartAdapter)', () => {
    it('normaliza errores HTTP 404 y 409 en ServiceError con dominio parts', async () => {
      mockedApiClient.post.mockRejectedValueOnce({
        isAxiosError: true,
        response: {
          status: 409,
          data: { detail: 'Nombre repetido en el proveedor' },
        },
      });

      await expect(
        partsService.createPart({ proveedor_id: 1, nombre: 'Filtro de aceite' })
      ).rejects.toMatchObject({
        name: 'ServiceError',
        status: 409,
        code: 'PART_CONFLICT',
        domain: 'parts',
        message: 'Nombre repetido en el proveedor',
      });
    });

    it('filtra, ordena y gestiona ciclo CRUD en MockPartAdapter', async () => {
      const mockService = new PartsService(new MockPartAdapter());

      // Filtrar por bajo_umbral y ordenar por stock ascendente
      const lowStock = await mockService.getParts({
        bajo_umbral: true,
        ordenar: 'stock_asc',
      });
      expect(lowStock).toHaveLength(2);
      expect(lowStock[0].stock).toBeLessThanOrEqual(lowStock[1].stock);

      // Búsqueda insensible a tildes con parámetro q
      const searchResult = await mockService.getParts({ q: 'distribución' });
      expect(searchResult).toHaveLength(1);
      expect(searchResult[0].name).toBe('Correa de distribución');

      // Crear repuesto nuevo y verificar umbral efectivo
      const created = await mockService.createPart({
        proveedor_id: '1',
        nombre: 'Amortiguador delantero',
        stock_inicial: 2,
        umbral_particular: 4,
      });
      expect(created.belowThreshold).toBe(true);
      expect(created.providerName).toBe('Repuestos Sur');
    });
  });
});

