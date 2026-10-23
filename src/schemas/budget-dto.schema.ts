import { z } from 'zod';

import type {
  BudgetDetailResponseDto,
  BudgetPageResponseDto,
  BudgetSummaryResponseDto,
  BudgetVersionResponseDto,
} from '@/dto/budget.dto';

/**
 * Monto o cantidad que el contrato entrega como texto decimal no negativo (ej. "15000.00").
 */
const decimalString = z.string().regex(/^\d+(\.\d+)?$/, 'Debe ser un decimal no negativo en texto');

const budgetVersionStatusSchema = z.enum(['borrador', 'enviada', 'aprobada', 'rechazada']);

/**
 * Valida un ítem de una versión de presupuesto (contrato `ItemSalida`).
 */
const budgetItemResponseDtoSchema = z.object({
  item_id: z.number().int(),
  tipo: z.enum(['repuesto', 'mano_de_obra']),
  descripcion: z.string(),
  cantidad: decimalString,
  precio_unitario: decimalString,
  subtotal: decimalString,
  repuesto_id: z.number().int().nullable(),
  repuesto_nombre: z.string().nullable().optional(),
  proveedor_nombre: z.string().nullable().optional(),
});

/**
 * Valida la decisión del cliente sobre una versión (contrato `DecisionSalida`).
 */
const budgetDecisionResponseDtoSchema = z.object({
  decision_id: z.number().int(),
  decision: z.enum(['aprobado', 'rechazado']),
  cliente_usuario_id: z.number().int(),
  fecha_hora: z.iso.datetime({ offset: true }),
  motivo: z.string().nullable(),
});

/**
 * Valida una versión de presupuesto recibida de la API
 * (GET /api/presupuestos/{presupuesto_id}/versiones/{numero}).
 * Comprueba la forma del contrato `VersionDetalle`.
 */
export const budgetVersionResponseDtoSchema: z.ZodType<BudgetVersionResponseDto> = z.object({
  numero: z.number().int(),
  estado: budgetVersionStatusSchema,
  es_modificacion: z.boolean(),
  creado_por_id: z.number().int(),
  creado_en: z.iso.datetime({ offset: true }),
  enviado_en: z.iso.datetime({ offset: true }).nullable(),
  bloqueada_en: z.iso.datetime({ offset: true }).nullable(),
  total: decimalString,
  items: z.array(budgetItemResponseDtoSchema),
  decision: budgetDecisionResponseDtoSchema.nullable(),
});

const budgetSummaryShape = z.object({
  presupuesto_id: z.number().int(),
  orden_id: z.number().int(),
  creado_en: z.iso.datetime({ offset: true }),
  cantidad_versiones: z.number().int(),
  ultima_version: z.number().int(),
  estado_ultima_version: budgetVersionStatusSchema,
  total_ultima_version: decimalString,
  version_vigente: z.number().int().nullable(),
});

/**
 * Valida el resumen de un presupuesto (contrato `PresupuestoResumen`).
 */
export const budgetSummaryResponseDtoSchema: z.ZodType<BudgetSummaryResponseDto> =
  budgetSummaryShape;

/**
 * Valida un presupuesto con sus versiones recibido de la API
 * (GET /api/presupuestos/{presupuesto_id}). Comprueba la forma del contrato `PresupuestoDetalle`.
 */
export const budgetDetailResponseDtoSchema: z.ZodType<BudgetDetailResponseDto> =
  budgetSummaryShape.extend({
    versiones: z.array(budgetVersionResponseDtoSchema),
  });

/**
 * Valida la página de presupuestos recibida de la API (GET /api/presupuestos).
 * Comprueba la forma del contrato `PaginaPresupuestos`.
 */
export const budgetPageResponseDtoSchema: z.ZodType<BudgetPageResponseDto> = z.object({
  total: z.number().int(),
  desde: z.number().int(),
  limite: z.number().int(),
  presupuestos: z.array(budgetSummaryShape),
});