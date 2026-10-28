export * from './api';
export * from './auth.service';
export * from './orders.service';
export { extractValidationDetail } from './service-error';
export {
  filterVehiclesByParams,
  MockVehicleAdapter,
  RealVehicleAdapter,
  VehiclesService,
  VehicleService,
  vehiclesService,
  normalizeVehicleServiceError,
} from './vehicles.service';
export type { VehicleServiceAdapter } from './vehicles.service';
export * from './parts.service';
export * from './budgets.service';
