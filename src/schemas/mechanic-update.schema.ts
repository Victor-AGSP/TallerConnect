import { z } from 'zod';

export const mechanicUpdateSchema = z.object({
  type: z.enum(['observacion', 'accion']),
  description: z
    .string()
    .trim()
    .min(1, 'Describe el avance realizado.'),
});

export type MechanicUpdateFormValues = z.infer<typeof mechanicUpdateSchema>;