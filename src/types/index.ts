export type UserRole =
  | 'cliente'
  | 'mecanico'
  | 'administrador';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface Vehicle {
  id: string;
  plate: string;
  brand?: string;
  model?: string;
}

export interface WorkOrder {
  id: string;
  vehicleId: string;
  status: string;
}