import React from 'react';
import { fireEvent, renderWithProviders, screen, waitFor } from '../../test-utils';

import AdministradorScreen from '@/app/(admin)/administrador';
import {
  adminDashboardService,
  buildAdminDashboardFromDomain,
} from '@/services/admin-dashboard.service';
import { budgetsService } from '@/services/budgets.service';
import { notificationsService } from '@/services/notifications.service';
import { ordersService } from '@/services/orders.service';
import { partsService } from '@/services/parts.service';
import { providersService } from '@/services/providers.service';
import { vehiclesService } from '@/services/vehicles.service';

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

describe('Integración de servicios necesarios del administrador', () => {
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
    notificationsService.useMockAdapter();
    notificationsService.resetMocks();
  });

  afterEach(() => jest.restoreAllMocks());

  it('agrega métricas de vehículos, órdenes, presupuestos, repuestos, proveedores y avisos en adminDashboardService', async () => {
    const data = await adminDashboardService.getDashboardData();

    expect(Number(data.systemSummary.registeredVehicles)).toBeGreaterThan(0);
    expect(Number(data.systemSummary.registeredProviders)).toBeGreaterThan(0);
    expect(data.activeOrderRows.length).toBeGreaterThan(0);
    expect(data.pendingApprovalRows.length).toBeGreaterThan(0);
    expect(data.notifications.length).toBeGreaterThan(0);
  });

  it('conserva cero y listas vacías cuando todos los recursos están vacíos', async () => {
    jest.spyOn(vehiclesService, 'getVehicles').mockResolvedValue([]);
    jest.spyOn(ordersService, 'getOrders').mockResolvedValue([]);
    jest.spyOn(budgetsService, 'getBudgets').mockResolvedValue([]);
    jest.spyOn(partsService, 'getParts').mockResolvedValue([]);
    jest.spyOn(providersService, 'getProviders').mockResolvedValue([]);
    jest.spyOn(notificationsService, 'getNotifications').mockResolvedValue([]);
    const data = await adminDashboardService.getDashboardData();
    expect(Object.values(data.stats)).toEqual(['0', '0', '0', '0']);
    expect(data.activeOrderRows).toEqual([]);
    expect(data.pendingApprovalRows).toEqual([]);
    expect(data.notifications).toEqual([]);
  });

  it('propaga un error de consulta en lugar de presentarlo como métricas válidas', async () => {
    const failure = new Error('MS2 no disponible');
    jest.spyOn(vehiclesService, 'getVehicles').mockRejectedValue(failure);
    await expect(adminDashboardService.getDashboardData()).rejects.toBe(failure);
  });

  it('muestra un fallo de avisos y permite recuperar la consulta sin datos ficticios', async () => {
    const query = jest.spyOn(notificationsService, 'getNotifications')
      .mockRejectedValueOnce(new Error('Avisos no disponibles'))
      .mockResolvedValue([]);
    await renderWithProviders(<AdministradorScreen />);
    await screen.findByTestId('admin-notifications-error');
    expect(screen.queryByText('Avisos del taller')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(screen.queryByTestId('admin-notifications-error')).toBeNull());
    expect(query).toHaveBeenCalledTimes(2);
  });

  it('permite ejecutar acciones administrativas sobre órdenes y notificaciones', async () => {
    const orders = await ordersService.getOrders();
    const targetOrder = orders.find(
      (o) => o.status !== 'entregado' && o.status !== 'cancelado'
    )!;

    const assigned = await adminDashboardService.assignMechanicToOrder(
      targetOrder.id,
      55,
      'Asignación desde panel administrador'
    );
    expect(assigned.assignedMechanicId).toBe('55');

    const updated = await adminDashboardService.updateOrderStatus(
      targetOrder.id,
      'en_reparacion',
      'Revisión técnica iniciada'
    );
    expect(updated.status).toBe('en_reparacion');

    const readNotice = await adminDashboardService.markNotificationAsRead(
      'not-001'
    );
    expect(readNotice.read).toBe(true);
  });

  it('construye correctamente el resumen con buildAdminDashboardFromDomain y renderiza AdministradorScreen', async () => {
    const [vehicles, orders, budgets, parts, providers, notifications] =
      await Promise.all([
        vehiclesService.getVehicles(),
        ordersService.getOrders(),
        budgetsService.getBudgets(),
        partsService.getParts(),
        providersService.getProviders(),
        notificationsService.getNotifications(),
      ]);

    const summary = buildAdminDashboardFromDomain({
      vehicles,
      orders,
      budgets,
      parts,
      providers,
      notifications,
    });

    expect(summary.systemSummary.registeredVehicles).toBe(
      String(vehicles.length)
    );
    expect(summary.systemSummary.registeredProviders).toBe(
      String(providers.length)
    );

    await renderWithProviders(<AdministradorScreen />);

    expect(screen.getByText('Panel del taller')).toBeTruthy();
    expect(screen.getByText('Cerrar sesión')).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText('Avisos del taller')).toBeTruthy();
    });
  });
});
