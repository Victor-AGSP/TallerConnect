import {
  MockProviderAdapter,
  ProvidersService,
  ServiceError,
  providersService,
} from '@/services/providers.service';
import { apiClient } from '@/services/api/client';
import {
  providerDetailPayloads,
  providerPagePayload,
} from '@/mocks/payloads/provider.payload';

jest.mock('@/services/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('providersService (Capa de Servicios de Proveedores — MS3)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    providersService.useRealAdapter();
    providersService.resetMocks();
  });

  describe('getProviders y getProvidersPage (GET /proveedores)', () => {
    it('obtiene y mapea la página de proveedores desde la API Gateway (/proveedores)', async () => {
      mockedApiClient.get.mockResolvedValueOnce({
        data: providerPagePayload,
      } as never);

      const page = await providersService.getProvidersPage();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/proveedores');
      expect(page.total).toBe(3);
      expect(page.items).toHaveLength(3);
      expect(page.items[0]).toEqual({
        id: '1',
        name: 'Repuestos Sur',
        contact: 'ventas@repuestossur.cl',
        partCount: 2,
      });
    });

    it('envía parámetros de consulta tipados (q, con_repuestos, tipo_distribuidor, desde, limite)', async () => {
      mockedApiClient.get.mockResolvedValueOnce({
        data: {
          total: 1,
          desde: 0,
          limite: 10,
          proveedores: [providerPagePayload.proveedores[0]],
        },
      } as never);

      const providers = await providersService.getProviders({
        q: 'Sur',
        con_repuestos: true,
        tipo_distribuidor: 'oficial',
        desde: 0,
        limite: 10,
      });

      expect(mockedApiClient.get).toHaveBeenCalledWith('/proveedores', {
        params: {
          q: 'Sur',
          con_repuestos: true,
          tipo_distribuidor: 'oficial',
          desde: 0,
          limite: 10,
        },
      });
      expect(providers).toHaveLength(1);
      expect(providers[0].name).toBe('Repuestos Sur');
    });
  });

  describe('getProviderById, createProvider, updateProvider y deleteProvider', () => {
    it('obtiene el detalle de un proveedor junto con sus repuestos (GET /proveedores/{proveedor_id})', async () => {
      mockedApiClient.get.mockResolvedValueOnce({
        data: providerDetailPayloads.conRepuestos,
      } as never);

      const detail = await providersService.getProviderById(1);

      expect(mockedApiClient.get).toHaveBeenCalledWith('/proveedores/1');
      expect(detail.id).toBe('1');
      expect(detail.name).toBe('Repuestos Sur');
      expect(detail.parts).toHaveLength(2);
      expect(detail.parts[0].name).toBe('Filtro de aceite');
    });

    it('registra un proveedor nuevo (POST /proveedores)', async () => {
      mockedApiClient.post.mockResolvedValueOnce({
        data: {
          proveedor_id: 4,
          nombre: 'Importadora Central',
          contacto: 'contacto@central.cl',
          tipo_distribuidor: 'oficial',
          cantidad_repuestos: 0,
        },
      } as never);

      const created = await providersService.createProvider({
        nombre: 'Importadora Central',
        contacto: 'contacto@central.cl',
        tipo_distribuidor: 'oficial',
      });

      expect(mockedApiClient.post).toHaveBeenCalledWith('/proveedores', {
        nombre: 'Importadora Central',
        contacto: 'contacto@central.cl',
        tipo_distribuidor: 'oficial',
      });
      expect(created.id).toBe('4');
      expect(created.partCount).toBe(0);
    });

    it('actualiza parcialmente un proveedor (PATCH /proveedores/{proveedor_id})', async () => {
      mockedApiClient.patch.mockResolvedValueOnce({
        data: {
          proveedor_id: 3,
          nombre: 'Lubricantes Andes SPA',
          contacto: 'gerencia@andes.cl',
          cantidad_repuestos: 0,
        },
      } as never);

      const updated = await providersService.updateProvider(3, {
        nombre: 'Lubricantes Andes SPA',
        contacto: 'gerencia@andes.cl',
      });

      expect(mockedApiClient.patch).toHaveBeenCalledWith('/proveedores/3', {
        nombre: 'Lubricantes Andes SPA',
        contacto: 'gerencia@andes.cl',
      });
      expect(updated.name).toBe('Lubricantes Andes SPA');
      expect(updated.contact).toBe('gerencia@andes.cl');
    });

    it('elimina un proveedor sin repuestos (DELETE /proveedores/{proveedor_id})', async () => {
      mockedApiClient.delete.mockResolvedValueOnce({ data: undefined } as never);

      await providersService.deleteProvider(3);

      expect(mockedApiClient.delete).toHaveBeenCalledWith('/proveedores/3');
    });
  });

  describe('Manejo de errores y Adaptador Simulado (MockProviderAdapter)', () => {
    it('normaliza errores HTTP 404 y 409 en ServiceError con dominio providers', async () => {
      mockedApiClient.delete.mockRejectedValueOnce({
        isAxiosError: true,
        response: {
          status: 409,
          data: { detail: 'No se puede eliminar un proveedor con repuestos' },
        },
      });

      await expect(providersService.deleteProvider(1)).rejects.toMatchObject({
        name: 'ServiceError',
        status: 409,
        code: 'PROVIDER_CONFLICT',
        domain: 'providers',
        message: 'No se puede eliminar un proveedor con repuestos',
      });
    });

    it('filtra, consulta detalle y valida reglas de negocio en MockProviderAdapter', async () => {
      const mockService = new ProvidersService(new MockProviderAdapter());

      // Filtrar proveedores con repuestos
      const withParts = await mockService.getProviders({ con_repuestos: true });
      expect(withParts).toHaveLength(2);

      // Filtrar por texto insensible a tildes en contacto o nombre
      const byContact = await mockService.getProviders({ q: 'maria soto' });
      expect(byContact).toHaveLength(1);
      expect(byContact[0].name).toBe('Lubricantes Andes');

      // Intentar eliminar proveedor con repuestos lanza 409 PROVIDER_CONFLICT
      await expect(mockService.deleteProvider('1')).rejects.toMatchObject({
        name: 'ServiceError',
        status: 409,
        code: 'PROVIDER_CONFLICT',
        domain: 'providers',
      });

      // Eliminar proveedor sin repuestos ('3') funciona correctamente
      await mockService.deleteProvider('3');
      const remaining = await mockService.getProviders();
      expect(remaining).toHaveLength(2);
    });
  });
});

