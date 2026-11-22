const services = [
  ['vehicles', 'VehiclesService', 'RealVehicleAdapter', 'MockVehicleAdapter', 'getVehicles'],
  ['orders', 'OrdersService', 'RealOrderAdapter', 'MockOrderAdapter', 'getOrders'],
  ['parts', 'PartsService', 'RealPartAdapter', 'MockPartAdapter', 'getParts'],
  ['providers', 'ProvidersService', 'RealProviderAdapter', 'MockProviderAdapter', 'getProviders'],
  ['budgets', 'BudgetsService', 'RealBudgetAdapter', 'MockBudgetAdapter', 'getBudgets'],
  ['evidence', 'EvidencesService', 'RealEvidenceAdapter', 'MockEvidenceAdapter', 'getEvidencesByOrder'],
  ['notifications', 'NotificationsService', 'RealNotificationAdapter', 'MockNotificationAdapter', 'getNotifications'],
];

describe.each(['false', 'true'])('Selección explícita de servicios mock=%s', (flag) => {
  const originalAuth = process.env.EXPO_PUBLIC_USE_MOCK_AUTH;
  const originalServices = process.env.EXPO_PUBLIC_USE_MOCK_SERVICES;

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalAuth === undefined) delete process.env.EXPO_PUBLIC_USE_MOCK_AUTH;
    else process.env.EXPO_PUBLIC_USE_MOCK_AUTH = originalAuth;
    if (originalServices === undefined) delete process.env.EXPO_PUBLIC_USE_MOCK_SERVICES;
    else process.env.EXPO_PUBLIC_USE_MOCK_SERVICES = originalServices;
  });

  it.each(services)('%s respeta servicios antes que autenticación', async (file, Service, Real, Mock, method) => {
    process.env.EXPO_PUBLIC_USE_MOCK_AUTH = flag === 'false' ? 'true' : 'false';
    process.env.EXPO_PUBLIC_USE_MOCK_SERVICES = flag;
    let run: () => Promise<unknown>;
    let real: jest.SpyInstance;
    let mock: jest.SpyInstance;
    jest.isolateModules(() => {
      const module = jest.requireActual(`@/services/${file}.service`);
      real = jest.spyOn(module[Real].prototype, method).mockResolvedValue([]);
      mock = jest.spyOn(module[Mock].prototype, method).mockResolvedValue([]);
      const service = new module[Service]();
      run = () => service[method]('1');
    });
    await run!();
    expect(real!).toHaveBeenCalledTimes(flag === 'false' ? 1 : 0);
    expect(mock!).toHaveBeenCalledTimes(flag === 'true' ? 1 : 0);
  });
});
