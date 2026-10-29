import { apiClient } from '@/services/api/client';
import { HTTP_STATUS } from '@/services/api/types';
import {
  ServiceError,
  normalizeBudgetServiceError,
} from '@/services/service-error';
import type {
  Budget,
  BudgetItem,
  BudgetSummary,
  BudgetVersion,
} from '@/models/budget.model';
import type { PaginatedList } from '@/models/pagination.model';
import type {
  BudgetDecisionRequestDto,
  BudgetDetailResponseDto,
  BudgetItemInputDto,
  BudgetOperationResultDto,
  BudgetPageResponseDto,
  BudgetQueryParamsDto,
  BudgetVersionResponseDto,
  CreateBudgetRequestDto,
  CreateBudgetVersionRequestDto,
  UpdateBudgetVersionItemsRequestDto,
} from '@/dto/budget.dto';
import {
  mapBudgetDetailResponse,
  mapBudgetPageResponse,
  mapBudgetVersionResponse,
} from '@/mappers/budget.mapper';
import { mockBudgets } from '@/mocks/budgets.mock';
import { mockParts } from '@/mocks/parts.mock';

export { ServiceError, normalizeBudgetServiceError };

const USE_MOCKS = process.env.EXPO_PUBLIC_USE_MOCK_AUTH === 'true';

/**
 * Construye el objeto de query params oficiales de MS3 para `GET /presupuestos`.
 */
export function buildBudgetQueryParams(
  params?: BudgetQueryParamsDto
): Record<string, number> | undefined {
  if (!params) return undefined;

  const query: Record<string, number> = {};
  const rawOrderId = params.orden_id ?? params.orderId;
  if (rawOrderId !== undefined && rawOrderId !== null && String(rawOrderId).trim() !== '') {
    const parsedOrder = Number(String(rawOrderId).replace(/\D/g, '') || rawOrderId);
    if (Number.isFinite(parsedOrder) && parsedOrder > 0) {
      query.orden_id = parsedOrder;
    }
  }

  const offset = params.desde ?? params.skip;
  if (offset !== undefined && offset >= 0) {
    query.desde = offset;
  }

  const limit = params.limite ?? params.limit;
  if (limit !== undefined && limit > 0) {
    query.limite = limit;
  }

  return Object.keys(query).length > 0 ? query : undefined;
}

/**
 * Convierte un presupuesto detallado en su resumen (`BudgetSummary`).
 */
function toBudgetSummary(budget: Budget): BudgetSummary {
  return {
    id: budget.id,
    orderId: budget.orderId,
    createdAt: budget.createdAt,
    versionCount: budget.versionCount,
    latestVersion: budget.latestVersion,
    latestVersionStatus: budget.latestVersionStatus,
    latestVersionTotal: budget.latestVersionTotal,
    currentVersion: budget.currentVersion,
  };
}

/**
 * Clona profundamente un presupuesto para evitar mutaciones externas sobre el estado en memoria.
 */
function cloneBudget(budget: Budget): Budget {
  return {
    ...budget,
    versions: budget.versions.map((v) => ({
      ...v,
      items: v.items.map((item) => ({ ...item })),
      decision: v.decision ? { ...v.decision } : null,
    })),
  };
}

/**
 * Filtra y pagina localmente una lista de resúmenes de presupuestos según `BudgetQueryParamsDto`.
 */
export function filterBudgetsByParams(
  budgets: BudgetSummary[],
  params?: BudgetQueryParamsDto
): PaginatedList<BudgetSummary> {
  let filtered = [...budgets];

  if (params) {
    const orderFilter =
      params.orden_id != null
        ? String(params.orden_id)
        : params.orderId
        ? String(params.orderId)
        : undefined;

    if (orderFilter) {
      filtered = filtered.filter((b) => b.orderId === orderFilter);
    }

    const statusFilter = params.estado ?? params.status;
    if (statusFilter) {
      filtered = filtered.filter((b) => b.latestVersionStatus === statusFilter);
    }
  }

  const total = filtered.length;
  const offset =
    params?.desde !== undefined && params.desde >= 0
      ? params.desde
      : params?.skip !== undefined && params.skip >= 0
      ? params.skip
      : 0;
  const limit =
    params?.limite !== undefined && params.limite > 0
      ? params.limite
      : params?.limit !== undefined && params.limit > 0
      ? params.limit
      : 50;

  return {
    items: filtered.slice(offset, offset + limit),
    total,
    offset,
    limit,
  };
}

/**
 * Construye los ítems internos (`BudgetItem[]`) y valida reglas de `ItemEntrada` de MS3.
 */
function buildMockBudgetItems(
  inputs: BudgetItemInputDto[] = [],
  startingItemId = 100
): BudgetItem[] {
  return inputs.map((input, idx) => {
    const desc = (input.descripcion ?? '').trim();
    const quantity = Number(input.cantidad);
    const unitPrice =
      input.precio_unitario !== undefined ? Number(input.precio_unitario) : 0;

    if (!desc || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) {
      throw new ServiceError({
        message: 'Los ítems del presupuesto deben tener descripción válida, cantidad positiva y precio no negativo.',
        status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
        code: 'BUDGET_VALIDATION_ERROR',
        domain: 'budgets',
      });
    }

    let partId: string | null = null;
    let partName: string | null = null;
    let providerName: string | null = null;

    if (input.tipo === 'repuesto') {
      if (input.repuesto_id === undefined || input.repuesto_id === null || String(input.repuesto_id).trim() === '') {
        throw new ServiceError({
          message: 'Los ítems de tipo repuesto requieren repuesto_id.',
          status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
          code: 'BUDGET_VALIDATION_ERROR',
          domain: 'budgets',
        });
      }
      partId = String(input.repuesto_id);
      const foundPart = mockParts.find((p) => p.id === partId);
      partName = foundPart?.name ?? desc;
      providerName = foundPart?.providerName ?? null;
    }

    const subtotal = Math.round(quantity * unitPrice * 100) / 100;

    return {
      id: String(startingItemId + idx),
      type: input.tipo,
      description: desc,
      quantity,
      unitPrice,
      subtotal,
      partId,
      partName,
      providerName,
    };
  });
}

/**
 * Contrato común para los adaptadores (Mock y Real HTTP) de Presupuestos (MS3).
 */
export interface BudgetServiceAdapter {
  getBudgetsPage(params?: BudgetQueryParamsDto): Promise<PaginatedList<BudgetSummary>>;
  getBudgets(params?: BudgetQueryParamsDto): Promise<BudgetSummary[]>;
  getBudgetById(id: string | number): Promise<Budget>;
  getBudgetByOrderId(orderId: string | number): Promise<Budget | null>;
  getBudgetVersion(
    budgetId: string | number,
    versionNumber: number
  ): Promise<BudgetVersion>;
  createBudget(data: CreateBudgetRequestDto): Promise<Budget>;
  createBudgetVersion(
    budgetId: string | number,
    data?: CreateBudgetVersionRequestDto
  ): Promise<Budget>;
  updateBudgetVersionItems(
    budgetId: string | number,
    versionNumber: number,
    data: UpdateBudgetVersionItemsRequestDto
  ): Promise<BudgetVersion>;
  sendBudgetVersion(
    budgetId: string | number,
    versionNumber: number
  ): Promise<Budget>;
  submitBudgetDecision(
    budgetId: string | number,
    versionNumber: number,
    data: BudgetDecisionRequestDto
  ): Promise<Budget>;
  resetMocks?(): void;
}

/**
 * Adaptador simulado (Mock) en memoria para presupuestos y sus versiones.
 */
export class MockBudgetAdapter implements BudgetServiceAdapter {
  private budgets: Budget[];
  private nextItemId = 200;
  private nextDecisionId = 50;
  private readonly delayMs: number;

  constructor(initialBudgets: Budget[] = mockBudgets, delayMs = 0) {
    this.budgets = initialBudgets.map(cloneBudget);
    this.delayMs = delayMs;
  }

  private async simulateDelay(): Promise<void> {
    if (this.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    }
  }

  resetMocks(initialBudgets: Budget[] = mockBudgets): void {
    this.budgets = initialBudgets.map(cloneBudget);
    this.nextItemId = 200;
    this.nextDecisionId = 50;
  }

  async getBudgetsPage(
    params?: BudgetQueryParamsDto
  ): Promise<PaginatedList<BudgetSummary>> {
    await this.simulateDelay();
    const summaries = this.budgets.map(toBudgetSummary);
    return filterBudgetsByParams(summaries, params);
  }

  async getBudgets(params?: BudgetQueryParamsDto): Promise<BudgetSummary[]> {
    const page = await this.getBudgetsPage(params);
    return page.items;
  }

  async getBudgetById(id: string | number): Promise<Budget> {
    await this.simulateDelay();
    const budgetId = String(id);
    const found = this.budgets.find((b) => b.id === budgetId);
    if (!found) {
      throw new ServiceError({
        message: 'El presupuesto solicitado no existe.',
        status: HTTP_STATUS.NOT_FOUND,
        code: 'BUDGET_NOT_FOUND',
        domain: 'budgets',
      });
    }
    return cloneBudget(found);
  }

  async getBudgetByOrderId(orderId: string | number): Promise<Budget | null> {
    await this.simulateDelay();
    const targetOrderId = String(orderId);
    const found = this.budgets.find((b) => b.orderId === targetOrderId);
    return found ? cloneBudget(found) : null;
  }

  async getBudgetVersion(
    budgetId: string | number,
    versionNumber: number
  ): Promise<BudgetVersion> {
    const budget = await this.getBudgetById(budgetId);
    const version = budget.versions.find((v) => v.number === Number(versionNumber));
    if (!version) {
      throw new ServiceError({
        message: 'La versión del presupuesto solicitada no existe.',
        status: HTTP_STATUS.NOT_FOUND,
        code: 'BUDGET_NOT_FOUND',
        domain: 'budgets',
      });
    }
    return {
      ...version,
      items: version.items.map((item) => ({ ...item })),
      decision: version.decision ? { ...version.decision } : null,
    };
  }

  async createBudget(data: CreateBudgetRequestDto): Promise<Budget> {
    await this.simulateDelay();
    const orderId = String(data.orden_id ?? '').trim();
    if (!orderId || orderId === '0') {
      throw new ServiceError({
        message: 'El identificador de la orden es obligatorio para crear un presupuesto.',
        status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
        code: 'BUDGET_VALIDATION_ERROR',
        domain: 'budgets',
      });
    }

    const alreadyExists = this.budgets.some((b) => b.orderId === orderId);
    if (alreadyExists) {
      throw new ServiceError({
        message: 'La orden ya tiene un presupuesto registrado.',
        status: HTTP_STATUS.CONFLICT,
        code: 'BUDGET_CONFLICT',
        domain: 'budgets',
      });
    }

    const items = buildMockBudgetItems(data.items ?? [], this.nextItemId);
    this.nextItemId += items.length + 1;
    const total = items.reduce((acc, item) => acc + item.subtotal, 0);
    const now = new Date().toISOString();

    const newBudget: Budget = {
      id: String(this.budgets.length + 1),
      orderId,
      createdAt: now,
      versionCount: 1,
      latestVersion: 1,
      latestVersionStatus: 'borrador',
      latestVersionTotal: total,
      currentVersion: null,
      versions: [
        {
          number: 1,
          status: 'borrador',
          isModification: false,
          createdById: '2',
          createdAt: now,
          sentAt: null,
          lockedAt: null,
          total,
          items,
          decision: null,
        },
      ],
    };

    this.budgets.unshift(newBudget);
    return cloneBudget(newBudget);
  }

  async createBudgetVersion(
    budgetId: string | number,
    data?: CreateBudgetVersionRequestDto
  ): Promise<Budget> {
    await this.simulateDelay();
    const idStr = String(budgetId);
    const index = this.budgets.findIndex((b) => b.id === idStr);
    if (index === -1) {
      throw new ServiceError({
        message: 'El presupuesto solicitado no existe.',
        status: HTTP_STATUS.NOT_FOUND,
        code: 'BUDGET_NOT_FOUND',
        domain: 'budgets',
      });
    }

    const current = this.budgets[index];
    const hasOpenDraft = current.versions.some((v) => v.status === 'borrador');
    if (hasOpenDraft) {
      throw new ServiceError({
        message: 'Ya existe una versión en borrador abierta para este presupuesto.',
        status: HTTP_STATUS.CONFLICT,
        code: 'BUDGET_CONFLICT',
        domain: 'budgets',
      });
    }

    let items: BudgetItem[];
    if (data?.items && data.items.length > 0) {
      items = buildMockBudgetItems(data.items, this.nextItemId);
      this.nextItemId += items.length + 1;
    } else {
      const sourceVersionNumber = data?.copiar_de ?? current.latestVersion;
      const sourceVersion = current.versions.find(
        (v) => v.number === sourceVersionNumber
      );
      if (!sourceVersion) {
        throw new ServiceError({
          message: 'La versión base a copiar no existe.',
          status: HTTP_STATUS.NOT_FOUND,
          code: 'BUDGET_NOT_FOUND',
          domain: 'budgets',
        });
      }
      items = sourceVersion.items.map((item, idx) => ({
        ...item,
        id: String(this.nextItemId + idx),
      }));
      this.nextItemId += items.length + 1;
    }

    const nextNumber = current.latestVersion + 1;
    const total = items.reduce((acc, item) => acc + item.subtotal, 0);
    const now = new Date().toISOString();
    const isModification = current.currentVersion !== null;

    const newVersion: BudgetVersion = {
      number: nextNumber,
      status: 'borrador',
      isModification,
      createdById: '2',
      createdAt: now,
      sentAt: null,
      lockedAt: null,
      total,
      items,
      decision: null,
    };

    const updated: Budget = {
      ...current,
      versionCount: current.versionCount + 1,
      latestVersion: nextNumber,
      latestVersionStatus: 'borrador',
      latestVersionTotal: total,
      versions: [...current.versions, newVersion],
    };

    this.budgets[index] = updated;
    return cloneBudget(updated);
  }

  async updateBudgetVersionItems(
    budgetId: string | number,
    versionNumber: number,
    data: UpdateBudgetVersionItemsRequestDto
  ): Promise<BudgetVersion> {
    await this.simulateDelay();
    const idStr = String(budgetId);
    const budgetIndex = this.budgets.findIndex((b) => b.id === idStr);
    if (budgetIndex === -1) {
      throw new ServiceError({
        message: 'El presupuesto solicitado no existe.',
        status: HTTP_STATUS.NOT_FOUND,
        code: 'BUDGET_NOT_FOUND',
        domain: 'budgets',
      });
    }

    const budget = this.budgets[budgetIndex];
    const versionIndex = budget.versions.findIndex(
      (v) => v.number === Number(versionNumber)
    );
    if (versionIndex === -1) {
      throw new ServiceError({
        message: 'La versión del presupuesto solicitada no existe.',
        status: HTTP_STATUS.NOT_FOUND,
        code: 'BUDGET_NOT_FOUND',
        domain: 'budgets',
      });
    }

    const currentVersion = budget.versions[versionIndex];
    if (currentVersion.status !== 'borrador') {
      throw new ServiceError({
        message: 'La versión ya fue enviada y se encuentra congelada.',
        status: HTTP_STATUS.CONFLICT,
        code: 'BUDGET_CONFLICT',
        domain: 'budgets',
      });
    }

    const items = buildMockBudgetItems(data.items ?? [], this.nextItemId);
    this.nextItemId += items.length + 1;
    const total = items.reduce((acc, item) => acc + item.subtotal, 0);

    const updatedVersion: BudgetVersion = {
      ...currentVersion,
      items,
      total,
    };

    const updatedVersions = [...budget.versions];
    updatedVersions[versionIndex] = updatedVersion;

    this.budgets[budgetIndex] = {
      ...budget,
      latestVersionTotal:
        updatedVersion.number === budget.latestVersion
          ? total
          : budget.latestVersionTotal,
      versions: updatedVersions,
    };

    return {
      ...updatedVersion,
      items: updatedVersion.items.map((item) => ({ ...item })),
    };
  }

  async sendBudgetVersion(
    budgetId: string | number,
    versionNumber: number
  ): Promise<Budget> {
    await this.simulateDelay();
    const idStr = String(budgetId);
    const budgetIndex = this.budgets.findIndex((b) => b.id === idStr);
    if (budgetIndex === -1) {
      throw new ServiceError({
        message: 'El presupuesto solicitado no existe.',
        status: HTTP_STATUS.NOT_FOUND,
        code: 'BUDGET_NOT_FOUND',
        domain: 'budgets',
      });
    }

    const budget = this.budgets[budgetIndex];
    const versionIndex = budget.versions.findIndex(
      (v) => v.number === Number(versionNumber)
    );
    if (versionIndex === -1) {
      throw new ServiceError({
        message: 'La versión del presupuesto solicitada no existe.',
        status: HTTP_STATUS.NOT_FOUND,
        code: 'BUDGET_NOT_FOUND',
        domain: 'budgets',
      });
    }

    const version = budget.versions[versionIndex];
    if (version.status !== 'borrador' || version.number !== budget.latestVersion) {
      throw new ServiceError({
        message: 'La versión ya fue enviada o no corresponde a la última versión.',
        status: HTTP_STATUS.CONFLICT,
        code: 'BUDGET_CONFLICT',
        domain: 'budgets',
      });
    }

    if (version.items.length === 0 || version.items.some((i) => i.unitPrice <= 0)) {
      throw new ServiceError({
        message: 'No se puede enviar una versión sin ítems o con ítems sin precio.',
        status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
        code: 'BUDGET_VALIDATION_ERROR',
        domain: 'budgets',
      });
    }

    const now = new Date().toISOString();
    const updatedVersion: BudgetVersion = {
      ...version,
      status: 'enviada',
      sentAt: now,
      lockedAt: now,
    };

    const updatedVersions = [...budget.versions];
    updatedVersions[versionIndex] = updatedVersion;

    const updatedBudget: Budget = {
      ...budget,
      latestVersionStatus: 'enviada',
      versions: updatedVersions,
    };

    this.budgets[budgetIndex] = updatedBudget;
    return cloneBudget(updatedBudget);
  }

  async submitBudgetDecision(
    budgetId: string | number,
    versionNumber: number,
    data: BudgetDecisionRequestDto
  ): Promise<Budget> {
    await this.simulateDelay();
    const idStr = String(budgetId);
    const budgetIndex = this.budgets.findIndex((b) => b.id === idStr);
    if (budgetIndex === -1) {
      throw new ServiceError({
        message: 'El presupuesto solicitado no existe.',
        status: HTTP_STATUS.NOT_FOUND,
        code: 'BUDGET_NOT_FOUND',
        domain: 'budgets',
      });
    }

    const budget = this.budgets[budgetIndex];
    const versionIndex = budget.versions.findIndex(
      (v) => v.number === Number(versionNumber)
    );
    if (versionIndex === -1) {
      throw new ServiceError({
        message: 'La versión del presupuesto solicitada no existe.',
        status: HTTP_STATUS.NOT_FOUND,
        code: 'BUDGET_NOT_FOUND',
        domain: 'budgets',
      });
    }

    const version = budget.versions[versionIndex];
    if (version.status !== 'enviada' || version.decision !== null) {
      throw new ServiceError({
        message: 'La versión no está enviada o ya cuenta con una decisión.',
        status: HTTP_STATUS.CONFLICT,
        code: 'BUDGET_CONFLICT',
        domain: 'budgets',
      });
    }

    if (data.decision === 'rechazado') {
      const reason = (data.motivo ?? '').trim();
      if (!reason) {
        throw new ServiceError({
          message: 'Todo rechazo de presupuesto exige indicar el motivo.',
          status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
          code: 'BUDGET_VALIDATION_ERROR',
          domain: 'budgets',
        });
      }
      if (budget.currentVersion === null && !data.confirmar_cancelacion) {
        throw new ServiceError({
          message: 'Rechazar antes de la primera aprobación exige confirmar la cancelación del servicio.',
          status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
          code: 'BUDGET_VALIDATION_ERROR',
          domain: 'budgets',
        });
      }
    }

    const now = new Date().toISOString();
    const nextStatus = data.decision === 'aprobado' ? 'aprobada' : 'rechazada';
    const updatedVersion: BudgetVersion = {
      ...version,
      status: nextStatus,
      decision: {
        id: String(this.nextDecisionId++),
        decision: data.decision,
        clientUserId: '1',
        decidedAt: now,
        reason: data.motivo ?? null,
      },
    };

    const updatedVersions = [...budget.versions];
    updatedVersions[versionIndex] = updatedVersion;

    const updatedBudget: Budget = {
      ...budget,
      latestVersionStatus:
        version.number === budget.latestVersion
          ? nextStatus
          : budget.latestVersionStatus,
      currentVersion:
        data.decision === 'aprobado' ? version.number : budget.currentVersion,
      versions: updatedVersions,
    };

    this.budgets[budgetIndex] = updatedBudget;
    return cloneBudget(updatedBudget);
  }
}

/**
 * Adaptador HTTP real conectado a la API Gateway (`/presupuestos` en MS3).
 */
export class RealBudgetAdapter implements BudgetServiceAdapter {
  async getBudgetsPage(
    params?: BudgetQueryParamsDto
  ): Promise<PaginatedList<BudgetSummary>> {
    const queryParams = buildBudgetQueryParams(params);
    const response = queryParams
      ? await apiClient.get<BudgetPageResponseDto>('/presupuestos', {
          params: queryParams,
        })
      : await apiClient.get<BudgetPageResponseDto>('/presupuestos');

    const page = mapBudgetPageResponse(response.data);
    const statusFilter = params?.estado ?? params?.status;
    if (statusFilter) {
      const filteredItems = page.items.filter(
        (item) => item.latestVersionStatus === statusFilter
      );
      return {
        ...page,
        items: filteredItems,
        total: filteredItems.length,
      };
    }
    return page;
  }

  async getBudgets(params?: BudgetQueryParamsDto): Promise<BudgetSummary[]> {
    const page = await this.getBudgetsPage(params);
    return page.items;
  }

  async getBudgetById(id: string | number): Promise<Budget> {
    const budgetId = String(id);
    const response = await apiClient.get<BudgetDetailResponseDto>(
      `/presupuestos/${budgetId}`
    );
    return mapBudgetDetailResponse(response.data);
  }

  async getBudgetByOrderId(orderId: string | number): Promise<Budget | null> {
    const page = await this.getBudgetsPage({ orden_id: orderId });
    const match = page.items.find(
      (b) => b.orderId === String(orderId) || page.items.length === 1
    );
    if (!match) {
      return null;
    }
    return this.getBudgetById(match.id);
  }

  async getBudgetVersion(
    budgetId: string | number,
    versionNumber: number
  ): Promise<BudgetVersion> {
    const response = await apiClient.get<BudgetVersionResponseDto>(
      `/presupuestos/${String(budgetId)}/versiones/${Number(versionNumber)}`
    );
    return mapBudgetVersionResponse(response.data);
  }

  async createBudget(data: CreateBudgetRequestDto): Promise<Budget> {
    const numericOrderId = Number(data.orden_id);
    const payload = {
      orden_id: Number.isNaN(numericOrderId) ? data.orden_id : numericOrderId,
      ...(data.items !== undefined ? { items: data.items } : {}),
    };
    const response = await apiClient.post<BudgetDetailResponseDto>(
      '/presupuestos',
      payload
    );
    return mapBudgetDetailResponse(response.data);
  }

  async createBudgetVersion(
    budgetId: string | number,
    data?: CreateBudgetVersionRequestDto
  ): Promise<Budget> {
    const response = await apiClient.post<BudgetDetailResponseDto>(
      `/presupuestos/${String(budgetId)}/versiones`,
      data ?? {}
    );
    return mapBudgetDetailResponse(response.data);
  }

  async updateBudgetVersionItems(
    budgetId: string | number,
    versionNumber: number,
    data: UpdateBudgetVersionItemsRequestDto
  ): Promise<BudgetVersion> {
    const response = await apiClient.put<BudgetVersionResponseDto>(
      `/presupuestos/${String(budgetId)}/versiones/${Number(versionNumber)}/items`,
      { items: data.items }
    );
    return mapBudgetVersionResponse(response.data);
  }

  async sendBudgetVersion(
    budgetId: string | number,
    versionNumber: number
  ): Promise<Budget> {
    const response = await apiClient.post<BudgetOperationResultDto>(
      `/presupuestos/${String(budgetId)}/versiones/${Number(versionNumber)}/envio`
    );
    return mapBudgetDetailResponse(response.data.presupuesto);
  }

  async submitBudgetDecision(
    budgetId: string | number,
    versionNumber: number,
    data: BudgetDecisionRequestDto
  ): Promise<Budget> {
    const payload: BudgetDecisionRequestDto = {
      decision: data.decision,
      ...(data.motivo !== undefined ? { motivo: data.motivo } : {}),
      ...(data.confirmar_cancelacion !== undefined
        ? { confirmar_cancelacion: data.confirmar_cancelacion }
        : {}),
    };
    const response = await apiClient.post<BudgetOperationResultDto>(
      `/presupuestos/${String(budgetId)}/versiones/${Number(versionNumber)}/decision`,
      payload
    );
    return mapBudgetDetailResponse(response.data.presupuesto);
  }
}

/**
 * Servicio de Presupuestos con soporte intercambiable para adaptador Mock y Real HTTP.
 */
export class BudgetsService {
  private adapter: BudgetServiceAdapter;
  private readonly mockAdapter: MockBudgetAdapter;
  private readonly realAdapter: RealBudgetAdapter;

  constructor(customAdapter?: BudgetServiceAdapter) {
    this.mockAdapter = new MockBudgetAdapter(mockBudgets, 0);
    this.realAdapter = new RealBudgetAdapter();
    this.adapter =
      customAdapter ?? (USE_MOCKS ? this.mockAdapter : this.realAdapter);
  }

  setAdapter(adapter: BudgetServiceAdapter): void {
    this.adapter = adapter;
  }

  useMockAdapter(): MockBudgetAdapter {
    this.adapter = this.mockAdapter;
    return this.mockAdapter;
  }

  useRealAdapter(): RealBudgetAdapter {
    this.adapter = this.realAdapter;
    return this.realAdapter;
  }

  resetMocks(): void {
    this.mockAdapter.resetMocks(mockBudgets);
  }

  async getBudgetsPage(
    params?: BudgetQueryParamsDto
  ): Promise<PaginatedList<BudgetSummary>> {
    try {
      return await this.adapter.getBudgetsPage(params);
    } catch (error: unknown) {
      throw normalizeBudgetServiceError(
        error,
        'No fue posible cargar los presupuestos.'
      );
    }
  }

  async getBudgets(params?: BudgetQueryParamsDto): Promise<BudgetSummary[]> {
    try {
      return await this.adapter.getBudgets(params);
    } catch (error: unknown) {
      throw normalizeBudgetServiceError(
        error,
        'No fue posible cargar los presupuestos.'
      );
    }
  }

  async getBudgetById(id: string | number): Promise<Budget> {
    try {
      return await this.adapter.getBudgetById(id);
    } catch (error: unknown) {
      throw normalizeBudgetServiceError(
        error,
        'No fue posible cargar el detalle del presupuesto.'
      );
    }
  }

  async getBudgetByOrderId(orderId: string | number): Promise<Budget | null> {
    try {
      return await this.adapter.getBudgetByOrderId(orderId);
    } catch (error: unknown) {
      throw normalizeBudgetServiceError(
        error,
        'No fue posible consultar el presupuesto de la orden.'
      );
    }
  }

  async getBudgetVersion(
    budgetId: string | number,
    versionNumber: number
  ): Promise<BudgetVersion> {
    try {
      return await this.adapter.getBudgetVersion(budgetId, versionNumber);
    } catch (error: unknown) {
      throw normalizeBudgetServiceError(
        error,
        'No fue posible cargar la versión del presupuesto.'
      );
    }
  }

  async createBudget(data: CreateBudgetRequestDto): Promise<Budget> {
    try {
      return await this.adapter.createBudget(data);
    } catch (error: unknown) {
      throw normalizeBudgetServiceError(
        error,
        'No fue posible crear el presupuesto.'
      );
    }
  }

  async createBudgetVersion(
    budgetId: string | number,
    data?: CreateBudgetVersionRequestDto
  ): Promise<Budget> {
    try {
      return await this.adapter.createBudgetVersion(budgetId, data);
    } catch (error: unknown) {
      throw normalizeBudgetServiceError(
        error,
        'No fue posible crear una nueva versión del presupuesto.'
      );
    }
  }

  async updateBudgetVersionItems(
    budgetId: string | number,
    versionNumber: number,
    data: UpdateBudgetVersionItemsRequestDto
  ): Promise<BudgetVersion> {
    try {
      return await this.adapter.updateBudgetVersionItems(
        budgetId,
        versionNumber,
        data
      );
    } catch (error: unknown) {
      throw normalizeBudgetServiceError(
        error,
        'No fue posible actualizar los ítems del presupuesto.'
      );
    }
  }

  async sendBudgetVersion(
    budgetId: string | number,
    versionNumber: number
  ): Promise<Budget> {
    try {
      return await this.adapter.sendBudgetVersion(budgetId, versionNumber);
    } catch (error: unknown) {
      throw normalizeBudgetServiceError(
        error,
        'No fue posible enviar la versión del presupuesto.'
      );
    }
  }

  async submitBudgetDecision(
    budgetId: string | number,
    versionNumber: number,
    data: BudgetDecisionRequestDto
  ): Promise<Budget> {
    try {
      return await this.adapter.submitBudgetDecision(
        budgetId,
        versionNumber,
        data
      );
    } catch (error: unknown) {
      throw normalizeBudgetServiceError(
        error,
        'No fue posible registrar la decisión sobre el presupuesto.'
      );
    }
  }
}

export const budgetsService = new BudgetsService();
export const budgetService = budgetsService;
export { BudgetsService as BudgetService };

/**
 * ============================================================
 * HELPERS SÍNCRONOS DE DEMOSTRACIÓN PARA VISTAS UI (BudgetDetailScreen)
 * ============================================================
 */
export type DemoBudgetItem = {
  id: string;
  name: string;
  quantity: number;
  price: number;
};

export type DemoBudget = {
  id: string;
  orderNumber: string;
  status: string;
  date: string;
  version: number;
  vehiclePlate: string;
  items: DemoBudgetItem[];
};

const demoBudgets: DemoBudget[] = [
  {
    id: 'PRES-001',
    orderNumber: 'OT-00124',
    status: 'Aprobado',
    date: '21/10/2026',
    version: 2,
    vehiclePlate: 'AB-CD-12',
    items: [
      {
        id: '1',
        name: 'Filtro de aceite',
        quantity: 1,
        price: 15000,
      },
      {
        id: '2',
        name: 'Aceite de motor',
        quantity: 4,
        price: 8500,
      },
      {
        id: '3',
        name: 'Mantención preventiva',
        quantity: 1,
        price: 45000,
      },
    ],
  },
];

export function getBudgets(): DemoBudget[] {
  return demoBudgets.map((budget) => ({
    ...budget,
    items: budget.items.map((item) => ({ ...item })),
  }));
}

export function getBudgetById(id: string): DemoBudget | undefined {
  const budget = demoBudgets.find(
    (item) => item.id === id || item.orderNumber === id
  );

  if (!budget) {
    return undefined;
  }

  return {
    ...budget,
    items: budget.items.map((item) => ({ ...item })),
  };
}

export function calculateBudgetTotal(budget: DemoBudget): number {
  return budget.items.reduce(
    (total, item) => total + item.quantity * item.price,
    0
  );
}
