import { apiClient } from '@/services/api/client';
import { normalizeApiError } from '@/services/api/interceptors';
import type {
  SparePartsPageDto,
  SupplierDetailResponseDto,
  SuppliersPageDto,
} from '@/dto/parts.dto';
import {
  mapSparePartsPage,
  mapSupplierDetailResponse,
  mapSuppliersPage,
} from '@/mappers/parts.mapper';
import type {
  PagedList,
  SparePart,
  Supplier,
  SupplierDetail,
} from '@/models/parts.model';
import { mockSpareParts, mockSuppliers } from '@/mocks/parts.mock';

const USE_MOCKS = process.env.EXPO_PUBLIC_USE_MOCK_AUTH === 'true';

/** `limite` por defecto de `GET /repuestos` y `GET /proveedores` (MS3, máximo 200). */
export const MS3_PAGE_SIZE = 50;

/** Página solicitada a un listado del MS3: `desde` (≥ 0) y `limite` (1–200). */
export interface PageRequest {
  offset: number;
  limit?: number;
}

/**
 * Parámetros `desde`/`limite` de una página posterior a la primera. La primera
 * se pide sin parámetros (el MS3 aplica `desde=0` y `limite=50`).
 */
function pageParams(page?: PageRequest): { desde: number; limite: number } | undefined {
  if (!page || page.offset === 0) return undefined;
  const limit = page.limit ?? MS3_PAGE_SIZE;
  if (!Number.isInteger(page.offset) || page.offset < 0 || !Number.isInteger(limit) || limit < 1 || limit > 200) {
    throw new Error('Parámetros de paginación inválidos.');
  }
  return { desde: page.offset, limite: limit };
}

/** Página simulada a partir de la lista completa en memoria. */
function mockPage<T>(all: T[], page?: PageRequest): PagedList<T> {
  const offset = page?.offset ?? 0;
  return {
    items: all.slice(offset, offset + (page?.limit ?? MS3_PAGE_SIZE)),
    total: all.length,
  };
}

/**
 * Consulta de repuestos y proveedores del MS3 a través de la API Gateway.
 * Solo lectura: el alta, edición y movimientos de inventario no forman
 * parte de la app.
 */
export class PartsService {
  /**
   * Lista los repuestos ordenados por nombre. Sin `page` consulta la primera página.
   * Ruta Gateway: GET /api/repuestos?desde=&limite=
   */
  async getSpareParts(page?: PageRequest): Promise<PagedList<SparePart>> {
    if (USE_MOCKS) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return mockPage(mockSpareParts, page);
    }

    try {
      const params = pageParams(page);
      const response = params
        ? await apiClient.get<SparePartsPageDto>('/repuestos', { params })
        : await apiClient.get<SparePartsPageDto>('/repuestos');
      return mapSparePartsPage(response.data);
    } catch (error: unknown) {
      const normalized = normalizeApiError(error);
      throw new Error(normalized.message || 'No fue posible cargar los repuestos.');
    }
  }

  /**
   * Lista los proveedores. Sin `page` consulta la primera página.
   * Ruta Gateway: GET /api/proveedores?desde=&limite=
   */
  async getSuppliers(page?: PageRequest): Promise<PagedList<Supplier>> {
    if (USE_MOCKS) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return mockPage(mockSuppliers, page);
    }

    try {
      const params = pageParams(page);
      const response = params
        ? await apiClient.get<SuppliersPageDto>('/proveedores', { params })
        : await apiClient.get<SuppliersPageDto>('/proveedores');
      return mapSuppliersPage(response.data);
    } catch (error: unknown) {
      const normalized = normalizeApiError(error);
      throw new Error(normalized.message || 'No fue posible cargar los proveedores.');
    }
  }

  /**
   * Detalle de un proveedor con los repuestos que suministra.
   * Ruta Gateway: GET /api/proveedores/{proveedor_id}
   */
  async getSupplierById(id: string): Promise<SupplierDetail> {
    if (USE_MOCKS) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      const found = mockSuppliers.find((supplier) => supplier.id === id);
      if (!found) {
        throw new Error('El proveedor solicitado no existe.');
      }
      return {
        ...found,
        parts: mockSpareParts.filter((part) => part.supplierId === id),
      };
    }

    try {
      const response = await apiClient.get<SupplierDetailResponseDto>(
        `/proveedores/${encodeURIComponent(id)}`,
      );
      return mapSupplierDetailResponse(response.data);
    } catch (error: unknown) {
      const normalized = normalizeApiError(error);
      throw new Error(normalized.message || 'No fue posible cargar el proveedor.');
    }
  }
}

export const partsService = new PartsService();
