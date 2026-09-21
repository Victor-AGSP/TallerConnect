/**
 * Representa un vehículo registrado en el sistema,
 * asociado a un cliente y utilizado en las órdenes de trabajo.
 */

export interface Vehicle {
  id: string;
  plate: string;
  brand?: string;
  model?: string;
  year?: number;
  ownerId?: string;
}
