export * from './admin-dashboard.service';
export * from './api';
export * from './auth.service';
export {
  filterOrdersByParams,
  MockOrderAdapter,
  RealOrderAdapter,
  OrdersService,
  ordersService,
  OrderService,
} from './orders.service';
export type { UpdateOrderStatusOptions, UpdateOrderStatusArgument, OrderServiceAdapter } from './orders.service';
export {
  buildPartQueryParams,
  filterPartsByParams,
  MockPartAdapter,
  RealPartAdapter,
  MS3_PAGE_SIZE,
  PartsService,
  partsService,
  partService,
  PartService,
  getParts,
  getPartById,
  getLowStockParts,
  getOutOfStockParts,
} from './parts.service';
export type { PartServiceAdapter, PageRequest, Part } from './parts.service';
export {
  buildBudgetQueryParams,
  filterBudgetsByParams,
  MockBudgetAdapter,
  RealBudgetAdapter,
  BudgetsService,
  BudgetService,
  getBudgets,
  getBudgetById,
  calculateBudgetTotal,
  DecisionApplicationPendingError,
  budgetsService,
  budgetService,
} from './budgets.service';
export type { BudgetServiceAdapter, DemoBudgetItem, DemoBudget } from './budgets.service';
export {
  MAX_IMAGE_SIZE_BYTES,
  MAX_VIDEO_SIZE_BYTES,
  MockEvidenceAdapter,
  RealEvidenceAdapter,
  EvidencesService,
  EvidenceService,
  EvidenceServiceError,
  getGlobalErrorMessage,
  isConnectivityOrTimeoutError,
  normalizeNotificationServiceError,
  EVIDENCE_UPLOAD_TIMEOUT_MS,
  evidenceService,
  evidencesService,
} from './evidence.service';
export type { EvidenceUploadOptions, PickAndUploadEvidenceParams, EvidenceServiceAdapter, EvidenceErrorOutcome, UploadEvidenceInput, UploadEvidenceOptions, LegacyUploadEvidenceOptions, EvidenceDownloadUrl, LegacyEvidenceDownloadUrl } from './evidence.service';
export {
  buildProviderQueryParams,
  filterProvidersByParams,
  MockProviderAdapter,
  RealProviderAdapter,
  ProvidersService,
  providersService,
  providerService,
  ProviderService,
  getProviders,
  getProviderById,
} from './providers.service';
export type { ProviderServiceAdapter, Provider } from './providers.service';
export {
  ServiceError,
  extractValidationDetail,
  normalizeVehicleServiceError,
  normalizeOrderServiceError,
  normalizeBudgetServiceError,
  normalizePartServiceError,
  normalizeProviderServiceError,
  normalizeEvidenceServiceError,
} from './service-error';
export type { ServiceErrorDomain } from './service-error';
export { filterVehiclesByParams, MockVehicleAdapter, RealVehicleAdapter, VehiclesService, VehicleService, vehiclesService } from './vehicles.service';
export type { VehicleServiceAdapter } from './vehicles.service';
export {
  filterNotificationsByParams,
  MockNotificationAdapter,
  RealNotificationAdapter,
  NotificationsService,
  NotificationService,
  notificationsService,
} from './notifications.service';
export type {
  NotificationServiceAdapter,
  RealNotificationAdapterOptions,
} from './notifications.service';
