import { z } from 'zod';

import { LoginResponseDto, UserResponseDto } from '@/dto/auth.dto';

/**
 * Valida el usuario recibido de la API (GET /api/auth/me y campo `user` del login).
 * Comprueba la forma del contrato `UsuarioRespuesta`; la conversión del rol
 * al tipo de la app sigue a cargo del mapper.
 */
export const userResponseDtoSchema: z.ZodType<UserResponseDto> = z.object({
  id: z.number().int(),
  email: z.email(),
  full_name: z.string().min(1),
  roles: z.array(z.string()).min(1),
  is_active: z.boolean(),
});

/**
 * Valida la respuesta de POST /api/auth/login (contrato `TokenRespuesta`).
 */
export const loginResponseDtoSchema: z.ZodType<LoginResponseDto> = z.object({
  access_token: z.string().min(1),
  token_type: z.string(),
  user: userResponseDtoSchema,
});