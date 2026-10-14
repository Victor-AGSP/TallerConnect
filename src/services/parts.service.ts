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

/**
 * Consulta de repuestos y proveedores del MS3 a través de la API Gateway.
 * Solo lectura: el alta, edición y movimientos de inventario no forman
 * parte de la app.
 */
export class PartsService {
  /**
   * Lista los repuestos ordenados por nombre.
   * Ruta Gateway: GET /api/repuestos
   */
  async getSpareParts(): Promise<PagedList<SparePart>> {
    if (USE_MOCKS) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return { items: [...mockSpareParts], total: mockSpareParts.length };
    }

    try {
      const response = await apiClient.get<SparePartsPageDto>('/repuestos');
      return mapSparePartsPage(response.data);
    } catch (error: unknown) {
      const normalized = normalizeApiError(error);
      throw new Error(normalized.message || 'No fue posible cargar los repuestos.');
    }
  }

  /**
   * Lista los proveedores.
   * Ruta Gateway: GET /api/proveedores
   */
  async getSuppliers(): Promise<PagedList<Supplier>> {
    if (USE_MOCKS) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return { items: [...mockSuppliers], total: mockSuppliers.length };
    }

    try {
      const response = await apiClient.get<SuppliersPageDto>('/proveedores');
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
