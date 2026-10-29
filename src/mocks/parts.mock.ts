import { mapPartResponse } from '@/mappers/part.mapper';
import {
  partPagePayload,
  partResponsePayloads,
} from '@/mocks/payloads/part.payload';
import type { Part } from '@/models/part.model';

/**
 * Catálogo de repuestos simulados derivado de los payloads del contrato MS3.
 */
export const mockParts: Part[] = Object.values(partResponsePayloads).map(
  mapPartResponse
);

/**
 * Umbral general simulado para el catálogo de repuestos.
 */
export const mockGeneralThreshold: number | null = partPagePayload.umbral_general;

