import {
  mapProviderDetailResponse,
  mapProviderPageResponse,
} from '@/mappers/provider.mapper';
import {
  providerDetailPayloads,
  providerPagePayload,
} from '@/mocks/payloads/provider.payload';
import type { Provider, ProviderDetail } from '@/models/provider.model';

/**
 * Proveedores con sus repuestos simulados derivados de los payloads del contrato MS3.
 */
export const mockProviderDetails: ProviderDetail[] = Object.values(
  providerDetailPayloads
).map(mapProviderDetailResponse);

/**
 * Lista de proveedores simulados para listados paginados.
 */
export const mockProviders: Provider[] =
  mapProviderPageResponse(providerPagePayload).items;

