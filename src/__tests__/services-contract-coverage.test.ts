import { ENV, GATEWAY_ROUTES } from '@/config/env';
import { mockEvidences } from '@/mocks';
import {
  authService,
  budgetsService,
  evidenceService,
  httpClient,
  notificationsService,
  ordersService,
  partsService,
  providersService,
  vehiclesService,
} from '@/services';

describe('Cobertura de servicios respecto de los contratos requeridos por la app', () => {
  beforeEach(() => {
    vehiclesService.useMockAdapter();
    vehiclesService.resetMocks();
    ordersService.useMockAdapter();
    ordersService.resetMocks();
    budgetsService.useMockAdapter();
    budgetsService.resetMocks();
    partsService.useMockAdapter();
    partsService.resetMocks();
    providersService.useMockAdapter();
    providersService.resetMocks();
    evidenceService.useMockAdapter();
    evidenceService.resetMocks();
    notificationsService.useMockAdapter();
    notificationsService.resetMocks();
  });

  it('expone las rutas oficiales de todos los dominios en GATEWAY_ROUTES y ENV.ROUTES', () => {
    expect(ENV.ROUTES).toEqual(GATEWAY_ROUTES);
    expect(ENV.ROUTES.AUTH).toBe('/auth');
    expect(ENV.ROUTES.VEHICLES).toBe('/vehiculos');
    expect(ENV.ROUTES.ORDERS).toBe('/ordenes');
    expect(ENV.ROUTES.BUDGETS).toBe('/presupuestos');
    expect(ENV.ROUTES.PARTS).toBe('/repuestos');
    expect(ENV.ROUTES.PROVIDERS).toBe('/proveedores');
    expect(ENV.ROUTES.EVIDENCES).toBe('/evidencias');
    expect(ENV.ROUTES.NOTIFICATIONS).toBe('/notificaciones');
  });

  it('verifica que authService, vehiclesService y ordersService (MS1 y MS2) implementan todos los métodos del contrato', async () => {
    expect(typeof authService.login).toBe('function');
    expect(typeof authService.getCurrentUser).toBe('function');

    expect(typeof vehiclesService.getVehicles).toBe('function');
    expect(typeof vehiclesService.getMyVehicles).toBe('function');
    expect(typeof vehiclesService.getAssignedVehicles).toBe('function');
    expect(typeof vehiclesService.getVehicleById).toBe('function');
    expect(typeof vehiclesService.createVehicle).toBe('function');
    expect(typeof vehiclesService.updateVehicle).toBe('function');

    expect(typeof ordersService.getOrders).toBe('function');
    expect(typeof ordersService.getOrderById).toBe('function');
    expect(typeof ordersService.createOrder).toBe('function');
    expect(typeof ordersService.updateOrderStatus).toBe('function');
    expect(typeof ordersService.assignMechanic).toBe('function');
    expect(typeof ordersService.getOrderHistory).toBe('function');

    const vehicles = await vehiclesService.getVehicles();
    const orders = await ordersService.getOrders();
    expect(vehicles.length).toBeGreaterThan(0);
    expect(orders.length).toBeGreaterThan(0);
  });

  it('verifica que budgetsService, partsService y providersService (MS3) implementan todos los métodos del contrato', async () => {
    expect(typeof budgetsService.getBudgetsPage).toBe('function');
    expect(typeof budgetsService.getBudgets).toBe('function');
    expect(typeof budgetsService.getBudgetById).toBe('function');
    expect(typeof budgetsService.getBudgetByOrderId).toBe('function');
    expect(typeof budgetsService.getBudgetVersion).toBe('function');
    expect(typeof budgetsService.createBudget).toBe('function');
    expect(typeof budgetsService.createBudgetVersion).toBe('function');
    expect(typeof budgetsService.updateBudgetVersionItems).toBe('function');
    expect(typeof budgetsService.sendBudgetVersion).toBe('function');
    expect(typeof budgetsService.submitBudgetDecision).toBe('function');

    expect(typeof partsService.getPartsPage).toBe('function');
    expect(typeof partsService.getParts).toBe('function');
    expect(typeof partsService.getPartById).toBe('function');
    expect(typeof partsService.createPart).toBe('function');
    expect(typeof partsService.updatePart).toBe('function');
    expect(typeof partsService.deletePart).toBe('function');

    expect(typeof providersService.getProvidersPage).toBe('function');
    expect(typeof providersService.getProviders).toBe('function');
    expect(typeof providersService.getProviderById).toBe('function');
    expect(typeof providersService.createProvider).toBe('function');
    expect(typeof providersService.updateProvider).toBe('function');
    expect(typeof providersService.deleteProvider).toBe('function');

    const [budgets, parts, providers] = await Promise.all([
      budgetsService.getBudgets(),
      partsService.getParts(),
      providersService.getProviders(),
    ]);

    expect(budgets.length).toBeGreaterThan(0);
    expect(parts.length).toBeGreaterThan(0);
    expect(providers.length).toBeGreaterThan(0);
  });

  it('verifica que evidenceService (MS4) y notificationsService implementan todos los métodos requeridos y permiten alternar adaptadores', async () => {
    expect(typeof evidenceService.getEvidencesByOrder).toBe('function');
    expect(typeof evidenceService.getEvidenceById).toBe('function');
    expect(typeof evidenceService.getEvidenceDownloadUrl).toBe('function');
    expect(typeof evidenceService.uploadEvidence).toBe('function');
    expect(typeof evidenceService.captureAndUploadEvidence).toBe('function');
    expect(typeof evidenceService.pickAndUploadEvidence).toBe('function');

    expect(typeof notificationsService.getNotifications).toBe('function');
    expect(typeof notificationsService.getUnreadCount).toBe('function');
    expect(typeof notificationsService.markAsRead).toBe('function');
    expect(typeof notificationsService.markAllAsRead).toBe('function');
    expect(typeof notificationsService.getContractStatus).toBe('function');

    expect(typeof httpClient.get).toBe('function');
    expect(typeof httpClient.post).toBe('function');
    expect(typeof httpClient.put).toBe('function');
    expect(typeof httpClient.patch).toBe('function');
    expect(typeof httpClient.delete).toBe('function');
    expect(typeof httpClient.postMultipart).toBe('function');

    const evidences = await evidenceService.getEvidencesByOrder(
      mockEvidences[0].orderId
    );
    const notifications = await notificationsService.getNotifications();
    expect(evidences.length).toBeGreaterThan(0);
    expect(notifications.length).toBeGreaterThan(0);

    // Verificar alternancia limpia entre adaptador Real y Mock en todos los servicios
    for (const svc of [
      vehiclesService,
      ordersService,
      budgetsService,
      partsService,
      providersService,
      evidenceService,
      notificationsService,
    ]) {
      expect(svc.useRealAdapter()).toBeDefined();
      expect(svc.useMockAdapter()).toBeDefined();
    }
  });
});
