import { apiClient } from '@/services/api/client';
import {
  budgetsService,
  DecisionApplicationPendingError,
} from '@/services/budgets.service';
import {
  INVALID_BUDGET_RESPONSE,
  mapBudgetDetailResponse,
  mapBudgetOperationResult,
} from '@/mappers/budget.mapper';
import type {
  BudgetDetailResponseDto,
  BudgetOperationResultDto,
  BudgetsPageDto,
  BudgetVersionResponseDto,
} from '@/dto/budget.dto';

jest.mock('@/services/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  },
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

/**
 * BudgetsService y su mapper frente al contrato del MS3
 * (`/ms3/openapi.json`, versión 0.1.0, consultado el 14-10-2026).
 *
 * Solo se simula el cliente HTTP. Ninguna prueba envía decisiones reales.
 */

/** Campos obligatorios publicados por el contrato para cada esquema. */
const CONTRACT_REQUIRED = {
  PresupuestoResumen: [
    'presupuesto_id',
    'orden_id',
    'creado_en',
    'cantidad_versiones',
    'ultima_version',
    'estado_ultima_version',
    'total_ultima_version',
    'version_vigente',
  ],
  PresupuestoDetalle: [
    'presupuesto_id',
    'orden_id',
    'creado_en',
    'cantidad_versiones',
    'ultima_version',
    'estado_ultima_version',
    'total_ultima_version',
    'version_vigente',
    'versiones',
  ],
  PaginaPresupuestos: ['total', 'desde', 'limite', 'presupuestos'],
  VersionDetalle: [
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
  ],
  ItemSalida: [
    'item_id',
    'tipo',
    'descripcion',
    'cantidad',
    'precio_unitario',
    'subtotal',
    'repuesto_id',
  ],
  DecisionSalida: [
    'decision_id',
    'decision',
    'cliente_usuario_id',
    'fecha_hora',
    'motivo',
  ],
};

const ITEM_PART = {
  item_id: 11,
  tipo: 'repuesto' as const,
  descripcion: 'Pastillas de freno delanteras',
  cantidad: '2',
  precio_unitario: '32500.00',
  subtotal: '65000.00',
  repuesto_id: 8,
};

const ITEM_LABOR = {
  item_id: 12,
  tipo: 'mano_de_obra' as const,
  descripcion: 'Cambio de pastillas',
  cantidad: '1',
  precio_unitario: '60000.00',
  subtotal: '60000.00',
  repuesto_id: null,
};

const DECISION = {
  decision_id: 77,
  decision: 'aprobado' as const,
  cliente_usuario_id: 4,
  fecha_hora: '2026-10-10T15:00:00-03:00',
  motivo: null,
};

const VERSION_1: BudgetVersionResponseDto = {
  numero: 1,
  estado: 'aprobada',
  es_modificacion: false,
  creado_por_id: 99,
  creado_en: '2026-10-09T10:00:00-03:00',
  enviado_en: '2026-10-09T12:00:00-03:00',
  bloqueada_en: '2026-10-09T12:00:00-03:00',
  total: '125000.00',
  items: [ITEM_PART, ITEM_LABOR],
  decision: DECISION,
};

const VERSION_2: BudgetVersionResponseDto = {
  numero: 2,
  estado: 'enviada',
  es_modificacion: true,
  creado_por_id: 99,
  creado_en: '2026-10-11T10:00:00-03:00',
  enviado_en: '2026-10-11T11:00:00-03:00',
  bloqueada_en: '2026-10-11T11:00:00-03:00',
  total: '150000.00',
  items: [
    { ...ITEM_PART, repuesto_nombre: 'Pastillas de freno', proveedor_nombre: 'Frenos Chile' },
    ITEM_LABOR,
  ],
  decision: null,
};

const SUMMARY = {
  presupuesto_id: 5,
  orden_id: 31,
  creado_en: '2026-10-09T10:00:00-03:00',
  cantidad_versiones: 2,
  ultima_version: 2,
  estado_ultima_version: 'enviada' as const,
  total_ultima_version: '150000.00',
  version_vigente: 1,
};

const DETAIL: BudgetDetailResponseDto = {
  ...SUMMARY,
  // Orden inverso a propósito: la app no debe depender del orden recibido.
  versiones: [VERSION_2, VERSION_1],
};

const PAGE: BudgetsPageDto = {
  total: 1,
  desde: 0,
  limite: 50,
  presupuestos: [SUMMARY],
};

function httpError(status: number, data: Record<string, unknown> = {}) {
  return {
    isAxiosError: true,
    message: `Request failed with status code ${status}`,
    response: { status, data },
  };
}

const PENDING_BODY = {
  detail: 'Decisión registrada; aplicación pendiente en MS2',
  decision_id: 77,
  orden_id: 31,
  decision_registrada: true,
  aplicacion_confirmada: false,
  reintento: '/presupuestos/decisiones/77/aplicacion',
  estado_ms2: null,
  detalle_ms2: null,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Fixtures alineados con el contrato del MS3', () => {
  it.each([
    ['PresupuestoResumen', SUMMARY],
    ['PresupuestoDetalle', DETAIL],
    ['PaginaPresupuestos', PAGE],
    ['VersionDetalle', VERSION_1],
    ['ItemSalida', ITEM_PART],
    ['DecisionSalida', DECISION],
  ] as const)('%s contiene exactamente los campos obligatorios', (name, dto) => {
    expect(Object.keys(dto).sort()).toEqual(
      [...CONTRACT_REQUIRED[name]].sort(),
    );
  });
});

describe('budget.mapper', () => {
  it('convierte un PresupuestoDetalle ordenando las versiones', () => {
    const budget = mapBudgetDetailResponse(DETAIL);

    expect(budget).toMatchObject({
      id: '5',
      orderId: '31',
      latestVersion: 2,
      latestStatus: 'enviada',
      latestTotal: '150000.00',
      currentVersion: 1,
    });
    expect(budget.versions.map((version) => version.number)).toEqual([1, 2]);
  });

  it('conserva importes, ítems, repuesto/proveedor y la decisión', () => {
    const [v1, v2] = mapBudgetDetailResponse(DETAIL).versions;

    expect(v1.decision).toEqual({
      id: '77',
      decision: 'aprobado',
      clientUserId: '4',
      decidedAt: '2026-10-10T15:00:00-03:00',
      reason: null,
    });
    expect(v2.isModification).toBe(true);
    expect(v2.items[0]).toEqual({
      id: '11',
      type: 'repuesto',
      description: 'Pastillas de freno delanteras',
      quantity: '2',
      unitPrice: '32500.00',
      subtotal: '65000.00',
      partId: '8',
      partName: 'Pastillas de freno',
      supplierName: 'Frenos Chile',
    });
    expect(v2.items[1]).toMatchObject({ type: 'mano_de_obra', partId: null });
  });

  it('acepta un presupuesto sin versión vigente (nunca aprobado)', () => {
    expect(
      mapBudgetDetailResponse({ ...DETAIL, version_vigente: null }).currentVersion,
    ).toBeNull();
  });

  it.each([
    ['cuerpo null', null],
    ['objeto vacío', {}],
    ['estado de versión desconocido', { ...DETAIL, versiones: [{ ...VERSION_1, estado: 'pausada' }] }],
    ['estado del resumen desconocido', { ...DETAIL, estado_ultima_version: 'otro' }],
    ['versión sin ítems', { ...DETAIL, versiones: [{ ...VERSION_1, items: null }] }],
    ['decisión desconocida', { ...DETAIL, versiones: [{ ...VERSION_1, decision: { ...DECISION, decision: 'quizás' } }] }],
  ])('rechaza un PresupuestoDetalle inválido: %s', (_, body) => {
    expect(() =>
      mapBudgetDetailResponse(body as unknown as BudgetDetailResponseDto),
    ).toThrow(INVALID_BUDGET_RESPONSE);
  });

  it('convierte un ResultadoOperacion con repuestos faltantes', () => {
    const result: BudgetOperationResultDto = {
      presupuesto: DETAIL,
      efecto_en_orden: 'esperando_repuestos',
      repuestos_faltantes: [
        { repuesto_id: 8, nombre: 'Pastillas de freno', requerido: '2', disponible: 0 },
      ],
      decision_id: 78,
      aplicacion_en_orden: { decision_id: 78, orden_id: 31, estado_aplicado: 4, historial_id: 300 },
    };

    expect(mapBudgetOperationResult(result)).toMatchObject({
      orderEffect: 'esperando_repuestos',
      decisionId: '78',
      missingParts: [
        { partId: '8', name: 'Pastillas de freno', required: '2', available: 0 },
      ],
    });
  });

  it('interpreta efecto_en_orden null como "sin cambio en la orden"', () => {
    expect(
      mapBudgetOperationResult({ presupuesto: DETAIL, efecto_en_orden: null }),
    ).toMatchObject({ orderEffect: null, missingParts: [], decisionId: null });
  });
});

describe('BudgetsService.getBudgetForOrder', () => {
  it('busca el presupuesto de la orden y consulta su detalle', async () => {
    mockedApiClient.get
      .mockResolvedValueOnce({ data: PAGE })
      .mockResolvedValueOnce({ data: DETAIL });

    const budget = await budgetsService.getBudgetForOrder('31');

    expect(mockedApiClient.get).toHaveBeenNthCalledWith(1, '/presupuestos', {
      params: { orden_id: 31 },
    });
    expect(mockedApiClient.get).toHaveBeenNthCalledWith(2, '/presupuestos/5');
    expect(budget?.id).toBe('5');
  });

  it('devuelve null si la orden no tiene presupuesto, sin pedir detalle', async () => {
    mockedApiClient.get.mockResolvedValueOnce({
      data: { ...PAGE, total: 0, presupuestos: [] },
    });

    await expect(budgetsService.getBudgetForOrder('31')).resolves.toBeNull();
    expect(mockedApiClient.get).toHaveBeenCalledTimes(1);
  });

  it('ignora presupuestos de otra orden en la página recibida', async () => {
    mockedApiClient.get.mockResolvedValueOnce({
      data: { ...PAGE, presupuestos: [{ ...SUMMARY, orden_id: 99 }] },
    });

    await expect(budgetsService.getBudgetForOrder('31')).resolves.toBeNull();
  });

  it.each(['', 'abc', '0', '-1', '3.5', '31/../1'])(
    'rechaza el identificador de orden %p sin consultar al MS3',
    async (orderId) => {
      await expect(budgetsService.getBudgetForOrder(orderId)).rejects.toThrow(
        'El identificador de la orden no es válido.',
      );
      expect(mockedApiClient.get).not.toHaveBeenCalled();
    },
  );

  it('rechaza una página que no cumple el contrato', async () => {
    mockedApiClient.get.mockResolvedValueOnce({ data: {} });

    await expect(budgetsService.getBudgetForOrder('31')).rejects.toThrow(
      INVALID_BUDGET_RESPONSE,
    );
  });

  it.each([
    ['403 rol no permitido', httpError(403, { detail: 'Rol no permitido' }), 'Rol no permitido'],
    ['404 presupuesto ajeno', httpError(404, { detail: 'Presupuesto o versión inexistente (o ajeno)' }), 'Presupuesto o versión inexistente (o ajeno)'],
    ['503 MS2 no disponible', httpError(503), 'Error interno en el servidor. Intenta nuevamente más tarde.'],
    ['sin conexión', { isAxiosError: true, message: 'Network Error' }, 'Backend no disponible o sin conexión a internet. Revisa tu conexión.'],
  ])('propaga el error normalizado: %s', async (_, error, message) => {
    mockedApiClient.get.mockRejectedValueOnce(error);

    await expect(budgetsService.getBudgetForOrder('31')).rejects.toThrow(message);
  });
});

describe('BudgetsService.decideBudgetVersion', () => {
  const RESULT: BudgetOperationResultDto = {
    presupuesto: DETAIL,
    efecto_en_orden: 'en_reparacion',
    repuestos_faltantes: [],
    decision_id: 78,
    aplicacion_en_orden: null,
  };

  it('envía la aprobación a la versión indicada', async () => {
    mockedApiClient.post.mockResolvedValueOnce({ data: RESULT });

    const result = await budgetsService.decideBudgetVersion('5', 2, {
      decision: 'aprobado',
    });

    expect(mockedApiClient.post).toHaveBeenCalledWith(
      '/presupuestos/5/versiones/2/decision',
      { decision: 'aprobado', motivo: null, confirmar_cancelacion: false },
    );
    expect(result.orderEffect).toBe('en_reparacion');
  });

  it('envía el rechazo con motivo y la confirmación de cancelación', async () => {
    mockedApiClient.post.mockResolvedValueOnce({
      data: { ...RESULT, efecto_en_orden: 'cancelado' },
    });

    await budgetsService.decideBudgetVersion('5', 1, {
      decision: 'rechazado',
      reason: '  Muy caro  ',
      confirmCancellation: true,
    });

    expect(mockedApiClient.post).toHaveBeenCalledWith(
      '/presupuestos/5/versiones/1/decision',
      { decision: 'rechazado', motivo: 'Muy caro', confirmar_cancelacion: true },
    );
  });

  it('envía exactamente las propiedades de DecisionEntrada (additionalProperties: false)', async () => {
    mockedApiClient.post.mockResolvedValueOnce({ data: RESULT });

    await budgetsService.decideBudgetVersion('5', 2, {
      decision: 'aprobado',
      reason: ' Conforme ',
      confirmCancellation: false,
    });

    const [, body] = mockedApiClient.post.mock.calls[0];
    expect(body).toStrictEqual({
      decision: 'aprobado',
      motivo: 'Conforme',
      confirmar_cancelacion: false,
    });
  });

  it('acepta un motivo de 1000 caracteres y rechaza uno más largo sin enviarlo', async () => {
    mockedApiClient.post.mockResolvedValueOnce({ data: RESULT });

    await budgetsService.decideBudgetVersion('5', 2, {
      decision: 'rechazado',
      reason: 'a'.repeat(1000),
    });
    expect(mockedApiClient.post).toHaveBeenCalledTimes(1);

    await expect(
      budgetsService.decideBudgetVersion('5', 2, {
        decision: 'rechazado',
        reason: 'a'.repeat(1001),
      }),
    ).rejects.toThrow('El motivo admite como máximo 1000 caracteres.');
    expect(mockedApiClient.post).toHaveBeenCalledTimes(1);
  });

  it('no envía un rechazo sin motivo', async () => {
    await expect(
      budgetsService.decideBudgetVersion('5', 1, { decision: 'rechazado', reason: '  ' }),
    ).rejects.toThrow('Indica el motivo del rechazo.');
    expect(mockedApiClient.post).not.toHaveBeenCalled();
  });

  it.each([
    ['presupuesto inválido', 'x', 1, 'El identificador del presupuesto no es válido.'],
    ['versión inválida', '5', 0, 'La versión del presupuesto no es válida.'],
  ])('valida los identificadores: %s', async (_, budgetId, version, message) => {
    await expect(
      budgetsService.decideBudgetVersion(budgetId, version, { decision: 'aprobado' }),
    ).rejects.toThrow(message);
    expect(mockedApiClient.post).not.toHaveBeenCalled();
  });

  it.each([
    [404, 'Presupuesto o versión inexistente (o ajeno)'],
    [422, 'Rechazo sin motivo o sin confirmar la cancelación'],
  ])('propaga el %i del MS3 al decidir sin reintentar', async (status, detail) => {
    mockedApiClient.post.mockRejectedValueOnce(httpError(status, { detail }));

    await expect(
      budgetsService.decideBudgetVersion('5', 1, { decision: 'rechazado', reason: 'Caro' }),
    ).rejects.toThrow(detail);
    expect(mockedApiClient.post).toHaveBeenCalledTimes(1);
  });

  it('distingue la decisión registrada con aplicación pendiente (503)', async () => {
    mockedApiClient.post.mockRejectedValueOnce(httpError(503, PENDING_BODY));

    const error = await budgetsService
      .decideBudgetVersion('5', 2, { decision: 'aprobado' })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(DecisionApplicationPendingError);
    expect((error as DecisionApplicationPendingError).decisionId).toBe('77');
  });

  it('trata un 503 sin decision_id como error común (decisión no registrada)', async () => {
    mockedApiClient.post.mockRejectedValueOnce(
      httpError(503, { detail: 'MS2 no disponible' }),
    );

    const error = await budgetsService
      .decideBudgetVersion('5', 2, { decision: 'aprobado' })
      .catch((caught: unknown) => caught);

    expect(error).not.toBeInstanceOf(DecisionApplicationPendingError);
    expect((error as Error).message).toBe('MS2 no disponible');
  });

  it('propaga el 409 de una versión ya decidida o reemplazada', async () => {
    mockedApiClient.post.mockRejectedValueOnce(
      httpError(409, { detail: 'No enviada, ya decidida o reemplazada' }),
    );

    await expect(
      budgetsService.decideBudgetVersion('5', 2, { decision: 'aprobado' }),
    ).rejects.toThrow('No enviada, ya decidida o reemplazada');
  });
});

describe('BudgetsService.retryDecisionApplication', () => {
  it('reintenta la aplicación de la decisión sin crear otra', async () => {
    mockedApiClient.post.mockResolvedValueOnce({
      data: { decision_id: 77, orden_id: 31, estado_aplicado: 5, historial_id: 301 },
    });

    await budgetsService.retryDecisionApplication('77');

    expect(mockedApiClient.post).toHaveBeenCalledWith(
      '/presupuestos/decisiones/77/aplicacion',
    );
  });

  it('informa si la aplicación sigue pendiente', async () => {
    mockedApiClient.post.mockRejectedValueOnce(httpError(503, PENDING_BODY));

    await expect(budgetsService.retryDecisionApplication('77')).rejects.toBeInstanceOf(
      DecisionApplicationPendingError,
    );
  });

  it('rechaza un identificador de decisión inválido sin consultar', async () => {
    await expect(budgetsService.retryDecisionApplication('abc')).rejects.toThrow(
      'El identificador de la decisión no es válido.',
    );
    expect(mockedApiClient.post).not.toHaveBeenCalled();
  });
});
