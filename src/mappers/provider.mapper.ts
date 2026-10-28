import type {
  ProviderDetailResponseDto,
  ProviderPageResponseDto,
  ProviderResponseDto,
} from '@/dto/provider.dto';
import type { PaginatedList } from '@/models/pagination.model';
import type { Provider, ProviderDetail } from '@/models/provider.model';
import { mapPartResponse } from './part.mapper';

/**
 * Mapea un proveedor al modelo Provider de la aplicación.
 */
function mapProviderResponse(dto: ProviderResponseDto): Provider {
  return {
    id: String(dto.proveedor_id),
    name: dto.nombre,
    contact: dto.contacto,
    partCount: dto.cantidad_repuestos,
  };
}

/**
 * Mapea un proveedor con sus repuestos devuelto por la API Gateway al modelo ProviderDetail.
 */
export function mapProviderDetailResponse(dto: ProviderDetailResponseDto): ProviderDetail {
  return {
    ...mapProviderResponse(dto),
    parts: dto.repuestos.map(mapPartResponse),
  };
}

/**
 * Mapea una página de proveedores devuelta por la API Gateway.
 */
export function mapProviderPageResponse(dto: ProviderPageResponseDto): PaginatedList<Provider> {
  return {
    items: dto.proveedores.map(mapProviderResponse),
    total: dto.total,
    offset: dto.desde,
    limit: dto.limite,
  };
}