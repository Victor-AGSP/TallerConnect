import { UserRole } from '@/constants/roles';

/**
 * Representa a un usuario del sistema TallerConnect.
 * Es la entidad base para Cliente, Mecánico y Administrador,
 * diferenciados mediante el campo `role`.
 */

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  createdAt?: string;
}
