import React from 'react';
import { Text, View } from 'react-native';
import { act } from '@testing-library/react-native';

import { router as expoRouter } from 'expo-router';
import {
  cleanup,
  renderRouterWithProviders,
  resetStores,
  screen,
  waitFor,
} from '../test-utils';
import { mockAuthResponses } from '@/mocks/auth.mock';
import { authService } from '@/services/auth.service';
import { ordersService } from '@/services/orders.service';
import { vehiclesService } from '@/services/vehicles.service';
import { useAuthStore } from '@/stores/authStore';
import { useConnectivityStore } from '@/stores/connectivityStore';
import { ConnectivityBanner } from '@/components/common/ConnectivityBanner';
import IndexScreen from '@/app/index';

// Mocks de servicios
jest.mock('@/services/auth.service', () => ({
  authService: {
    login: jest.fn(),
  },
}));

jest.mock('@/services/orders.service', () => ({
  ordersService: {
    getOrders: jest.fn(),
  },
}));

jest.mock('@/services/vehicles.service', () => ({
  vehiclesService: {
    getVehicles: jest.fn(),
  },
}));

const mockedLogin = jest.mocked(authService.login);
const mockedGetOrders = jest.mocked(ordersService.getOrders);
const mockedGetVehicles = jest.mocked(vehiclesService.getVehicles);

// Definición de rutas de prueba con soporte para el banner de conectividad
const routes = {
  index: IndexScreen,
  '(auth)/login': () => (
    <View testID="login-screen">
      <ConnectivityBanner />
      <Text>Pantalla Iniciar Sesión</Text>
    </View>
  ),
  cliente: () => (
    <View testID="cliente-screen">
      <ConnectivityBanner />
      <Text>Inicio Cliente</Text>
    </View>
  ),
  mecanico: () => (
    <View testID="mecanico-screen">
      <ConnectivityBanner />
      <Text>Inicio Mecánico</Text>
    </View>
  ),
  administrador: () => (
    <View testID="administrador-screen">
      <ConnectivityBanner />
      <Text>Inicio Administrador</Text>
    </View>
  ),
};

describe('Pruebas Integradas: Servicios, Sesión y Navegación', () => {
  beforeEach(() => {
    resetStores();
    useConnectivityStore.getState().reset();
    mockedLogin.mockReset();
    mockedGetOrders.mockReset();
    mockedGetVehicles.mockReset();
  });

  afterEach(() => {
    cleanup();
    jest.useRealTimers();
  });

  it('1. Servicio ➔ Sesión ➔ Navegación: Login exitoso autentica y permite navegación a dashboard de cliente', async () => {
    const authData = mockAuthResponses.cliente;
    mockedLogin.mockResolvedValueOnce(authData);

    // Ejecutamos el login a través de la capa de store vinculada al servicio
    await act(async () => {
      await useAuthStore.getState().login({
        email: 'cliente@tallerconnect.cl',
        password: 'password123',
      });
    });

    const state = useAuthStore.getState();
    expect(mockedLogin).toHaveBeenCalledWith({
      email: 'cliente@tallerconnect.cl',
      password: 'password123',
    });
    expect(state.isAuthenticated).toBe(true);
    expect(state.role).toBe('cliente');
    expect(state.token).toBe(authData.token);

    // El router con sesión activa renderiza el dashboard de cliente
    const router = renderRouterWithProviders(routes, { initialUrl: '/cliente' });
    await router;

    await waitFor(() => {
      expect(screen.getByText('Inicio Cliente')).toBeTruthy();
    });
    expect(router.getPathname()).toBe('/cliente');
  });

  it('2. Sesión activa ➔ Consumo de Servicios: Mecánico consulta órdenes autenticado', async () => {
    const mechanicAuth = mockAuthResponses.mecanico;
    mockedGetOrders.mockResolvedValueOnce([
      {
        id: 'ot-101',
        vehicleId: 'veh-1',
        intakeId: 'ing-1',
        createdById: 'usr-3',
        status: 'en_reparacion',
        assignedMechanicId: mechanicAuth.user.id,
        createdAt: '2026-03-01T09:00:00.000Z',
        updatedAt: '2026-03-05T14:00:00.000Z',
      },
    ]);

    // Establecemos la sesión del mecánico antes de montar la vista
    const router = renderRouterWithProviders(routes, {
      initialUrl: '/mecanico',
      initialAuthState: {
        user: mechanicAuth.user,
        token: mechanicAuth.token,
        role: 'mecanico',
        isAuthenticated: true,
        isLoading: false,
      },
    });
    await router;

    await waitFor(() => {
      expect(screen.getByText('Inicio Mecánico')).toBeTruthy();
    });

    // Invocamos el servicio de órdenes con la sesión activa
    const orders = await ordersService.getOrders();

    expect(orders).toHaveLength(1);
    expect(orders[0].id).toBe('ot-101');
    expect(orders[0].status).toBe('en_reparacion');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(router.getPathname()).toBe('/mecanico');
  });

  it('3. Expiración/Cierre de Sesión ➔ Navegación: Logout devuelve al usuario a /login', async () => {
    const clientAuth = mockAuthResponses.cliente;

    // Iniciar con sesión activa en pantalla de cliente
    const router = renderRouterWithProviders(routes, {
      initialUrl: '/cliente',
      initialAuthState: {
        user: clientAuth.user,
        token: clientAuth.token,
        role: 'cliente',
        isAuthenticated: true,
        isLoading: false,
      },
    });
    await router;

    await waitFor(() => {
      expect(screen.getByText('Inicio Cliente')).toBeTruthy();
    });

    // Disparar logout
    await act(async () => {
      await useAuthStore.getState().logout();
    });

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().token).toBeNull();

    // Verificamos que al navegar a /login se muestre la pantalla de login
    await act(async () => {
      expoRouter.replace('/login');
    });

    await waitFor(() => {
      expect(screen.getByText('Pantalla Iniciar Sesión')).toBeTruthy();
    });
    expect(router.getPathname()).toBe('/login');
  });

  it('4. Consumo de Vehículos: Cliente autenticado consulta sus vehículos', async () => {
    const clientAuth = mockAuthResponses.cliente;
    mockedGetVehicles.mockResolvedValueOnce([
      {
        id: 'veh-001',
        plate: 'BB-CC-11',
        brand: 'Toyota',
        model: 'Corolla',
        year: 2020,
        mileage: 45000,
        ownerId: clientAuth.user.id,
      },
    ]);

    const router = renderRouterWithProviders(routes, {
      initialUrl: '/cliente',
      initialAuthState: {
        user: clientAuth.user,
        token: clientAuth.token,
        role: 'cliente',
        isAuthenticated: true,
        isLoading: false,
      },
    });
    await router;

    await waitFor(() => {
      expect(screen.getByText('Inicio Cliente')).toBeTruthy();
    });

    const vehicles = await vehiclesService.getVehicles();
    expect(vehicles).toHaveLength(1);
    expect(vehicles[0].plate).toBe('BB-CC-11');
    expect(mockedGetVehicles).toHaveBeenCalled();
  });

  it('5. Resiliencia de Red: Pérdida de conectividad activa banner sin destruir la sesión ni la navegación', async () => {
    const adminAuth = mockAuthResponses.administrador;

    const router = renderRouterWithProviders(routes, {
      initialUrl: '/administrador',
      initialAuthState: {
        user: adminAuth.user,
        token: adminAuth.token,
        role: 'administrador',
        isAuthenticated: true,
        isLoading: false,
      },
    });
    await router;

    await waitFor(() => {
      expect(screen.getByText('Inicio Administrador')).toBeTruthy();
    });

    // Se produce una caída de red o timeout
    await act(async () => {
      useConnectivityStore
        .getState()
        .setNetworkIssue('Tiempo de espera agotado al consultar la API Gateway.');
    });

    // El usuario permanece en su pantalla (NO es expulsado) y se muestra el banner global
    expect(screen.getByText('Inicio Administrador')).toBeTruthy();
    expect(
      screen.getByText('Tiempo de espera agotado al consultar la API Gateway.')
    ).toBeTruthy();
    expect(screen.getByTestId('connectivity-retry-button')).toBeTruthy();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    // Al reintentar exitosamente y limpiar el problema, el banner desaparece
    await act(async () => {
      useConnectivityStore.getState().clearNetworkIssue();
    });

    expect(screen.queryByTestId('connectivity-banner')).toBeNull();
  });
});