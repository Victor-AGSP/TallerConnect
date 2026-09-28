import { z } from 'zod';
import { ROLES, UserRole } from '@/constants/roles';
import { LoginResponseDto, UserResponseDto } from '@/dto/auth.dto';
import { AuthResponse } from '@/models/auth.model';
import { User } from '@/models/user.model';

// Validate before String(id) or dropping is_active: coercion can hide invalid data.
const userResponseSchema = z.object({
  id: z.number().int(),
  email: z.string().email(),
  full_name: z.string().trim().min(1),
  roles: z.array(z.string()),
  is_active: z.literal(true),
});

const VALID_ROLES: readonly string[] = Object.values(ROLES);

/**
 * Indica si un valor recibido del backend corresponde a un rol de la app.
 * Evita convertir con `as UserRole` un valor que podría ser inválido.
 */
function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && VALID_ROLES.includes(value);
}

/**
 * Convierte el usuario de la API (`UserResponseDto`) al modelo `User`.
 * Se usa el primer rol de `roles`, igual que la integración actual;
 * si falta o no es un rol de la app, se lanza un error.
 */
export function mapUserResponse(payload: UserResponseDto): User {
  const dto = userResponseSchema.parse(payload);
  const role = dto.roles[0];

  if (!isUserRole(role)) {
    throw new Error('El usuario no tiene un rol válido para TallerConnect.');
  }

  return {
    id: String(dto.id),
    name: dto.full_name,
    email: dto.email,
    role,
  };
}

/**
 * Convierte la respuesta del login (`LoginResponseDto`) al modelo `AuthResponse`.
 * `token_type` no se conserva y el contrato no entrega refresh token.
 */
export function mapLoginResponse(dto: LoginResponseDto): AuthResponse {
  return {
    user: mapUserResponse(dto.user),
    token: dto.access_token,
  };
}