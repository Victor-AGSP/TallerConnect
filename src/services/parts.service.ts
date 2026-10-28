import { apiClient } from '@/services/api/client';
import { HTTP_STATUS } from '@/services/api/types';
import {
  ServiceError,
  normalizePartServiceError,
} from '@/services/service-error';
import type { PaginatedList } from '@/models/pagination.model';
import type { Part } from '@/models/part.model';
import type {
  CreatePartRequestDto,
  PartPageResponseDto,
  PartQueryParamsDto,
  PartResponseDto,
  UpdatePartRequestDto,
} from '@/dto/part.dto';
import { mapPartPageResponse, mapPartResponse } from '@/mappers/part.mapper';
import { mockGeneralThreshold, mockParts } from '@/mocks/parts.mock';
import { mockProviders } from '@/mocks/providers.mock';

export { ServiceError, normalizePartServiceError };
export {
  MockProviderAdapter,
  ProviderService,
  ProvidersService,
  RealProviderAdapter,
  buildProviderQueryParams,
  filterProvidersByParams,
  normalizeProviderServiceError,
  providerService,
  providersService,
  type ProviderServiceAdapter,
} from './providers.service';

const USE_MOCKS = process.env.EXPO_PUBLIC_USE_MOCK_AUTH === 'true';

/**
 * Normaliza un texto eliminando diacríticos para búsquedas insensibles a tildes y mayúsculas (`q` en MS3).
 */
function normalizeSearchText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Construye los parámetros de consulta oficiales de MS3 para `GET /repuestos`.
 */
export function buildPartQueryParams(
  params?: PartQueryParamsDto
): Record<string, string | number | boolean> | undefined {
  if (!params) return undefined;

  const query: Record<string, string | number | boolean> = {};

  const rawProviderId = params.proveedor_id ?? params.providerId;
  if (rawProviderId !== undefined && rawProviderId !== null && String(rawProviderId).trim() !== '') {
    const parsedProvider = Number(String(rawProviderId).replace(/\D/g, '') || rawProviderId);
    if (Number.isFinite(parsedProvider) && parsedProvider > 0) {
      query.proveedor_id = parsedProvider;
    }
  }

  if (params.q !== undefined && params.q !== null && params.q.trim() !== '') {
    query.q = params.q.trim();
  }

  const bajoUmbral = params.bajo_umbral ?? params.belowThreshold;
  if (bajoUmbral !== undefined) {
    query.bajo_umbral = Boolean(bajoUmbral);
  }

  const conStock = params.con_stock ?? params.inStock;
  if (conStock !== undefined && conStock !== null) {
    query.con_stock = Boolean(conStock);
  }

  if (params.ordenar) {
    query.ordenar = params.ordenar;
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
 * Filtra, ordena y pagina localmente una lista de repuestos según `PartQueryParamsDto`.
 */
export function filterPartsByParams(
  parts: Part[],
  params?: PartQueryParamsDto
): PaginatedList<Part> {
  let filtered = [...parts];

  if (params) {
    const providerFilter =
      params.proveedor_id != null
        ? String(params.proveedor_id)
        : params.providerId
        ? String(params.providerId)
        : undefined;

    if (providerFilter) {
      filtered = filtered.filter((p) => p.providerId === providerFilter);
    }

    if (params.q && params.q.trim() !== '') {
      const term = normalizeSearchText(params.q);
      filtered = filtered.filter((p) =>
        normalizeSearchText(p.name).includes(term)
      );
    }

    const belowThreshold = params.bajo_umbral ?? params.belowThreshold;
    if (belowThreshold === true) {
      filtered = filtered.filter((p) => p.belowThreshold);
    }

    const inStock = params.con_stock ?? params.inStock;
    if (inStock === true) {
      filtered = filtered.filter((p) => p.stock > 0);
    } else if (inStock === false) {
      filtered = filtered.filter((p) => p.stock === 0);
    }

    const sortOrder = params.ordenar ?? 'nombre';
    if (sortOrder === 'stock_asc') {
      filtered.sort((a, b) => a.stock - b.stock || a.name.localeCompare(b.name));
    } else if (sortOrder === 'stock_desc') {
      filtered.sort((a, b) => b.stock - a.stock || a.name.localeCompare(b.name));
    } else {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
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
 * Contrato común para los adaptadores (Mock y Real HTTP) de Repuestos (MS3).
 */
export interface PartServiceAdapter {
  getPartsPage(params?: PartQueryParamsDto): Promise<PaginatedList<Part>>;
  getParts(params?: PartQueryParamsDto): Promise<Part[]>;
  getPartById(id: string | number): Promise<Part>;
  createPart(data: CreatePartRequestDto): Promise<Part>;
  updatePart(id: string | number, data: UpdatePartRequestDto): Promise<Part>;
  deletePart(id: string | number): Promise<void>;
  resetMocks?(): void;
}

/**
 * Adaptador simulado (Mock) en memoria para repuestos del catálogo.
 */
export class MockPartAdapter implements PartServiceAdapter {
  private parts: Part[];
  private readonly delayMs: number;

  constructor(initialParts: Part[] = mockParts, delayMs = 0) {
    this.parts = initialParts.map((p) => ({ ...p }));
    this.delayMs = delayMs;
  }

  private async simulateDelay(): Promise<void> {
    if (this.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    }
  }

  resetMocks(initialParts: Part[] = mockParts): void {
    this.parts = initialParts.map((p) => ({ ...p }));
  }

  async getPartsPage(params?: PartQueryParamsDto): Promise<PaginatedList<Part>> {
    await this.simulateDelay();
    return filterPartsByParams(this.parts, params);
  }

  async getParts(params?: PartQueryParamsDto): Promise<Part[]> {
    const page = await this.getPartsPage(params);
    return page.items;
  }

  async getPartById(id: string | number): Promise<Part> {
    await this.simulateDelay();
    const partId = String(id);
    const found = this.parts.find((p) => p.id === partId);
    if (!found) {
      throw new ServiceError({
        message: 'El repuesto solicitado no existe.',
        status: HTTP_STATUS.NOT_FOUND,
        code: 'PART_NOT_FOUND',
        domain: 'parts',
      });
    }
    return { ...found };
  }

  async createPart(data: CreatePartRequestDto): Promise<Part> {
    await this.simulateDelay();
    const name = (data.nombre ?? '').trim();
    const providerId = String(data.proveedor_id ?? '').trim();
    const initialStock = data.stock_inicial !== undefined ? Number(data.stock_inicial) : 0;

    if (!name || !providerId || providerId === '0' || !Number.isFinite(initialStock) || initialStock < 0) {
      throw new ServiceError({
        message: 'Nombre, proveedor válido y stock inicial no negativo son obligatorios para registrar un repuesto.',
        status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
        code: 'PART_VALIDATION_ERROR',
        domain: 'parts',
      });
    }

    const duplicate = this.parts.some(
      (p) =>
        p.providerId === providerId &&
        p.name.toLowerCase() === name.toLowerCase()
    );
    if (duplicate) {
      throw new ServiceError({
        message: 'Ya existe un repuesto con ese nombre asociado al mismo proveedor.',
        status: HTTP_STATUS.CONFLICT,
        code: 'PART_CONFLICT',
        domain: 'parts',
      });
    }

    const customThreshold =
      data.umbral_particular !== undefined ? data.umbral_particular : null;
    const effectiveThreshold = customThreshold ?? mockGeneralThreshold;
    const belowThreshold =
      effectiveThreshold !== null ? initialStock <= effectiveThreshold : false;
    const provider = mockProviders.find((pr) => pr.id === providerId);

    const newPart: Part = {
      id: String(this.parts.length + 10),
      name,
      providerId,
      providerName: provider?.name ?? `Proveedor #${providerId}`,
      stock: initialStock,
      customThreshold,
      effectiveThreshold,
      belowThreshold,
    };

    this.parts.push(newPart);
    return { ...newPart };
  }

  async updatePart(
    id: string | number,
    data: UpdatePartRequestDto
  ): Promise<Part> {
    await this.simulateDelay();
    const partId = String(id);
    const index = this.parts.findIndex((p) => p.id === partId);
    if (index === -1) {
      throw new ServiceError({
        message: 'El repuesto solicitado no existe.',
        status: HTTP_STATUS.NOT_FOUND,
        code: 'PART_NOT_FOUND',
        domain: 'parts',
      });
    }

    const current = this.parts[index];
    const nextName =
      data.nombre !== undefined && data.nombre !== null
        ? data.nombre.trim()
        : current.name;
    const nextProviderId =
      data.proveedor_id !== undefined && data.proveedor_id !== null
        ? String(data.proveedor_id).trim()
        : current.providerId;

    if (!nextName || !nextProviderId || nextProviderId === '0') {
      throw new ServiceError({
        message: 'El nombre y el proveedor del repuesto deben ser válidos.',
        status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
        code: 'PART_VALIDATION_ERROR',
        domain: 'parts',
      });
    }

    const duplicate = this.parts.some(
      (p, idx) =>
        idx !== index &&
        p.providerId === nextProviderId &&
        p.name.toLowerCase() === nextName.toLowerCase()
    );
    if (duplicate) {
      throw new ServiceError({
        message: 'Ya existe otro repuesto con ese nombre para ese proveedor.',
        status: HTTP_STATUS.CONFLICT,
        code: 'PART_CONFLICT',
        domain: 'parts',
      });
    }

    const nextCustomThreshold =
      data.umbral_particular !== undefined
        ? data.umbral_particular
        : current.customThreshold;
    const nextEffectiveThreshold =
      nextCustomThreshold ?? mockGeneralThreshold;
    const nextBelowThreshold =
      nextEffectiveThreshold !== null
        ? current.stock <= nextEffectiveThreshold
        : false;
    const provider = mockProviders.find((pr) => pr.id === nextProviderId);

    const updated: Part = {
      ...current,
      name: nextName,
      providerId: nextProviderId,
      providerName:
        nextProviderId !== current.providerId
          ? provider?.name ?? current.providerName
          : current.providerName,
      customThreshold: nextCustomThreshold,
      effectiveThreshold: nextEffectiveThreshold,
      belowThreshold: nextBelowThreshold,
    };

    this.parts[index] = updated;
    return { ...updated };
  }

  async deletePart(id: string | number): Promise<void> {
    await this.simulateDelay();
    const partId = String(id);
    const index = this.parts.findIndex((p) => p.id === partId);
    if (index === -1) {
      throw new ServiceError({
        message: 'El repuesto solicitado no existe.',
        status: HTTP_STATUS.NOT_FOUND,
        code: 'PART_NOT_FOUND',
        domain: 'parts',
      });
    }
    this.parts.splice(index, 1);
  }
}

/**
 * Adaptador HTTP real conectado a la API Gateway (`/repuestos` en MS3).
 */
export class RealPartAdapter implements PartServiceAdapter {
  async getPartsPage(params?: PartQueryParamsDto): Promise<PaginatedList<Part>> {
    const queryParams = buildPartQueryParams(params);
    const response = queryParams
      ? await apiClient.get<PartPageResponseDto>('/repuestos', {
          params: queryParams,
        })
      : await apiClient.get<PartPageResponseDto>('/repuestos');

    return mapPartPageResponse(response.data);
  }

  async getParts(params?: PartQueryParamsDto): Promise<Part[]> {
    const page = await this.getPartsPage(params);
    return page.items;
  }

  async getPartById(id: string | number): Promise<Part> {
    const partId = String(id);
    const response = await apiClient.get<PartResponseDto>(
      `/repuestos/${partId}`
    );
    return mapPartResponse(response.data);
  }

  async createPart(data: CreatePartRequestDto): Promise<Part> {
    const numericProviderId = Number(data.proveedor_id);
    const payload: CreatePartRequestDto = {
      proveedor_id: Number.isNaN(numericProviderId)
        ? data.proveedor_id
        : numericProviderId,
      nombre: data.nombre.trim(),
      ...(data.stock_inicial !== undefined
        ? { stock_inicial: data.stock_inicial }
        : {}),
      ...(data.umbral_particular !== undefined
        ? { umbral_particular: data.umbral_particular }
        : {}),
    };
    const response = await apiClient.post<PartResponseDto>(
      '/repuestos',
      payload
    );
    return mapPartResponse(response.data);
  }

  async updatePart(
    id: string | number,
    data: UpdatePartRequestDto
  ): Promise<Part> {
    const partId = String(id);
    const numericProviderId =
      data.proveedor_id !== undefined && data.proveedor_id !== null
        ? Number(data.proveedor_id)
        : undefined;

    const payload: UpdatePartRequestDto = {
      ...(data.nombre !== undefined ? { nombre: data.nombre } : {}),
      ...(data.proveedor_id !== undefined
        ? {
            proveedor_id:
              numericProviderId !== undefined && !Number.isNaN(numericProviderId)
                ? numericProviderId
                : data.proveedor_id,
          }
        : {}),
      ...(data.umbral_particular !== undefined
        ? { umbral_particular: data.umbral_particular }
        : {}),
      ...(data.observacion !== undefined
        ? { observacion: data.observacion }
        : {}),
    };

    const response = await apiClient.patch<PartResponseDto>(
      `/repuestos/${partId}`,
      payload
    );
    return mapPartResponse(response.data);
  }

  async deletePart(id: string | number): Promise<void> {
    const partId = String(id);
    await apiClient.delete(`/repuestos/${partId}`);
  }
}

/**
 * Servicio de Repuestos con soporte intercambiable para adaptador Mock y Real HTTP.
 */
export class PartsService {
  private adapter: PartServiceAdapter;
  private readonly mockAdapter: MockPartAdapter;
  private readonly realAdapter: RealPartAdapter;

  constructor(customAdapter?: PartServiceAdapter) {
    this.mockAdapter = new MockPartAdapter(mockParts, 0);
    this.realAdapter = new RealPartAdapter();
    this.adapter =
      customAdapter ?? (USE_MOCKS ? this.mockAdapter : this.realAdapter);
  }

  /**
   * Permite inyectar un adaptador personalizado.
   */
  setAdapter(adapter: PartServiceAdapter): void {
    this.adapter = adapter;
  }

  /**
   * Activa el adaptador simulado en memoria.
   */
  useMockAdapter(): MockPartAdapter {
    this.adapter = this.mockAdapter;
    return this.mockAdapter;
  }

  /**
   * Activa el adaptador HTTP real conectado a `apiClient`.
   */
  useRealAdapter(): RealPartAdapter {
    this.adapter = this.realAdapter;
    return this.realAdapter;
  }

  /**
   * Restaura el estado inicial de los repuestos simulados.
   */
  resetMocks(): void {
    this.mockAdapter.resetMocks(mockParts);
  }

  /**
   * Obtiene una página de repuestos (`PaginaRepuestos` en MS3).
   * Ruta Gateway: GET /api/repuestos
   */
  async getPartsPage(params?: PartQueryParamsDto): Promise<PaginatedList<Part>> {
    try {
      return await this.adapter.getPartsPage(params);
    } catch (error: unknown) {
      throw normalizePartServiceError(
        error,
        'No fue posible cargar el catálogo de repuestos.'
      );
    }
  }

  /**
   * Obtiene la lista de repuestos según los parámetros de consulta.
   * Ruta Gateway: GET /api/repuestos
   */
  async getParts(params?: PartQueryParamsDto): Promise<Part[]> {
    try {
      return await this.adapter.getParts(params);
    } catch (error: unknown) {
      throw normalizePartServiceError(
        error,
        'No fue posible cargar el catálogo de repuestos.'
      );
    }
  }

  /**
   * Obtiene el detalle de un repuesto por su identificador (`RepuestoSalida` en MS3).
   * Ruta Gateway: GET /api/repuestos/{repuesto_id}
   */
  async getPartById(id: string | number): Promise<Part> {
    try {
      return await this.adapter.getPartById(id);
    } catch (error: unknown) {
      throw normalizePartServiceError(
        error,
        'No fue posible cargar el detalle del repuesto.'
      );
    }
  }

  /**
   * Registra un nuevo repuesto en el catálogo.
   * Ruta Gateway: POST /api/repuestos
   */
  async createPart(data: CreatePartRequestDto): Promise<Part> {
    try {
      return await this.adapter.createPart(data);
    } catch (error: unknown) {
      throw normalizePartServiceError(
        error,
        'No fue posible registrar el repuesto.'
      );
    }
  }

  /**
   * Modifica parcialmente un repuesto (nombre, proveedor o umbral particular).
   * Ruta Gateway: PATCH /api/repuestos/{repuesto_id}
   */
  async updatePart(
    id: string | number,
    data: UpdatePartRequestDto
  ): Promise<Part> {
    try {
      return await this.adapter.updatePart(id, data);
    } catch (error: unknown) {
      throw normalizePartServiceError(
        error,
        'No fue posible actualizar el repuesto.'
      );
    }
  }

  /**
   * Elimina un repuesto que nunca se usó.
   * Ruta Gateway: DELETE /api/repuestos/{repuesto_id}
   */
  async deletePart(id: string | number): Promise<void> {
    try {
      await this.adapter.deletePart(id);
    } catch (error: unknown) {
      throw normalizePartServiceError(
        error,
        'No fue posible eliminar el repuesto.'
      );
    }
  }
}

export const partsService = new PartsService();
export const partService = partsService;
export { PartsService as PartService };

