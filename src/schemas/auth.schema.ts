import { z } from 'zod';
import { ROLES } from '@/constants/roles';


export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'El correo no puede estar vacío')
    .email('Ingresa un formato de correo válido'),
  password: z
    .string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export const userSchema = z.object({
  id: z.string().min(1, 'El id no puede estar vacío'),
  name: z.string().min(1, 'El nombre no puede estar vacío'),
  email: z.string().email('Formato de correo inválido'),
  role: z.enum([ROLES.CLIENTE, ROLES.MECANICO, ROLES.ADMINISTRADOR]),
  phone: z.string().optional(),
  createdAt: z.string().optional(),
});

export const authResponseSchema = z.object({
  user: userSchema,
  token: z.string().min(1, 'El token no puede estar vacío'),
  refreshToken: z.string().optional(),
});

export type AuthResponseValidated = z.infer<typeof authResponseSchema>;

export type LoginFormData = z.infer<typeof loginSchema>;
