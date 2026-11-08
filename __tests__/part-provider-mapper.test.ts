import { mapPartPageResponse, mapPartResponse } from '@/mappers/part.mapper';
import { mapProviderDetailResponse, mapProviderPageResponse } from '@/mappers/provider.mapper';
import { partPagePayload, partResponsePayloads } from '@/mocks/payloads/part.payload';
import { providerDetailPayloads, providerPagePayload } from '@/mocks/payloads/provider.payload';

describe('Transformación de repuestos y proveedores', () => {
  describe('mapPartResponse', () => {
    it('convierte el repuesto de la API al modelo Part', () => {
      expect(mapPartResponse(partResponsePayloads.conStock)).toEqual({
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

    it('conserva el umbral particular y la alerta de stock bajo', () => {
      const part = mapPartResponse(partResponsePayloads.bajoUmbral);

      expect(part.stock).toBe(2);
      expect(part.customThreshold).toBe(4);
      expect(part.effectiveThreshold).toBe(4);
      expect(part.belowThreshold).toBe(true);
    });

    it('conserva un stock en cero', () => {
      const part = mapPartResponse(partResponsePayloads.sinStock);

      expect(part.stock).toBe(0);
      expect(part.belowThreshold).toBe(true);
    });

    it.each(Object.entries(partResponsePayloads))(
      'convierte los identificadores del repuesto de ejemplo "%s" a texto',
      (_caso, payload) => {
        const part = mapPartResponse(payload);

        expect(part.id).toBe(String(payload.repuesto_id));
        expect(part.providerId).toBe(String(payload.proveedor_id));
      },
    );

    it('no incluye campos del backend que no existen en el modelo', () => {
      const part = mapPartResponse(partResponsePayloads.conStock);

      expect(part).not.toHaveProperty('repuesto_id');
      expect(part).not.toHaveProperty('umbral_particular');
      expect(part).not.toHaveProperty('bajo_umbral');
    });
  });

  describe('mapPartPageResponse', () => {
    it('convierte la página, con desde y limite como offset y limit', () => {
      const pagina = mapPartPageResponse(partPagePayload);

      expect(pagina.total).toBe(4);
      expect(pagina.offset).toBe(0);
      expect(pagina.limit).toBe(50);
      expect(pagina.items).toHaveLength(4);
      expect(pagina.items[0]).toEqual(mapPartResponse(partResponsePayloads.conStock));
    });

    it('no incluye el umbral general en la página', () => {
      expect(mapPartPageResponse(partPagePayload)).not.toHaveProperty('umbral_general');
    });
  });

  describe('mapProviderDetailResponse', () => {
    it('convierte el proveedor con sus repuestos al modelo ProviderDetail', () => {
      expect(mapProviderDetailResponse(providerDetailPayloads.conRepuestos)).toEqual({
        id: '1',
        name: 'Repuestos Sur',
        contact: 'ventas@repuestossur.cl',
        partCount: 2,
        parts: [
          mapPartResponse(partResponsePayloads.conStock),
          mapPartResponse(partResponsePayloads.bajoUmbral),
        ],
      });
    });

    it.each(Object.entries(providerDetailPayloads))(
      'convierte el proveedor de ejemplo "%s" con todos sus repuestos',
      (_caso, payload) => {
        const provider = mapProviderDetailResponse(payload);

        expect(provider.id).toBe(String(payload.proveedor_id));
        expect(provider.partCount).toBe(payload.cantidad_repuestos);
        expect(provider.parts).toEqual(payload.repuestos.map(mapPartResponse));
      },
    );

    it('convierte un proveedor sin repuestos', () => {
      const provider = mapProviderDetailResponse(providerDetailPayloads.sinRepuestos);

      expect(provider.contact).toBe('María Soto');
      expect(provider.partCount).toBe(0);
      expect(provider.parts).toEqual([]);
    });

    it('no incluye campos del backend que no existen en el modelo', () => {
      const provider = mapProviderDetailResponse(providerDetailPayloads.conRepuestos);

      expect(provider).not.toHaveProperty('proveedor_id');
      expect(provider).not.toHaveProperty('repuestos');
    });
  });

  describe('mapProviderPageResponse', () => {
    it('convierte la página, con desde y limite como offset y limit', () => {
      const pagina = mapProviderPageResponse(providerPagePayload);

      expect(pagina.total).toBe(3);
      expect(pagina.offset).toBe(0);
      expect(pagina.limit).toBe(50);
      expect(pagina.items[1]).toEqual({
        id: '2',
        name: 'Frenos del Pacífico',
        contact: '+56 9 4444 4444',
        partCount: 2,
      });
    });

    it('los proveedores del listado no incluyen repuestos', () => {
      for (const provider of mapProviderPageResponse(providerPagePayload).items) {
        expect(provider).not.toHaveProperty('parts');
      }
    });
  });
});