import { z } from 'zod';

/** Valida `BitacoraRespuesta` (MS2). */
export const orderLogEntryResponseDtoSchema = z.object({
  bitacora_id: z.number().int().positive(),
  orden_id: z.number().int().positive(),
  autor_usuario_id: z.number().int().positive(),
  tipo: z.enum(['observacion', 'accion']),
  descripcion: z.string(),
  creado_en: z.iso.datetime({ offset: true, local: true }),
  repuestos: z
    .array(z.object({ nombre: z.string(), cantidad: z.number().int().positive() }))
    .optional(),
});

export const orderLogResponseDtoSchema = z.array(orderLogEntryResponseDtoSchema);
