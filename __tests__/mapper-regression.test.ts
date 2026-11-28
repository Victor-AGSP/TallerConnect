import { mapUserResponse } from '@/mappers/auth.mapper';
import { mapBudgetDetailResponse, mapBudgetPageResponse } from '@/mappers/budget.mapper';
import {
  mapBudgetDetailResponse as mapManagedBudgetDetailResponse,
  mapBudgetPageResponse as mapManagedBudgetPageResponse,
} from '@/mappers/budget-management.mapper';
import { mapOrderResponse } from '@/mappers/order.mapper';
import { mapPartPageResponse } from '@/mappers/part.mapper';
import { mapSparePartsPage, mapSupplierDetailResponse, mapSuppliersPage } from '@/mappers/parts.mapper';
import { mapProviderDetailResponse, mapProviderPageResponse } from '@/mappers/provider.mapper';
import { mapVehicleResponse } from '@/mappers/vehicle.mapper';
import { authMeGatewayResponses } from '@/mocks/gateway/auth-me.gateway';
import {
  budgetDetailsGatewayResponse,
  budgetsPageGatewayResponse,
} from '@/mocks/gateway/budgets.gateway';
import { ordersGatewayResponse } from '@/mocks/gateway/orders.gateway';
import { partsPageGatewayResponse } from '@/mocks/gateway/parts.gateway';
import {
  providerDetailGatewayResponse,
  providersPageGatewayResponse,
} from '@/mocks/gateway/providers.gateway';
import { vehiclesGatewayResponse } from '@/mocks/gateway/vehicles.gateway';

/** Todas las fixtures con respuestas reales anonimizadas de la API Gateway. */
const FIXTURES = {
  'auth-me.gateway.ts': authMeGatewayResponses,
  'vehicles.gateway.ts': vehiclesGatewayResponse,
  'orders.gateway.ts': ordersGatewayResponse,
  'budgets.gateway.ts': [budgetsPageGatewayResponse, budgetDetailsGatewayResponse],
  'parts.gateway.ts': partsPageGatewayResponse,
  'providers.gateway.ts': [providersPageGatewayResponse, providerDetailGatewayResponse],
};

/** Centena ficticia que corresponde a cada campo identificador según la convención de anonimización. */
const CENTENA_POR_IDENTIFICADOR: Record<string, number> = {
  vehiculo_id: 1,
  orden_id: 2,
  ingreso_id: 3,
  presupuesto_id: 4,
  id: 5,
  cliente_id: 5,
  mecanico_actual_id: 5,
  creado_por_id: 5,
  devuelto_por_id: 5,
  cliente_usuario_id: 5,
  repuesto_id: 6,
  item_id: 7,
  decision_id: 8,
  proveedor_id: 9,
};

/** Palabras que no pueden aparecer en el nombre de un campo, sin distinguir mayúsculas ni separadores. */
const PALABRAS_DE_CREDENCIALES = [
  'password',
  'contrasena',
  'token',
  'secret',
  'authorization',
  'apikey',
  'cookie',
  'credential',
  'session',
];

/** Convierte `access_token`, `accessToken`, `Access-Token` o `access.token` en `accesstoken`. */
const normalizarCampo = (campo: string) => campo.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Recorre un valor y devuelve cada par campo-valor de sus objetos, a cualquier profundidad. */
function camposDe(valor: unknown): [string, unknown][] {
  if (Array.isArray(valor)) return valor.flatMap(camposDe);
  if (valor === null || typeof valor !== 'object') return [];
  return Object.entries(valor).flatMap(([campo, contenido]) => [
    [campo, contenido] as [string, unknown],
    ...camposDe(contenido),
  ]);
}

const camposPorFixture = Object.entries(FIXTURES).map(
  ([archivo, contenido]) => [archivo, camposDe(contenido)] as const
);

describe('Fixtures anonimizadas de la API Gateway', () => {
  it.each(camposPorFixture)('%s: no contiene credenciales ni tokens', (_, campos) => {
    campos.forEach(([campo, valor]) => {
      PALABRAS_DE_CREDENCIALES.forEach((palabra) => {
        expect([campo, normalizarCampo(campo).includes(palabra)]).toEqual([campo, false]);
      });
      if (typeof valor === 'string') {
        expect(valor).not.toMatch(/eyJ[\w-]+\./);
        expect(valor).not.toMatch(/^[\w-]{10,}\.[\w-]{10,}\.[\w-]{10,}$/);
        expect(valor).not.toMatch(/bearer\s/i);
      }
    });
  });

  it.each(camposPorFixture)('%s: los correos usan dominios reservados ficticios', (_, campos) => {
    campos
      .filter(([, valor]) => typeof valor === 'string' && valor.includes('@'))
      .forEach(([, correo]) => {
        expect(correo).toMatch(/@[\w.-]+\.(invalid|example)$/);
      });
  });

  it.each(camposPorFixture)(
    '%s: cada identificador usa la centena ficticia de su entidad',
    (_, campos) => {
      campos
        .filter(([campo]) => campo === 'id' || campo.endsWith('_id'))
        .forEach(([campo, valor]) => {
          expect(Object.keys(CENTENA_POR_IDENTIFICADOR)).toContain(campo);
          if (valor !== null) {
            expect([campo, Number.isSafeInteger(valor)]).toEqual([campo, true]);
            expect([campo, Math.floor(Number(valor) / 100)]).toEqual([
              campo,
              CENTENA_POR_IDENTIFICADOR[campo],
            ]);
          }
        });
    }
  );
});

describe('Relaciones entre fixtures', () => {
  const cliente = authMeGatewayResponses.cliente.id;
  const mecanico = authMeGatewayResponses.mecanico.id;
  const administrador = authMeGatewayResponses.administrador.id;
  const vehiculos = vehiclesGatewayResponse.map((vehiculo) => vehiculo.vehiculo_id);
  const ordenes = ordersGatewayResponse.map((orden) => orden.orden_id);
  const repuestos = partsPageGatewayResponse.repuestos.map((repuesto) => repuesto.repuesto_id);
  const proveedores = providersPageGatewayResponse.proveedores.map(
    (proveedor) => proveedor.proveedor_id
  );
  const versiones = budgetDetailsGatewayResponse.flatMap((presupuesto) => presupuesto.versiones);

  it('los vehículos pertenecen al usuario cliente', () => {
    vehiclesGatewayResponse.forEach((vehiculo) => {
      expect(vehiculo.cliente_id).toBe(cliente);
    });
  });

  it('las órdenes apuntan a vehículos y usuarios de las fixtures, salvo las excepciones documentadas', () => {
    expect(
      ordersGatewayResponse.map((orden) => orden.vehiculo_id).filter((id) => !vehiculos.includes(id))
    ).toEqual([104]);
    expect(
      ordersGatewayResponse
        .map((orden) => orden.mecanico_actual_id)
        .filter((id) => id !== mecanico)
    ).toEqual([506]);
    expect(ordersGatewayResponse.find((orden) => orden.orden_id === 203)).toMatchObject({
      vehiculo_id: 104,
      mecanico_actual_id: 506,
    });
    ordersGatewayResponse.forEach((orden) => {
      expect(orden.creado_por_id).toBe(administrador);
      expect([null, administrador]).toContain(orden.devuelto_por_id);
    });
  });

  it('los presupuestos apuntan a órdenes de la fixture, salvo la excepción documentada', () => {
    expect(
      budgetDetailsGatewayResponse
        .map((presupuesto) => presupuesto.orden_id)
        .filter((id) => !ordenes.includes(id))
    ).toEqual([206]);
    expect(
      budgetDetailsGatewayResponse.find((presupuesto) => presupuesto.presupuesto_id === 404)
    ).toMatchObject({ orden_id: 206 });
    expect(budgetsPageGatewayResponse.presupuestos.map((resumen) => resumen.presupuesto_id)).toEqual(
      [...budgetDetailsGatewayResponse].reverse().map((presupuesto) => presupuesto.presupuesto_id)
    );
  });

  it('las versiones las crea el mecánico y las decide el cliente', () => {
    versiones.forEach((version) => {
      expect(version.creado_por_id).toBe(mecanico);
      expect(version.decision?.cliente_usuario_id).toBe(cliente);
    });
  });

  it('los ítems de repuesto apuntan al repuesto y al proveedor de las fixtures', () => {
    const itemsDeRepuesto = versiones
      .flatMap((version) => version.items)
      .filter((item) => item.tipo === 'repuesto');
    const [repuesto] = partsPageGatewayResponse.repuestos;

    expect(itemsDeRepuesto.length).toBeGreaterThan(0);
    itemsDeRepuesto.forEach((item) => {
      expect(repuestos).toContain(item.repuesto_id);
      expect(item).toMatchObject({
        repuesto_nombre: repuesto.nombre,
        proveedor_nombre: repuesto.proveedor_nombre,
      });
    });
  });

  it('los repuestos apuntan al proveedor de las fixtures y su detalle los incluye', () => {
    partsPageGatewayResponse.repuestos.forEach((repuesto) => {
      expect(proveedores).toContain(repuesto.proveedor_id);
    });
    expect(providerDetailGatewayResponse.repuestos).toEqual(partsPageGatewayResponse.repuestos);
  });
});

describe('Regresión de mappers con las fixtures reales', () => {
  it('mapUserResponse', () => {
    expect(mapUserResponse(authMeGatewayResponses.cliente)).toStrictEqual({
      id: '501',
      name: 'Usuario Cliente',
      email: 'usuario501@example.invalid',
      role: 'cliente',
    });
    expect(mapUserResponse(authMeGatewayResponses.mecanico)).toStrictEqual({
      id: '502',
      name: 'Usuario Mecánico',
      email: 'usuario502@example.invalid',
      role: 'mecanico',
    });
    expect(mapUserResponse(authMeGatewayResponses.administrador)).toStrictEqual({
      id: '503',
      name: 'Usuario Administrador',
      email: 'usuario503@example.invalid',
      role: 'administrador',
    });
  });

  it('mapVehicleResponse', () => {
    expect(vehiclesGatewayResponse.map(mapVehicleResponse)).toStrictEqual([
      {
        id: '101',
        plate: 'XYZW10',
        brand: 'Toyota',
        model: 'Corolla',
        year: 2019,
        mileage: 65000,
        ownerId: '501',
      },
      {
        id: '102',
        plate: 'XYZW20',
        brand: 'Hyundai',
        model: 'Accent',
        year: 2017,
        mileage: 98000,
        ownerId: '501',
      },
      {
        id: '103',
        plate: '900001',
        brand: 'nissan',
        model: 'pathfinder',
        year: 2007,
        mileage: 8425,
        ownerId: '501',
      },
    ]);
  });

  it('mapOrderResponse', () => {
    expect(ordersGatewayResponse.map(mapOrderResponse)).toStrictEqual([
      {
        id: '201',
        vehicleId: '101',
        intakeId: '301',
        status: 'listo_para_entrega',
        assignedMechanicId: '502',
        createdById: '503',
        createdAt: '2026-01-05T10:15:30.123456Z',
        updatedAt: '2026-01-20T16:40:12.654321Z',
        returnedAt: null,
        returnedById: null,
      },
      {
        id: '202',
        vehicleId: '102',
        intakeId: '302',
        status: 'en_reparacion',
        assignedMechanicId: '502',
        createdById: '503',
        createdAt: '2026-01-07T09:05:10.111111Z',
        updatedAt: '2026-01-25T11:30:45.222222Z',
        returnedAt: null,
        returnedById: null,
      },
      {
        id: '203',
        vehicleId: '104',
        intakeId: '303',
        status: 'cancelado',
        assignedMechanicId: '506',
        createdById: '503',
        createdAt: '2026-02-02T14:00:00.333333Z',
        updatedAt: '2026-02-02T15:30:00.444444Z',
        returnedAt: '2026-02-02T15:30:00.444444Z',
        returnedById: '503',
      },
    ]);
  });

  it('mapBudgetDetailResponse de budget.mapper: aprobado con cantidad decimal', () => {
    expect(mapBudgetDetailResponse(budgetDetailsGatewayResponse[0])).toStrictEqual({
      id: '401',
      orderId: '201',
      createdAt: '2026-03-10T04:55:12.688139Z',
      latestVersion: 1,
      latestStatus: 'aprobada',
      latestTotal: '52000.00',
      currentVersion: 1,
      versions: [
        {
          number: 1,
          status: 'aprobada',
          isModification: false,
          createdById: '502',
          lockedAt: '2026-03-10T04:55:32.747943Z',
          createdAt: '2026-03-10T04:55:12.688139Z',
          sentAt: '2026-03-10T04:55:22.393791Z',
          total: '52000.00',
          items: [
            {
              id: '701',
              type: 'mano_de_obra',
              description: 'Cambio de aceite y filtro',
              quantity: '1.00',
              unitPrice: '25000.00',
              subtotal: '25000.00',
              partId: null,
              partName: null,
              supplierName: null,
            },
            {
              id: '702',
              type: 'mano_de_obra',
              description: 'Revision de frenos',
              quantity: '1.50',
              unitPrice: '18000.00',
              subtotal: '27000.00',
              partId: null,
              partName: null,
              supplierName: null,
            },
          ],
          decision: {
            id: '801',
            decision: 'aprobado',
            clientUserId: '501',
            decidedAt: '2026-03-10T04:55:32.747943Z',
            reason: null,
          },
        },
      ],
    });
  });

  it('mapBudgetDetailResponse de budget.mapper: rechazado con repuesto', () => {
    expect(mapBudgetDetailResponse(budgetDetailsGatewayResponse[2])).toStrictEqual({
      id: '403',
      orderId: '203',
      createdAt: '2026-03-10T05:07:24.686397Z',
      latestVersion: 1,
      latestStatus: 'rechazada',
      latestTotal: '35960.00',
      currentVersion: null,
      versions: [
        {
          number: 1,
          status: 'rechazada',
          isModification: false,
          createdById: '502',
          lockedAt: null,
          createdAt: '2026-03-10T05:07:24.686397Z',
          sentAt: '2026-03-10T05:07:24.897654Z',
          total: '35960.00',
          items: [
            {
              id: '705',
              type: 'repuesto',
              description: 'Filtro de aceite Toyota',
              quantity: '4.00',
              unitPrice: '8990.00',
              subtotal: '35960.00',
              partId: '601',
              partName: 'Filtro de aceite Toyota',
              supplierName: 'Repuestos Central UCT',
            },
          ],
          decision: {
            id: '803',
            decision: 'rechazado',
            clientUserId: '501',
            decidedAt: '2026-03-10T05:07:25.385269Z',
            reason: 'Precio demasiado alto',
          },
        },
      ],
    });
  });

  it('mapBudgetDetailResponse de budget-management.mapper: aprobado con cantidad decimal', () => {
    expect(mapManagedBudgetDetailResponse(budgetDetailsGatewayResponse[0])).toStrictEqual({
      id: '401',
      orderId: '201',
      createdAt: '2026-03-10T04:55:12.688139Z',
      versionCount: 1,
      latestVersion: 1,
      latestVersionStatus: 'aprobada',
      latestVersionTotal: 52000,
      currentVersion: 1,
      versions: [
        {
          number: 1,
          status: 'aprobada',
          isModification: false,
          createdById: '502',
          createdAt: '2026-03-10T04:55:12.688139Z',
          sentAt: '2026-03-10T04:55:22.393791Z',
          lockedAt: '2026-03-10T04:55:32.747943Z',
          total: 52000,
          items: [
            {
              id: '701',
              type: 'mano_de_obra',
              description: 'Cambio de aceite y filtro',
              quantity: 1,
              unitPrice: 25000,
              subtotal: 25000,
              partId: null,
              partName: null,
              providerName: null,
            },
            {
              id: '702',
              type: 'mano_de_obra',
              description: 'Revision de frenos',
              quantity: 1.5,
              unitPrice: 18000,
              subtotal: 27000,
              partId: null,
              partName: null,
              providerName: null,
            },
          ],
          decision: {
            id: '801',
            decision: 'aprobado',
            clientUserId: '501',
            decidedAt: '2026-03-10T04:55:32.747943Z',
            reason: null,
          },
        },
      ],
    });
  });

  it('mapBudgetDetailResponse de budget-management.mapper: rechazado con repuesto', () => {
    expect(mapManagedBudgetDetailResponse(budgetDetailsGatewayResponse[2])).toStrictEqual({
      id: '403',
      orderId: '203',
      createdAt: '2026-03-10T05:07:24.686397Z',
      versionCount: 1,
      latestVersion: 1,
      latestVersionStatus: 'rechazada',
      latestVersionTotal: 35960,
      currentVersion: null,
      versions: [
        {
          number: 1,
          status: 'rechazada',
          isModification: false,
          createdById: '502',
          createdAt: '2026-03-10T05:07:24.686397Z',
          sentAt: '2026-03-10T05:07:24.897654Z',
          lockedAt: null,
          total: 35960,
          items: [
            {
              id: '705',
              type: 'repuesto',
              description: 'Filtro de aceite Toyota',
              quantity: 4,
              unitPrice: 8990,
              subtotal: 35960,
              partId: '601',
              partName: 'Filtro de aceite Toyota',
              providerName: 'Repuestos Central UCT',
            },
          ],
          decision: {
            id: '803',
            decision: 'rechazado',
            clientUserId: '501',
            decidedAt: '2026-03-10T05:07:25.385269Z',
            reason: 'Precio demasiado alto',
          },
        },
      ],
    });
  });

  it('mapBudgetPageResponse de ambos mappers', () => {
    const paginaEsperada = {
      items: [
        {
          id: '404',
          orderId: '206',
          createdAt: '2026-03-10T05:41:45.874290Z',
          versionCount: 1,
          latestVersion: 1,
          latestVersionStatus: 'aprobada',
          latestVersionTotal: 23990,
          currentVersion: 1,
        },
        {
          id: '403',
          orderId: '203',
          createdAt: '2026-03-10T05:07:24.686397Z',
          versionCount: 1,
          latestVersion: 1,
          latestVersionStatus: 'rechazada',
          latestVersionTotal: 35960,
          currentVersion: null,
        },
        {
          id: '402',
          orderId: '202',
          createdAt: '2026-03-10T05:05:18.498825Z',
          versionCount: 1,
          latestVersion: 1,
          latestVersionStatus: 'aprobada',
          latestVersionTotal: 29980,
          currentVersion: 1,
        },
        {
          id: '401',
          orderId: '201',
          createdAt: '2026-03-10T04:55:12.688139Z',
          versionCount: 1,
          latestVersion: 1,
          latestVersionStatus: 'aprobada',
          latestVersionTotal: 52000,
          currentVersion: 1,
        },
      ],
      total: 4,
      offset: 0,
      limit: 50,
    };

    expect(mapBudgetPageResponse(budgetsPageGatewayResponse)).toStrictEqual(paginaEsperada);
    expect(mapManagedBudgetPageResponse(budgetsPageGatewayResponse)).toStrictEqual(paginaEsperada);
  });

  it('mapPartPageResponse', () => {
    expect(mapPartPageResponse(partsPageGatewayResponse)).toStrictEqual({
      items: [
        {
          id: '601',
          name: 'Filtro de aceite Toyota',
          providerId: '901',
          providerName: 'Repuestos Central UCT',
          stock: 2,
          customThreshold: null,
          effectiveThreshold: 3,
          belowThreshold: true,
        },
      ],
      total: 1,
      offset: 0,
      limit: 50,
    });
  });

  it('mapProviderPageResponse y mapProviderDetailResponse', () => {
    const proveedor = {
      id: '901',
      name: 'Repuestos Central UCT',
      contact: 'ventas@proveedor.example',
      partCount: 1,
    };

    expect(mapProviderPageResponse(providersPageGatewayResponse)).toStrictEqual({
      items: [proveedor],
      total: 1,
      offset: 0,
      limit: 50,
    });
    expect(mapProviderDetailResponse(providerDetailGatewayResponse)).toStrictEqual({
      ...proveedor,
      parts: [
        {
          id: '601',
          name: 'Filtro de aceite Toyota',
          providerId: '901',
          providerName: 'Repuestos Central UCT',
          stock: 2,
          customThreshold: null,
          effectiveThreshold: 3,
          belowThreshold: true,
        },
      ],
    });
  });

  it('mapSparePartsPage, mapSuppliersPage y mapSupplierDetailResponse de parts.mapper', () => {
    const repuesto = {
      id: '601',
      name: 'Filtro de aceite Toyota',
      supplierId: '901',
      supplierName: 'Repuestos Central UCT',
      stock: 2,
      ownThreshold: null,
      effectiveThreshold: 3,
      belowThreshold: true,
    };
    const proveedor = {
      id: '901',
      name: 'Repuestos Central UCT',
      contact: 'ventas@proveedor.example',
      partsCount: 1,
    };

    expect(mapSparePartsPage(partsPageGatewayResponse)).toStrictEqual({
      items: [repuesto],
      total: 1,
    });
    expect(mapSuppliersPage(providersPageGatewayResponse)).toStrictEqual({
      items: [proveedor],
      total: 1,
    });
    expect(mapSupplierDetailResponse(providerDetailGatewayResponse)).toStrictEqual({
      ...proveedor,
      parts: [repuesto],
    });
  });
});