import { apiClient } from '@/services/api/client';
import { HTTP_STATUS } from '@/services/api/types';
import {
  ServiceError,
  normalizeProviderServiceError,
} from '@/services/service-error';
import type { PaginatedList } from '@/models/pagination.model';
import type {
  Provider as DomainProvider,
  ProviderDetail,
} from '@/models/provider.model';
import type {
  CreateProviderRequestDto,
  ProviderDetailResponseDto,
  ProviderPageResponseDto,
  ProviderQueryParamsDto,
  ProviderResponseDto,
  UpdateProviderRequestDto,
} from '@/dto/provider.dto';
import {
  mapProviderDetailResponse,
  mapProviderPageResponse,
  mapProviderResponse,
} from '@/mappers/provider.mapper';
import { mockProviderDetails } from '@/mocks/providers.mock';

export { ServiceError, normalizeProviderServiceError };

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
 * Construye los parámetros de consulta oficiales de MS3 para `GET /proveedores`.
 */
export function buildProviderQueryParams(
  params?: ProviderQueryParamsDto
): Record<string, string | number | boolean> | undefined {
  if (!params) return undefined;

  const query: Record<string, string | number | boolean> = {};

  if (params.q !== undefined && params.q !== null && params.q.trim() !== '') {
    query.q = params.q.trim();
  }

  const conRepuestos = params.con_repuestos ?? params.hasParts;
  if (conRepuestos !== undefined && conRepuestos !== null) {
    query.con_repuestos = Boolean(conRepuestos);
  }

  if (params.tipo_distribuidor !== undefined && params.tipo_distribuidor !== null) {
    query.tipo_distribuidor = params.tipo_distribuidor;
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
 * Filtra y pagina localmente una lista de proveedores según `ProviderQueryParamsDto`.
 */
export function filterProvidersByParams(
  providers: DomainProvider[],
  params?: ProviderQueryParamsDto
): PaginatedList<DomainProvider> {
  let filtered = [...providers];

  if (params) {
    if (params.q && params.q.trim() !== '') {
      const term = normalizeSearchText(params.q);
      filtered = filtered.filter(
        (p) =>
          normalizeSearchText(p.name).includes(term) ||
          normalizeSearchText(p.contact).includes(term)
      );
    }

    const hasPartsFilter = params.con_repuestos ?? params.hasParts;
    if (hasPartsFilter === true) {
      filtered = filtered.filter((p) => p.partCount > 0);
    } else if (hasPartsFilter === false) {
      filtered = filtered.filter((p) => p.partCount === 0);
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
 * Contrato común para los adaptadores (Mock y Real HTTP) de Proveedores (MS3).
 */
export interface ProviderServiceAdapter {
  getProvidersPage(params?: ProviderQueryParamsDto): Promise<PaginatedList<DomainProvider>>;
  getProviders(params?: ProviderQueryParamsDto): Promise<DomainProvider[]>;
  getProviderById(id: string | number): Promise<ProviderDetail>;
  createProvider(data: CreateProviderRequestDto): Promise<DomainProvider>;
  updateProvider(
    id: string | number,
    data: UpdateProviderRequestDto
  ): Promise<DomainProvider>;
  deleteProvider(id: string | number): Promise<void>;
  resetMocks?(): void;
}

/**
 * Adaptador simulado (Mock) en memoria para proveedores y sus repuestos asociados.
 */
export class MockProviderAdapter implements ProviderServiceAdapter {
  private providerDetails: ProviderDetail[];
  private readonly delayMs: number;

  constructor(
    initialProviders: ProviderDetail[] = mockProviderDetails,
    delayMs = 0
  ) {
    this.providerDetails = initialProviders.map((p) => ({
      ...p,
      parts: p.parts.map((part) => ({ ...part })),
    }));
    this.delayMs = delayMs;
  }

  private async simulateDelay(): Promise<void> {
    if (this.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    }
  }

  resetMocks(initialProviders: ProviderDetail[] = mockProviderDetails): void {
    this.providerDetails = initialProviders.map((p) => ({
      ...p,
      parts: p.parts.map((part) => ({ ...part })),
    }));
  }

  async getProvidersPage(
    params?: ProviderQueryParamsDto
  ): Promise<PaginatedList<DomainProvider>> {
    await this.simulateDelay();
    const summaries: DomainProvider[] = this.providerDetails.map(
      ({ parts: _parts, ...provider }) => ({ ...provider })
    );
    return filterProvidersByParams(summaries, params);
  }

  async getProviders(params?: ProviderQueryParamsDto): Promise<DomainProvider[]> {
    const page = await this.getProvidersPage(params);
    return page.items;
  }

  async getProviderById(id: string | number): Promise<ProviderDetail> {
    await this.simulateDelay();
    const providerId = String(id);
    const found = this.providerDetails.find((p) => p.id === providerId);
    if (!found) {
      throw new ServiceError({
        message: 'El proveedor solicitado no existe.',
        status: HTTP_STATUS.NOT_FOUND,
        code: 'PROVIDER_NOT_FOUND',
        domain: 'providers',
      });
    }
    return {
      ...found,
      parts: found.parts.map((part) => ({ ...part })),
    };
  }

  async createProvider(data: CreateProviderRequestDto): Promise<DomainProvider> {
    await this.simulateDelay();
    const name = (data.nombre ?? '').trim();
    const contact = (data.contacto ?? '').trim();

    if (!name || !contact) {
      throw new ServiceError({
        message: 'El nombre y el contacto son obligatorios para registrar un proveedor.',
        status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
        code: 'PROVIDER_VALIDATION_ERROR',
        domain: 'providers',
      });
    }

    const duplicate = this.providerDetails.some(
      (p) => p.name.toLowerCase() === name.toLowerCase()
    );
    if (duplicate) {
      throw new ServiceError({
        message: 'Ya existe un proveedor registrado con ese nombre.',
        status: HTTP_STATUS.CONFLICT,
        code: 'PROVIDER_CONFLICT',
        domain: 'providers',
      });
    }

    const newProvider: ProviderDetail = {
      id: String(this.providerDetails.length + 1),
      name,
      contact,
      partCount: 0,
      parts: [],
    };

    this.providerDetails.push(newProvider);
    const { parts: _parts, ...summary } = newProvider;
    return { ...summary };
  }

  async updateProvider(
    id: string | number,
    data: UpdateProviderRequestDto
  ): Promise<DomainProvider> {
    await this.simulateDelay();
    const providerId = String(id);
    const index = this.providerDetails.findIndex((p) => p.id === providerId);
    if (index === -1) {
      throw new ServiceError({
        message: 'El proveedor solicitado no existe.',
        status: HTTP_STATUS.NOT_FOUND,
        code: 'PROVIDER_NOT_FOUND',
        domain: 'providers',
      });
    }

    const current = this.providerDetails[index];
    const nextName =
      data.nombre !== undefined && data.nombre !== null
        ? data.nombre.trim()
        : current.name;
    const nextContact =
      data.contacto !== undefined && data.contacto !== null
        ? data.contacto.trim()
        : current.contact;

    if (!nextName || !nextContact) {
      throw new ServiceError({
        message: 'El nombre y el contacto del proveedor no pueden quedar vacíos.',
        status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
        code: 'PROVIDER_VALIDATION_ERROR',
        domain: 'providers',
      });
    }

    const duplicate = this.providerDetails.some(
      (p, idx) =>
        idx !== index && p.name.toLowerCase() === nextName.toLowerCase()
    );
    if (duplicate) {
      throw new ServiceError({
        message: 'Ya existe otro proveedor con ese nombre.',
        status: HTTP_STATUS.CONFLICT,
        code: 'PROVIDER_CONFLICT',
        domain: 'providers',
      });
    }

    const updated: ProviderDetail = {
      ...current,
      name: nextName,
      contact: nextContact,
    };

    this.providerDetails[index] = updated;
    const { parts: _parts, ...summary } = updated;
    return { ...summary };
  }

  async deleteProvider(id: string | number): Promise<void> {
    await this.simulateDelay();
    const providerId = String(id);
    const index = this.providerDetails.findIndex((p) => p.id === providerId);
    if (index === -1) {
      throw new ServiceError({
        message: 'El proveedor solicitado no existe.',
        status: HTTP_STATUS.NOT_FOUND,
        code: 'PROVIDER_NOT_FOUND',
        domain: 'providers',
      });
    }

    if (this.providerDetails[index].partCount > 0) {
      throw new ServiceError({
        message: 'No se puede eliminar un proveedor que tiene repuestos asociados.',
        status: HTTP_STATUS.CONFLICT,
        code: 'PROVIDER_CONFLICT',
        domain: 'providers',
      });
    }

    this.providerDetails.splice(index, 1);
  }
}

/**
 * Adaptador HTTP real conectado a la API Gateway (`/proveedores` en MS3).
 */
export class RealProviderAdapter implements ProviderServiceAdapter {
  async getProvidersPage(
    params?: ProviderQueryParamsDto
  ): Promise<PaginatedList<DomainProvider>> {
    const queryParams = buildProviderQueryParams(params);
    const response = queryParams
      ? await apiClient.get<ProviderPageResponseDto>('/proveedores', {
          params: queryParams,
        })
      : await apiClient.get<ProviderPageResponseDto>('/proveedores');

    return mapProviderPageResponse(response.data);
  }

  async getProviders(params?: ProviderQueryParamsDto): Promise<DomainProvider[]> {
    const page = await this.getProvidersPage(params);
    return page.items;
  }

  async getProviderById(id: string | number): Promise<ProviderDetail> {
    const providerId = String(id);
    const response = await apiClient.get<ProviderDetailResponseDto>(
      `/proveedores/${providerId}`
    );
    return mapProviderDetailResponse(response.data);
  }

  async createProvider(data: CreateProviderRequestDto): Promise<DomainProvider> {
    const payload: CreateProviderRequestDto = {
      nombre: data.nombre.trim(),
      contacto: data.contacto.trim(),
      ...(data.tipo_distribuidor !== undefined
        ? { tipo_distribuidor: data.tipo_distribuidor }
        : {}),
    };
    const response = await apiClient.post<ProviderResponseDto>(
      '/proveedores',
      payload
    );
    return mapProviderResponse(response.data);
  }

  async updateProvider(
    id: string | number,
    data: UpdateProviderRequestDto
  ): Promise<DomainProvider> {
    const providerId = String(id);
    const payload: UpdateProviderRequestDto = {
      ...(data.nombre !== undefined ? { nombre: data.nombre } : {}),
      ...(data.contacto !== undefined ? { contacto: data.contacto } : {}),
      ...(data.tipo_distribuidor !== undefined
        ? { tipo_distribuidor: data.tipo_distribuidor }
        : {}),
    };
    const response = await apiClient.patch<ProviderResponseDto>(
      `/proveedores/${providerId}`,
      payload
    );
    return mapProviderResponse(response.data);
  }

  async deleteProvider(id: string | number): Promise<void> {
    const providerId = String(id);
    await apiClient.delete(`/proveedores/${providerId}`);
  }
}

/**
 * Servicio de Proveedores con soporte intercambiable para adaptador Mock y Real HTTP.
 */
export class ProvidersService {
  private adapter: ProviderServiceAdapter;
  private readonly mockAdapter: MockProviderAdapter;
  private readonly realAdapter: RealProviderAdapter;

  constructor(customAdapter?: ProviderServiceAdapter) {
    this.mockAdapter = new MockProviderAdapter(mockProviderDetails, 0);
    this.realAdapter = new RealProviderAdapter();
    this.adapter =
      customAdapter ?? (USE_MOCKS ? this.mockAdapter : this.realAdapter);
  }

  setAdapter(adapter: ProviderServiceAdapter): void {
    this.adapter = adapter;
  }

  useMockAdapter(): MockProviderAdapter {
    this.adapter = this.mockAdapter;
    return this.mockAdapter;
  }

  useRealAdapter(): RealProviderAdapter {
    this.adapter = this.realAdapter;
    return this.realAdapter;
  }

  resetMocks(): void {
    this.mockAdapter.resetMocks(mockProviderDetails);
  }

  async getProvidersPage(
    params?: ProviderQueryParamsDto
  ): Promise<PaginatedList<DomainProvider>> {
    try {
      return await this.adapter.getProvidersPage(params);
    } catch (error: unknown) {
      throw normalizeProviderServiceError(
        error,
        'No fue posible cargar los proveedores.'
      );
    }
  }

  async getProviders(params?: ProviderQueryParamsDto): Promise<DomainProvider[]> {
    try {
      return await this.adapter.getProviders(params);
    } catch (error: unknown) {
      throw normalizeProviderServiceError(
        error,
        'No fue posible cargar los proveedores.'
      );
    }
  }

  async getProviderById(id: string | number): Promise<ProviderDetail> {
    try {
      return await this.adapter.getProviderById(id);
    } catch (error: unknown) {
      throw normalizeProviderServiceError(
        error,
        'No fue posible cargar el detalle del proveedor.'
      );
    }
  }

  async createProvider(data: CreateProviderRequestDto): Promise<DomainProvider> {
    try {
      return await this.adapter.createProvider(data);
    } catch (error: unknown) {
      throw normalizeProviderServiceError(
        error,
        'No fue posible registrar el proveedor.'
      );
    }
  }

  async updateProvider(
    id: string | number,
    data: UpdateProviderRequestDto
  ): Promise<DomainProvider> {
    try {
      return await this.adapter.updateProvider(id, data);
    } catch (error: unknown) {
      throw normalizeProviderServiceError(
        error,
        'No fue posible actualizar el proveedor.'
      );
    }
  }

  async deleteProvider(id: string | number): Promise<void> {
    try {
      await this.adapter.deleteProvider(id);
    } catch (error: unknown) {
      throw normalizeProviderServiceError(
        error,
        'No fue posible eliminar el proveedor.'
      );
    }
  }
}

export const providersService = new ProvidersService();
export const providerService = providersService;
export { ProvidersService as ProviderService };

/**
 * ============================================================
 * HELPERS SÍNCRONOS DE DEMOSTRACIÓN PARA VISTAS UI (InventoryScreen)
 * ============================================================
 */
export type Provider = {
  id: string;
  name: string;
  contact: string;
  phone: string;
  parts: string[];
};

const demoProviders: Provider[] = [
  {
    id: 'PROV-001',
    name: 'Repuestos del Sur',
    contact: 'ventas@repuestosdelsur.cl',
    phone: '+56 9 5555 0101',
    parts: ['REP-001', 'REP-003'],
  },
  {
    id: 'PROV-002',
    name: 'Lubricantes Chile',
    contact: 'contacto@lubricantes.cl',
    phone: '+56 9 5555 0102',
    parts: ['REP-002', 'REP-005'],
  },
  {
    id: 'PROV-003',
    name: 'AutoPartes Central',
    contact: 'ventas@autopartes.cl',
    phone: '+56 9 5555 0103',
    parts: ['REP-004'],
  },
];

export function getProviders(): Provider[] {
  return demoProviders.map((provider) => ({
    ...provider,
    parts: [...provider.parts],
  }));
}

export function getProviderById(id: string): Provider | undefined {
  const provider = demoProviders.find((item) => item.id === id);

  return provider
    ? { ...provider, parts: [...provider.parts] }
    : undefined;
}
