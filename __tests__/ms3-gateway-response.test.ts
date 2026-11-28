import { mapBudgetDetailResponse, mapBudgetPageResponse } from '@/mappers/budget.mapper';
import {
  mapBudgetDetailResponse as mapManagedBudgetDetailResponse,
  mapBudgetPageResponse as mapManagedBudgetPageResponse,
} from '@/mappers/budget-management.mapper';
import { mapPartPageResponse } from '@/mappers/part.mapper';
import { mapSparePartsPage, mapSupplierDetailResponse, mapSuppliersPage } from '@/mappers/parts.mapper';
import { mapProviderDetailResponse, mapProviderPageResponse } from '@/mappers/provider.mapper';
import {
  budgetDetailsGatewayResponse,
  budgetsPageGatewayResponse,
} from '@/mocks/gateway/budgets.gateway';
import { partsPageGatewayResponse } from '@/mocks/gateway/parts.gateway';
import {
  providerDetailGatewayResponse,
  providersPageGatewayResponse,
} from '@/mocks/gateway/providers.gateway';
import {
  budgetDetailResponseDtoSchema,
  budgetPageResponseDtoSchema,
} from '@/schemas/budget-dto.schema';
import { partPageResponseDtoSchema } from '@/schemas/part-dto.schema';
import {
  providerDetailResponseDtoSchema,
  providerPageResponseDtoSchema,
} from '@/schemas/provider-dto.schema';

/** Convierte un importe en texto decimal a centavos enteros, sin pasar por coma flotante. */
function aCentavos(importe: string): number {
  const [entero, decimales = ''] = importe.split('.');
  return Number(entero) * 100 + Number(decimales.padEnd(2, '0').slice(0, 2));
}

const [presupuestoConDecimal, presupuestoConRepuesto, presupuestoRechazado] =
  budgetDetailsGatewayResponse;

describe('Listados reales del MS3', () => {
  it('los mappers de página conservan total, desde y limite de cada respuesta', () => {
    const paginacion = ({ total, desde, limite }: { total: number; desde: number; limite: number }) => ({
      total,
      offset: desde,
      limit: limite,
    });

    expect(mapBudgetPageResponse(budgetsPageGatewayResponse)).toMatchObject(
      paginacion(budgetsPageGatewayResponse)
    );
    expect(mapManagedBudgetPageResponse(budgetsPageGatewayResponse)).toMatchObject(
      paginacion(budgetsPageGatewayResponse)
    );
    expect(mapPartPageResponse(partsPageGatewayResponse)).toMatchObject(
      paginacion(partsPageGatewayResponse)
    );
    expect(mapProviderPageResponse(providersPageGatewayResponse)).toMatchObject(
      paginacion(providersPageGatewayResponse)
    );
    // parts.mapper solo representa el total de la página.
    expect(mapSparePartsPage(partsPageGatewayResponse).total).toBe(partsPageGatewayResponse.total);
    expect(mapSuppliersPage(providersPageGatewayResponse).total).toBe(
      providersPageGatewayResponse.total
    );
  });

  it('cada listado trae la misma cantidad de elementos que indica su total', () => {
    expect(budgetsPageGatewayResponse.presupuestos).toHaveLength(budgetsPageGatewayResponse.total);
    expect(budgetDetailsGatewayResponse).toHaveLength(budgetsPageGatewayResponse.total);
    expect(partsPageGatewayResponse.repuestos).toHaveLength(partsPageGatewayResponse.total);
    expect(providersPageGatewayResponse.proveedores).toHaveLength(
      providersPageGatewayResponse.total
    );
  });
});

describe('Presupuestos reales del MS3', () => {
  it('la página y cada detalle cumplen los esquemas del contrato', () => {
    expect(budgetPageResponseDtoSchema.safeParse(budgetsPageGatewayResponse).success).toBe(true);
    budgetDetailsGatewayResponse.forEach((presupuesto) => {
      expect(budgetDetailResponseDtoSchema.safeParse(presupuesto).success).toBe(true);
    });
  });

  it('en la API, el total de cada versión es la suma de los subtotales de sus ítems', () => {
    budgetDetailsGatewayResponse.forEach((presupuesto) => {
      presupuesto.versiones.forEach((version) => {
        const suma = version.items.reduce((total, item) => total + aCentavos(item.subtotal), 0);

        expect(suma).toBe(aCentavos(version.total));
      });
    });
  });

  it('budget.mapper conserva el total y los ítems de cada versión como los entrega la API', () => {
    budgetDetailsGatewayResponse.forEach((respuesta) => {
      const presupuesto = mapBudgetDetailResponse(respuesta);

      expect(presupuesto.latestTotal).toBe(respuesta.total_ultima_version);
      presupuesto.versions.forEach((version, indice) => {
        const versionApi = respuesta.versiones[indice];

        expect(version.total).toBe(versionApi.total);
        expect(
          version.items.map((item) => [item.id, item.quantity, item.unitPrice, item.subtotal])
        ).toEqual(
          versionApi.items.map((item) => [
            String(item.item_id),
            item.cantidad,
            item.precio_unitario,
            item.subtotal,
          ])
        );
      });
    });
  });

  it('budget-management.mapper convierte el total y los ítems al mismo valor numérico', () => {
    budgetDetailsGatewayResponse.forEach((respuesta) => {
      const presupuesto = mapManagedBudgetDetailResponse(respuesta);

      expect(presupuesto.latestVersionTotal).toBe(Number(respuesta.total_ultima_version));
      presupuesto.versions.forEach((version, indice) => {
        const versionApi = respuesta.versiones[indice];

        expect(version.total).toBe(Number(versionApi.total));
        expect(
          version.items.map((item) => [item.id, item.quantity, item.unitPrice, item.subtotal])
        ).toEqual(
          versionApi.items.map((item) => [
            String(item.item_id),
            Number(item.cantidad),
            Number(item.precio_unitario),
            Number(item.subtotal),
          ])
        );
      });
    });
  });

  it('conserva la cantidad decimal de un ítem real (1.50 horas de mano de obra)', () => {
    const [, itemApi] = presupuestoConDecimal.versiones[0].items;
    const [, item] = mapBudgetDetailResponse(presupuestoConDecimal).versions[0].items;
    const [, itemGestion] = mapManagedBudgetDetailResponse(presupuestoConDecimal).versions[0]
      .items;

    expect(itemApi).toMatchObject({ cantidad: '1.50', precio_unitario: '18000.00', subtotal: '27000.00' });
    expect(item).toMatchObject({ quantity: '1.50', subtotal: '27000.00' });
    expect(itemGestion).toMatchObject({ quantity: 1.5, subtotal: 27000 });
  });

  it('representa un presupuesto aprobado con su versión vigente y la decisión del cliente', () => {
    const presupuesto = mapBudgetDetailResponse(presupuestoConRepuesto);
    const [version] = presupuesto.versions;

    expect(presupuesto).toMatchObject({
      id: '402',
      orderId: '202',
      latestStatus: 'aprobada',
      currentVersion: 1,
    });
    expect(version).toMatchObject({
      status: 'aprobada',
      createdById: '502',
      lockedAt: '2026-03-10T05:05:31.425951Z',
      decision: { id: '802', decision: 'aprobado', clientUserId: '501', reason: null },
    });
    expect(version.items[0]).toMatchObject({
      type: 'repuesto',
      partId: '601',
      partName: 'Filtro de aceite Toyota',
      supplierName: 'Repuestos Central UCT',
    });

    const presupuestoGestion = mapManagedBudgetDetailResponse(presupuestoConRepuesto);

    expect(presupuestoGestion).toMatchObject({
      id: '402',
      orderId: '202',
      latestVersionStatus: 'aprobada',
      currentVersion: 1,
    });
    expect(presupuestoGestion.versions[0].createdById).toBe('502');
  });

  it('representa un presupuesto rechazado sin versión vigente y con el motivo', () => {
    const presupuesto = mapBudgetDetailResponse(presupuestoRechazado);

    expect(presupuesto).toMatchObject({ latestStatus: 'rechazada', currentVersion: null });
    expect(presupuesto.versions[0]).toMatchObject({
      status: 'rechazada',
      lockedAt: null,
      decision: { decision: 'rechazado', reason: 'Precio demasiado alto' },
    });
  });

  it('vigente de cada versión coincide con version_vigente, que el modelo conserva', () => {
    // La app no declara `vigente`; el esquema lo descarta sin perder información, porque
    // `version_vigente` del presupuesto identifica la misma versión.
    budgetDetailsGatewayResponse.forEach((respuesta) => {
      const presupuesto = mapBudgetDetailResponse(respuesta);

      respuesta.versiones.forEach((version) => {
        expect(version.vigente).toBe(version.numero === presupuesto.currentVersion);
      });
    });
  });

  it('ambos mappers de la página conservan estados y totales de los resúmenes', () => {
    const esperado = budgetsPageGatewayResponse.presupuestos.map((resumen) => [
      String(resumen.presupuesto_id),
      resumen.estado_ultima_version,
      Number(resumen.total_ultima_version),
    ]);
    const comoFilas = (items: { id: string; latestVersionStatus: string; latestVersionTotal: number }[]) =>
      items.map((resumen) => [resumen.id, resumen.latestVersionStatus, resumen.latestVersionTotal]);

    expect(comoFilas(mapBudgetPageResponse(budgetsPageGatewayResponse).items)).toEqual(esperado);
    expect(comoFilas(mapManagedBudgetPageResponse(budgetsPageGatewayResponse).items)).toEqual(
      esperado
    );
  });
});

/**
 * Campos que la API entrega y el contrato declara, pero que ningún modelo de la app representa
 * todavía: `tipo_distribuidor`, `proveedor_tipo_distribuidor` y `umbral_general`. Los mappers
 * los descartan; su incorporación queda para la unificación de modelos de la Semana 4.
 */
describe('Repuestos y proveedores reales del MS3', () => {
  const [repuestoApi] = partsPageGatewayResponse.repuestos;
  const repuestoEsperado = {
    id: '601',
    name: 'Filtro de aceite Toyota',
    stock: 2,
    effectiveThreshold: 3,
    belowThreshold: true,
  };

  it('las respuestas cumplen los esquemas del contrato', () => {
    expect(partPageResponseDtoSchema.safeParse(partsPageGatewayResponse).success).toBe(true);
    expect(providerPageResponseDtoSchema.safeParse(providersPageGatewayResponse).success).toBe(true);
    expect(providerDetailResponseDtoSchema.safeParse(providerDetailGatewayResponse).success).toBe(
      true
    );
  });

  it('part.mapper y parts.mapper representan el mismo repuesto', () => {
    expect(mapPartPageResponse(partsPageGatewayResponse).items[0]).toMatchObject({
      ...repuestoEsperado,
      providerId: '901',
      customThreshold: null,
    });
    expect(mapSparePartsPage(partsPageGatewayResponse).items[0]).toMatchObject({
      ...repuestoEsperado,
      supplierId: '901',
      ownThreshold: null,
    });
    expect(repuestoApi.umbral_particular).toBeNull();
  });

  it('provider.mapper y parts.mapper representan el mismo proveedor y su detalle', () => {
    const proveedorEsperado = {
      id: '901',
      name: 'Repuestos Central UCT',
      contact: 'ventas@proveedor.example',
    };

    expect(mapProviderPageResponse(providersPageGatewayResponse).items[0]).toMatchObject({
      ...proveedorEsperado,
      partCount: 1,
    });
    expect(mapSuppliersPage(providersPageGatewayResponse).items[0]).toMatchObject({
      ...proveedorEsperado,
      partsCount: 1,
    });

    const detalle = mapProviderDetailResponse(providerDetailGatewayResponse);
    const detalleInventario = mapSupplierDetailResponse(providerDetailGatewayResponse);

    expect(detalle).toMatchObject({ ...proveedorEsperado, partCount: 1 });
    expect(detalle.parts).toHaveLength(1);
    expect(detalle.parts[0]).toMatchObject({ ...repuestoEsperado, providerId: '901' });
    expect(detalleInventario).toMatchObject({ ...proveedorEsperado, partsCount: 1 });
    expect(detalleInventario.parts).toHaveLength(1);
    expect(detalleInventario.parts[0]).toMatchObject({ ...repuestoEsperado, supplierId: '901' });
  });
});