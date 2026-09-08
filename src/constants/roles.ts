export const ROLES = {
  CLIENTE: 'cliente',
  MECANICO: 'mecanico',
  ADMINISTRADOR: 'administrador',
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];
