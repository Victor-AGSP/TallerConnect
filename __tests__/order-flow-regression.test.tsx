import { StyleSheet } from 'react-native';
import {
  AxiosError,
  type AxiosAdapter,
  type InternalAxiosRequestConfig,
} from 'axios';

import {
  cleanup,
  fireEvent,
  renderRouterWithProviders,
  resetStores,
  screen,
  waitFor,
} from '../test-utils';
import OrdenScreen from '@/app/(admin)/ordenes/[id]';
import OrdenPresupuestoScreen from '@/app/(admin)/ordenes/[id]/presupuesto';
import MiOrdenScreen from '@/app/(cliente)/mis-ordenes/[id]';
import MiOrdenPresupuestoScreen from '@/app/(cliente)/mis-ordenes/[id]/presupuesto';
import OrdenAsignadaScreen from '@/app/(mecanico)/ordenes-asignadas/[id]';
import {
  ORDER_STATUS,
  getOrderStatusLabel,
  type WorkOrderStatus,
} from '@/constants/orderStatus';
import { colors } from '@/constants/theme';
import type { WorkOrder } from '@/models/order.model';
import { apiClient } from '@/services/api/client';
import { budgetsService } from '@/services/budgets.service';
import { ordersService } from '@/services/orders.service';
import { partsService } from '@/services/parts.service';
import { STORAGE_KEYS, storage } from '@/utils/storage';

/**
 * Regresión del flujo orden → presupuesto → repuestos en la app.
 *
 * Cubre lo que hoy existe en el proyecto: los estados del flujo definidos en
 * `ORDER_STATUS` y su propagación desde OrdersService hasta las vistas de
 * detalle de los tres roles, incluida la transición 3 → 4 / 5 que el
 * contrato de MS2 documenta para la aprobación del presupuesto.
 *
 * La relación orden ↔ presupuesto ↔ repuestos se verifica con BudgetsService
 * y PartsService reales sobre el cliente HTTP real; solo se sustituye el
 * adaptador de red con respuestas del contrato del MS3 (docs/integracion-ms3.md).
 *
 * Las transiciones de MS2 (C1 y C2 en docs/integracion-cruzada-ordenes.md)
 * se verifican con OrdersService real sobre el mismo adaptador simulado:
 * URL, método, cuerpo exacto de CambioEstadoSolicitud, respuesta y errores.
 */

jest.mock('@/services/orders.service', () => ({
  ordersService: {
    getOrderById: jest.fn(),
  },
}));

const mockedService = jest.mocked(ordersService);

const routes = {
  '(cliente)/mis-ordenes/[id]': MiOrdenScreen,
  '(mecanico)/ordenes-asignadas/[id]': OrdenAsignadaScreen,
  '(admin)/ordenes/[id]': OrdenScreen,
  '(cliente)/mis-ordenes/[id]/presupuesto': MiOrdenPresupuestoScreen,
  '(admin)/ordenes/[id]/presupuesto': OrdenPresupuestoScreen,
};

function orderWith(status: WorkOrderStatus): WorkOrder {
  return {
    id: 'ot-00126',
    vehicleId: 'veh-001',
    intakeId: 'ing-003',
    status,
    assignedMechanicId: 'usr-002',
    clientId: 'usr-001',
    createdById: 'usr-003',
    createdAt: '2026-03-04T08:00:00.000Z',
    updatedAt: '2026-03-04T08:00:00.000Z',
  };
}

function statusPill(status: WorkOrderStatus) {
  return screen.getByLabelText(
    `Estado de la orden: ${getOrderStatusLabel(status)}`,
  );
}

function backgroundOf(element: ReturnType<typeof statusPill>) {
  return StyleSheet.flatten(element.props.style).backgroundColor;
}

/** Espera a que la actualización termine para no solaparse con la prueba siguiente. */
async function waitForRefreshToSettle() {
  await waitFor(() =>
    expect(
      screen.getByTestId('order-detail-refresh').props.accessibilityState,
    ).toMatchObject({ busy: false }),
  );
}

async function renderOrder(path = '/ordenes/ot-00126') {
  await renderRouterWithProviders(routes, { initialUrl: path });

  await waitFor(() =>
    expect(screen.getByTestId('order-detail-ot-00126')).toBeTruthy(),
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  resetStores();
});

afterEach(() => cleanup());

describe('flujo orden → presupuesto → repuestos: representación de estados', () => {
  it.each([
    [ORDER_STATUS.ESPERANDO_DIAGNOSTICO, colors.infoSoft],
    [ORDER_STATUS.ESPERANDO_APROBACION_PRESUPUESTO, colors.warningSoft],
    [ORDER_STATUS.PAUSADO_POR_PRESUPUESTO_RECHAZADO, colors.dangerSoft],
    [ORDER_STATUS.ESPERANDO_REPUESTOS, colors.warningSoft],
    [ORDER_STATUS.EN_REPARACION, colors.warningSoft],
  ] as const)(
    'muestra el estado %s con su etiqueta y tono',
    async (status, background) => {
      mockedService.getOrderById.mockResolvedValueOnce(orderWith(status));

      await renderOrder();

      expect(backgroundOf(statusPill(status))).toBe(background);
    },
  );

  it.each([
    ['cliente', '/mis-ordenes/ot-00126'],
    ['mecánico', '/ordenes-asignadas/ot-00126'],
    ['administración', '/ordenes/ot-00126'],
  ] as const)(
    'la vista de %s muestra la espera de aprobación del presupuesto',
    async (_role, path) => {
      mockedService.getOrderById.mockResolvedValueOnce(
        orderWith(ORDER_STATUS.ESPERANDO_APROBACION_PRESUPUESTO),
      );

      await renderOrder(path);

      expect(
        statusPill(ORDER_STATUS.ESPERANDO_APROBACION_PRESUPUESTO),
      ).toBeTruthy();
      expect(mockedService.getOrderById).toHaveBeenCalledWith('ot-00126');
    },
  );
});

describe('flujo orden → presupuesto → repuestos: propagación de cambios', () => {
  it.each([
    ['esperando repuestos', ORDER_STATUS.ESPERANDO_REPUESTOS],
    ['en reparación', ORDER_STATUS.EN_REPARACION],
  ] as const)(
    'al actualizar refleja el paso de la aprobación del presupuesto a %s',
    async (_label, nextStatus) => {
      mockedService.getOrderById
        .mockResolvedValueOnce(
          orderWith(ORDER_STATUS.ESPERANDO_APROBACION_PRESUPUESTO),
        )
        .mockResolvedValueOnce({
          ...orderWith(nextStatus),
          updatedAt: '2026-03-06T10:00:00.000Z',
        });

      await renderOrder();

      await fireEvent.press(screen.getByRole('button', { name: 'Actualizar' }));

      await waitFor(() => expect(statusPill(nextStatus)).toBeTruthy());
      await waitForRefreshToSettle();

      expect(
        screen.queryByLabelText(
          `Estado de la orden: ${getOrderStatusLabel(
            ORDER_STATUS.ESPERANDO_APROBACION_PRESUPUESTO,
          )}`,
        ),
      ).toBeNull();
      expect(
        screen.getByLabelText('Última actualización: 06-03-2026'),
      ).toBeTruthy();
      expect(mockedService.getOrderById).toHaveBeenCalledTimes(2);
    },
  );

  it('propaga un error al actualizar y recupera el estado siguiente al reintentar', async () => {
    mockedService.getOrderById
      .mockResolvedValueOnce(
        orderWith(ORDER_STATUS.ESPERANDO_APROBACION_PRESUPUESTO),
      )
      .mockRejectedValueOnce(
        new Error('Backend no disponible o sin conexión a internet.'),
      )
      .mockResolvedValueOnce(orderWith(ORDER_STATUS.ESPERANDO_REPUESTOS));

    await renderOrder();

    await fireEvent.press(screen.getByRole('button', { name: 'Actualizar' }));

    await waitFor(() =>
      expect(screen.getByTestId('order-detail-error')).toBeTruthy(),
    );
    expect(
      screen.getByText('Backend no disponible o sin conexión a internet.'),
    ).toBeTruthy();

    // Un error no debe dejar visible un estado que ya no se pudo confirmar.
    expect(screen.queryByTestId('order-detail-ot-00126')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));

    await waitFor(() =>
      expect(statusPill(ORDER_STATUS.ESPERANDO_REPUESTOS)).toBeTruthy(),
    );
    await waitForRefreshToSettle();
    expect(mockedService.getOrderById).toHaveBeenCalledTimes(3);
  });
});

/* ------------------------------------------------------------------ */
/* Orden ↔ presupuesto ↔ repuestos (MS3)                               */
/* ------------------------------------------------------------------ */

const MS3_ORDER: WorkOrder = {
  ...orderWith(ORDER_STATUS.ESPERANDO_APROBACION_PRESUPUESTO),
  id: '31',
};

const PART_ITEM = {
  item_id: 11,
  tipo: 'repuesto',
  descripcion: 'Pastillas de freno delanteras',
  cantidad: '2',
  precio_unitario: '32500.00',
  subtotal: '65000.00',
  repuesto_id: 8,
  repuesto_nombre: 'Pastillas de freno',
  proveedor_nombre: 'Frenos Chile',
};

const LABOR_ITEM = {
  item_id: 12,
  tipo: 'mano_de_obra',
  descripcion: 'Cambio de pastillas',
  cantidad: '1',
  precio_unitario: '60000.00',
  subtotal: '60000.00',
  repuesto_id: null,
};

const SENT_VERSION = {
  numero: 1,
  estado: 'enviada',
  es_modificacion: false,
  creado_por_id: 99,
  creado_en: '2026-10-09T10:00:00-03:00',
  enviado_en: '2026-10-09T12:00:00-03:00',
  bloqueada_en: '2026-10-09T12:00:00-03:00',
  total: '125000.00',
  items: [PART_ITEM, LABOR_ITEM],
  decision: null,
};

const BUDGET_SUMMARY = {
  presupuesto_id: 5,
  orden_id: 31,
  creado_en: '2026-10-09T10:00:00-03:00',
  cantidad_versiones: 1,
  ultima_version: 1,
  estado_ultima_version: 'enviada',
  total_ultima_version: '125000.00',
  version_vigente: null,
};

const SENT_BUDGET = { ...BUDGET_SUMMARY, versiones: [SENT_VERSION] };

const APPROVED_BUDGET = {
  ...BUDGET_SUMMARY,
  estado_ultima_version: 'aprobada',
  version_vigente: 1,
  versiones: [
    {
      ...SENT_VERSION,
      estado: 'aprobada',
      decision: {
        decision_id: 77,
        decision: 'aprobado',
        cliente_usuario_id: 4,
        fecha_hora: '2026-10-10T15:00:00-03:00',
        motivo: null,
      },
    },
  ],
};

/** Inventario del MS3 con el repuesto presupuestado sin stock. */
const INVENTORY = {
  total: 1,
  desde: 0,
  limite: 50,
  umbral_general: 5,
  repuestos: [
    {
      repuesto_id: 8,
      nombre: 'Pastillas de freno',
      proveedor_id: 3,
      proveedor_nombre: 'Frenos Chile',
      stock: 0,
      umbral_particular: null,
      umbral_efectivo: 5,
      bajo_umbral: true,
    },
  ],
};

const adapter = jest.fn<ReturnType<AxiosAdapter>, Parameters<AxiosAdapter>>();
const originalAdapter = apiClient.defaults.adapter;

function respond(config: InternalAxiosRequestConfig, status: number, data: unknown) {
  const response = { data, status, statusText: String(status), headers: {}, config };

  if (status >= 400) {
    return Promise.reject(
      new AxiosError(
        `Request failed with status code ${status}`,
        AxiosError.ERR_BAD_REQUEST,
        config,
        null,
        response,
      ),
    );
  }

  return Promise.resolve(response);
}

/** MS3 simulado: presupuesto de la orden 31, decisión e inventario. */
function ms3(decisionResult: unknown) {
  let decided = false;

  adapter.mockImplementation((config) => {
    const key = `${config.method} ${config.url}`;

    if (key === 'get /presupuestos') {
      return respond(config, 200, {
        total: 1,
        desde: 0,
        limite: 50,
        presupuestos: config.params?.orden_id === 31 ? [BUDGET_SUMMARY] : [],
      });
    }
    if (key === 'get /presupuestos/5') {
      return respond(config, 200, decided ? APPROVED_BUDGET : SENT_BUDGET);
    }
    if (key === 'post /presupuestos/5/versiones/1/decision') {
      decided = true;
      return respond(config, 201, decisionResult);
    }
    if (key === 'get /repuestos') return respond(config, 200, INVENTORY);

    return respond(config, 404, { detail: `No simulado: ${key}` });
  });
}

function requestsTo(method: string, url: string) {
  return adapter.mock.calls.filter(
    ([config]) => config.method === method && config.url === url,
  );
}

describe('flujo orden → presupuesto → repuestos: integración con MS3', () => {
  beforeEach(() => {
    adapter.mockReset();
    apiClient.defaults.adapter = adapter;
    jest
      .spyOn(storage, 'get')
      .mockImplementation(async (key) =>
        key === STORAGE_KEYS.AUTH_TOKEN ? 'token-de-prueba' : null,
      );
  });

  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter;
    jest.restoreAllMocks();
  });

  it.each([
    ['cliente', '/mis-ordenes/31', '/mis-ordenes/31/presupuesto'],
    ['administración', '/ordenes/31', '/ordenes/31/presupuesto'],
  ] as const)(
    'asocia la orden con su presupuesto (vista de %s)',
    async (_role, orderPath, budgetPath) => {
      ms3(null);
      mockedService.getOrderById.mockResolvedValueOnce(MS3_ORDER);

      const view = renderRouterWithProviders(routes, { initialUrl: orderPath });
      await view;

      await waitFor(() =>
        expect(screen.getByTestId('order-detail-31')).toBeTruthy(),
      );
      // El detalle de la orden no consulta al MS3 hasta abrir el presupuesto.
      expect(adapter).not.toHaveBeenCalled();

      await fireEvent.press(screen.getByTestId('order-detail-open-budget'));

      await waitFor(() =>
        expect(screen.getByTestId('order-budget-5')).toBeTruthy(),
      );
      expect(view.getPathname()).toBe(budgetPath);

      // El presupuesto se busca por la orden de la ruta y se consulta su detalle.
      const [[search]] = requestsTo('get', '/presupuestos');
      expect(search.params).toEqual({ orden_id: 31 });
      expect(requestsTo('get', '/presupuestos/5')).toHaveLength(1);
      expect(screen.getByLabelText('Total del presupuesto: $125.000')).toBeTruthy();
    },
  );

  it('no asocia presupuestos de otra orden', async () => {
    ms3(null);

    await expect(budgetsService.getBudgetForOrder('32')).resolves.toBeNull();
    expect(requestsTo('get', '/presupuestos/5')).toHaveLength(0);
  });

  it('asocia el presupuesto aprobado con los repuestos requeridos', async () => {
    ms3({
      presupuesto: APPROVED_BUDGET,
      efecto_en_orden: 'esperando_repuestos',
      repuestos_faltantes: [
        { repuesto_id: 8, nombre: 'Pastillas de freno', requerido: '2', disponible: 0 },
      ],
      decision_id: 77,
      aplicacion_en_orden: { decision_id: 77, orden_id: 31, estado_aplicado: 4, historial_id: 300 },
    });

    await renderRouterWithProviders(routes, {
      initialUrl: '/mis-ordenes/31/presupuesto',
    });

    await waitFor(() =>
      expect(screen.getByTestId('order-budget-decision-form')).toBeTruthy(),
    );

    // El ítem presupuestado identifica el repuesto y su proveedor.
    expect(
      screen.getByLabelText(
        'Repuesto: Pastillas de freno delanteras. 2 × $32.500. Pastillas de freno · Frenos Chile. Subtotal: $65.000',
      ),
    ).toBeTruthy();

    await fireEvent.press(screen.getByTestId('order-budget-approve'));
    await fireEvent.press(screen.getByTestId('order-budget-confirm'));

    await waitFor(() =>
      expect(screen.getByTestId('order-budget-missing-parts')).toBeTruthy(),
    );
    expect(
      screen.getByText('Presupuesto aprobado. La orden queda esperando repuestos.'),
    ).toBeTruthy();
    expect(screen.getByText('Pastillas de freno: se requieren 2, hay 0')).toBeTruthy();
    await waitFor(() =>
      expect(screen.getByLabelText('Estado del presupuesto: Aprobado')).toBeTruthy(),
    );
    expect(requestsTo('post', '/presupuestos/5/versiones/1/decision')).toHaveLength(1);

    // El repuesto faltante y el del ítem son el mismo registro del inventario.
    const budget = await budgetsService.getBudgetForOrder('31');
    const inventory = await partsService.getSpareParts();
    const approved = budget?.versions.find((v) => v.number === budget.currentVersion);
    const requiredPartIds = approved?.items
      .filter((item) => item.type === 'repuesto')
      .map((item) => item.partId);

    expect(requiredPartIds).toEqual(['8']);
    expect(inventory.items.find((part) => part.id === '8')).toMatchObject({
      stock: 0,
      belowThreshold: true,
      supplierName: 'Frenos Chile',
    });
  });

  it('aprobar con stock suficiente pasa la orden a reparación sin faltantes', async () => {
    ms3({
      presupuesto: APPROVED_BUDGET,
      efecto_en_orden: 'en_reparacion',
      repuestos_faltantes: [],
      decision_id: 77,
      aplicacion_en_orden: { decision_id: 77, orden_id: 31, estado_aplicado: 5, historial_id: 300 },
    });

    await renderRouterWithProviders(routes, {
      initialUrl: '/mis-ordenes/31/presupuesto',
    });

    await waitFor(() =>
      expect(screen.getByTestId('order-budget-approve')).toBeTruthy(),
    );
    await fireEvent.press(screen.getByTestId('order-budget-approve'));
    await fireEvent.press(screen.getByTestId('order-budget-confirm'));

    await waitFor(() =>
      expect(
        screen.getByText('Presupuesto aprobado. La orden pasa a reparación.'),
      ).toBeTruthy(),
    );
    expect(screen.queryByTestId('order-budget-missing-parts')).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* Estados y transiciones de MS2 (C1 y C2, corregidos)                  */
/* ------------------------------------------------------------------ */

/**
 * OrdersService real (el módulo está simulado en este archivo para las
 * pruebas de representación): HTTP → mapper → modelo → vista.
 */
const {
  OrdersService: ActualOrdersService,
  RealOrderAdapter: ActualRealOrderAdapter,
} = jest.requireActual<typeof import('@/services/orders.service')>(
  '@/services/orders.service',
);
const realOrders = new ActualOrdersService(new ActualRealOrderAdapter());

/** `OrdenRespuesta` de la orden 31 con el código de estado indicado. */
function ms2Order(estado_codigo: number) {
  return {
    orden_id: 31,
    vehiculo_id: 12,
    ingreso_id: 18,
    estado_codigo,
    mecanico_actual_id: 50,
    creado_por_id: 99,
    creado_en: '2026-10-09T10:00:00-03:00',
    actualizado_en: '2026-10-10T15:00:00-03:00',
  };
}

describe('flujo orden → presupuesto → repuestos: estados y transiciones MS2', () => {
  beforeEach(() => {
    adapter.mockReset();
    apiClient.defaults.adapter = adapter;
    jest
      .spyOn(storage, 'get')
      .mockImplementation(async (key) =>
        key === STORAGE_KEYS.AUTH_TOKEN ? 'token-de-prueba' : null,
      );
    mockedService.getOrderById.mockImplementation((id, params) =>
      realOrders.getOrderById(id, params),
    );
  });

  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter;
    jest.restoreAllMocks();
  });

  it.each([
    [4, ORDER_STATUS.ESPERANDO_REPUESTOS],
    [5, ORDER_STATUS.EN_REPARACION],
  ] as const)(
    'propaga los códigos 3 → %i del contrato hasta la vista',
    async (nextCode, nextStatus) => {
      const responses = [ms2Order(3), ms2Order(nextCode)];
      adapter.mockImplementation((config) =>
        config.method === 'get' && config.url === '/ordenes/31'
          ? respond(config, 200, responses.shift())
          : respond(config, 404, { detail: 'No simulado' }),
      );

      await renderRouterWithProviders(routes, { initialUrl: '/mis-ordenes/31' });
      await waitFor(() =>
        expect(screen.getByTestId('order-detail-31')).toBeTruthy(),
      );
      expect(statusPill(ORDER_STATUS.ESPERANDO_APROBACION_PRESUPUESTO)).toBeTruthy();

      // Tras la decisión aplicada por MS3, la actualización muestra el nuevo estado.
      await fireEvent.press(screen.getByTestId('order-detail-refresh'));

      await waitFor(() => expect(statusPill(nextStatus)).toBeTruthy());
      expect(
        screen.queryByLabelText(
          `Estado de la orden: ${getOrderStatusLabel(ORDER_STATUS.ESPERANDO_APROBACION_PRESUPUESTO)}`,
        ),
      ).toBeNull();
      expect(requestsTo('get', '/ordenes/31')).toHaveLength(2);
      await waitForRefreshToSettle();
    },
  );

  it('registra el cambio de estado mediante PATCH /ordenes/{id}/estado', async () => {
    adapter.mockImplementation((config) => respond(config, 200, ms2Order(6)));

    const updated = await realOrders.updateOrderStatus(
      '31',
      ORDER_STATUS.LISTO_PARA_ENTREGA,
    );

    expect(adapter).toHaveBeenCalledTimes(1);
    const [[config]] = adapter.mock.calls;
    expect(config.method).toBe('patch');
    expect(config.url).toBe('/ordenes/31/estado');
    expect(JSON.parse(config.data)).toStrictEqual({ estado_destino: 6 });
    expect(updated).toMatchObject({ id: '31', status: ORDER_STATUS.LISTO_PARA_ENTREGA });
  });

  it('envía la observación recortada y omite una vacía (minLength 1)', async () => {
    adapter.mockImplementation((config) => respond(config, 200, ms2Order(6)));

    await realOrders.updateOrderStatus('31', ORDER_STATUS.LISTO_PARA_ENTREGA, {
      observacion: '  Trabajo terminado  ',
    });
    await realOrders.updateOrderStatus('31', ORDER_STATUS.LISTO_PARA_ENTREGA, {
      observacion: '   ',
    });

    const bodies = requestsTo('patch', '/ordenes/31/estado').map(([config]) =>
      JSON.parse(config.data),
    );
    expect(bodies).toStrictEqual([
      { estado_destino: 6, observacion: 'Trabajo terminado' },
      { estado_destino: 6 },
    ]);
  });

  it('la cancelación exige observación y no llama a MS2 sin ella', async () => {
    await expect(
      realOrders.updateOrderStatus('31', ORDER_STATUS.CANCELADO, { observacion: ' ' }),
    ).rejects.toThrow('La cancelación requiere una observación.');
    expect(adapter).not.toHaveBeenCalled();
  });

  it.each([
    ORDER_STATUS.PAUSADO_POR_PRESUPUESTO_RECHAZADO,
    ORDER_STATUS.CONTROL_CALIDAD,
  ])('el estado %s no existe en MS2 y no se envía', async (status) => {
    await expect(realOrders.updateOrderStatus('31', status)).rejects.toThrow(
      `Estado no soportado por MS2: ${status}`,
    );
    expect(adapter).not.toHaveBeenCalled();
  });

  it.each([
    ['3 → 4, reservada a la decisión de presupuesto', ORDER_STATUS.ESPERANDO_REPUESTOS, 4],
    ['4 → 5, bloqueada hasta verificar repuestos', ORDER_STATUS.EN_REPARACION, 5],
    ['6 → 7, reservada a la entrega', ORDER_STATUS.ENTREGADO, 7],
    ['desde un estado terminal', ORDER_STATUS.RECIBIDO, 1],
  ] as const)(
    'informa el 409 de una transición %s sin alterar la orden',
    async (_case, status, code) => {
      const detail = 'Transición no permitida, terminal o reservada a una operación específica';
      adapter.mockImplementation((config) =>
        config.method === 'patch'
          ? respond(config, 409, { detail })
          : respond(config, 200, ms2Order(3)),
      );

      await expect(realOrders.updateOrderStatus('31', status)).rejects.toMatchObject({
        status: 409,
        code: 'ORDER_CONFLICT',
        message: detail,
      });

      const [[patch]] = requestsTo('patch', '/ordenes/31/estado');
      expect(JSON.parse(patch.data)).toStrictEqual({ estado_destino: code });
      // El PATCH no se reintenta y el detalle sigue mostrando el estado anterior.
      expect(requestsTo('patch', '/ordenes/31/estado')).toHaveLength(1);
      await expect(realOrders.getOrderById('31')).resolves.toMatchObject({
        status: ORDER_STATUS.ESPERANDO_APROBACION_PRESUPUESTO,
      });
    },
  );

  it.each([
    [403, 'ORDER_FORBIDDEN', 'Se requiere rol Administrador o Mecánico asignado; solo este último finaliza el trabajo'],
    [404, 'ORDER_NOT_FOUND', 'Orden no encontrada'],
    [422, 'ORDER_VALIDATION_ERROR', 'Estado de destino desconocido, cancelación sin motivo o datos inválidos'],
    [500, 'ORDER_SERVER_ERROR', 'No fue posible completar la persistencia'],
  ] as const)(
    'normaliza el error %i del PATCH de estado',
    async (status, code, detail) => {
      adapter.mockImplementation((config) => respond(config, status, { detail }));

      await expect(
        realOrders.updateOrderStatus('31', ORDER_STATUS.LISTO_PARA_ENTREGA),
      ).rejects.toMatchObject({ status, code, message: detail });
      expect(adapter).toHaveBeenCalledTimes(1);
    },
  );

  it('rechaza una respuesta del PATCH que no cumple OrdenRespuesta', async () => {
    adapter.mockImplementation((config) => respond(config, 200, { orden_id: 31 }));

    await expect(
      realOrders.updateOrderStatus('31', ORDER_STATUS.LISTO_PARA_ENTREGA),
    ).rejects.toMatchObject({ code: 'ORDER_INVALID_RESPONSE' });
  });
});
