import type { UserRole } from '@/constants/roles';
import type { UserResponseDto } from '@/dto/auth.dto';

/**
 * Respuestas reales de GET /api/auth/me obtenidas con la cuenta de prueba de cada rol.
 * Anonimización: los identificadores se reemplazaron por valores ficticios con la misma
 * correspondencia que `vehicles.gateway.ts` y `orders.gateway.ts` (usuarios 5xx). Los correos
 * usan el dominio reservado `example.invalid` y los nombres son genéricos. No incluyen token.
 * Los roles y `is_active` se mantienen tal como los entregó la API.
 */
export const authMeGatewayResponses: Record<UserRole, UserResponseDto> = {
  cliente: {
    id: 501,
    email: 'usuario501@example.invalid',
    full_name: 'Usuario Cliente',
    roles: ['cliente'],
    is_active: true,
  },
  mecanico: {
    id: 502,
    email: 'usuario502@example.invalid',
    full_name: 'Usuario Mecánico',
    roles: ['mecanico'],
    is_active: true,
  },
  administrador: {
    id: 503,
    email: 'usuario503@example.invalid',
    full_name: 'Usuario Administrador',
    roles: ['administrador'],
    is_active: true,
  },
};