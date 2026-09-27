import { z } from 'zod';
import { ROLES } from '@/constants/roles';

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'El correo es obligatorio')
    .email('Ingresa un correo válido'),

  password: z
    .string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export const userSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum([
    ROLES.CLIENTE,
    ROLES.MECANICO,
    ROLES.ADMINISTRADOR,
  ]),
  phone: z.string().optional(),
  createdAt: z.string().optional(),
});

export const authResponseSchema = z.object({
  user: userSchema,
  token: z.string().min(1),
  refreshToken: z.string().optional(),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export type AuthResponseValidated = z.infer<
  typeof authResponseSchema
>;