import { z } from 'zod';

const idValueSchema = z.union([z.number(), z.string()]);

export const notificationResponseDtoSchema = z
  .object({
    notificacion_id: idValueSchema.optional(),
    id: idValueSchema.optional(),
    titulo: z.string().optional(),
    title: z.string().optional(),
    mensaje: z.string().optional(),
    message: z.string().optional(),
    categoria: z.string().optional(),
    category: z.string().optional(),
    prioridad: z.string().optional(),
    priority: z.string().optional(),
    leida: z.boolean().optional(),
    is_read: z.boolean().optional(),
    read: z.boolean().optional(),
    creado_en: z.string().optional(),
    created_at: z.string().optional(),
    rol_destino: z.string().nullable().optional(),
    target_role: z.string().nullable().optional(),
    orden_id: idValueSchema.nullable().optional(),
    order_id: idValueSchema.nullable().optional(),
    vehiculo_id: idValueSchema.nullable().optional(),
    vehicle_id: idValueSchema.nullable().optional(),
    presupuesto_id: idValueSchema.nullable().optional(),
    budget_id: idValueSchema.nullable().optional(),
    repuesto_id: idValueSchema.nullable().optional(),
    part_id: idValueSchema.nullable().optional(),
  })
  .refine(
    (data) =>
      (data.notificacion_id !== undefined || data.id !== undefined) &&
      Boolean((data.titulo ?? data.title ?? '').trim()) &&
      Boolean((data.mensaje ?? data.message ?? '').trim()),
    {
      message:
        'El DTO de notificación debe incluir identificador, título y mensaje.',
    }
  );

export const notificationResponseListDtoSchema = z.array(
  notificationResponseDtoSchema
);

