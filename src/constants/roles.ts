/**
 * Roles disponibles dentro de TallerConnect.
 * Definen los permisos y la interfaz que ve cada usuario:
 * cliente, mecánico o administrador.
 */

export const ROLES = {
  CLIENTE: 'cliente',
  MECANICO: 'mecanico',
  ADMINISTRADOR: 'administrador',
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];
