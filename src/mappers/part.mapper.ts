import type { PartPageResponseDto, PartResponseDto } from '@/dto/part.dto';
import type { PaginatedList } from '@/models/pagination.model';
import type { Part } from '@/models/part.model';

/**
 * Mapea un repuesto devuelto por la API Gateway al modelo Part de la aplicación.
 */
export function mapPartResponse(dto: PartResponseDto): Part {
  return {
    id: String(dto.repuesto_id),
    name: dto.nombre,
    providerId: String(dto.proveedor_id),
    providerName: dto.proveedor_nombre,
    stock: dto.stock,
    customThreshold: dto.umbral_particular,
    effectiveThreshold: dto.umbral_efectivo,
    belowThreshold: dto.bajo_umbral,
  };
}

/**
 * Mapea una página de repuestos devuelta por la API Gateway.
 */
export function mapPartPageResponse(dto: PartPageResponseDto): PaginatedList<Part> {
  return {
    items: dto.repuestos.map(mapPartResponse),
    total: dto.total,
    offset: dto.desde,
    limit: dto.limite,
  };
}