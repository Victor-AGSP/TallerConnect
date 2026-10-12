import { router } from 'expo-router';

import {
  act,
  cleanup,
  fireEvent,
  renderRouterWithProviders,
  resetStores,
  screen,
  waitFor,
} from '../test-utils';
import AdministradorScreen from '@/app/(admin)/administrador';
import VehiculosScreen from '@/app/(admin)/vehiculos';
import ClienteScreen from '@/app/(cliente)/cliente';
import MisVehiculosScreen from '@/app/(cliente)/mis-vehiculos';
import MecanicoScreen from '@/app/(mecanico)/mecanico';
import VehiculosAsignadosScreen from '@/app/(mecanico)/vehiculos-asignados';
import { vehiclesService } from '@/services/vehicles.service';
import type { Vehicle } from '@/models/vehicle.model';

jest.mock('@/services/vehicles.service', () => ({
  vehiclesService: {
    getVehicles: jest.fn(),
    getMyVehicles: jest.fn(),
    getAssignedVehicles: jest.fn(),
  },
}));

const mockedService = jest.mocked(vehiclesService);

/**
 * Integración del listado de vehículos con VehiclesService.
 *
 * Cada rol consulta su propio endpoint a través del servicio y la vista
 * representa los tres resultados posibles: datos, lista vacía y error.
 */

const routes = {
  '(cliente)/cliente': ClienteScreen,
  '(cliente)/mis-vehiculos': MisVehiculosScreen,
  '(mecanico)/mecanico': MecanicoScreen,
  '(mecanico)/vehiculos-asignados': VehiculosAsignadosScreen,
  '(admin)/administrador': AdministradorScreen,
  '(admin)/vehiculos': VehiculosScreen,
};

const vehicles: Vehicle[] = [
  {
    id: 'veh-001',
    plate: 'ABCD12',
    brand: 'Toyota',
    model: 'Corolla',
    year: 2019,
    mileage: 85120,
    ownerId: 'usr-001',
  },
  {
    id: 'veh-002',
    plate: 'EFGH34',
    brand: 'Chevrolet',
    model: 'Sail',
    year: null,
    mileage: null,
    ownerId: 'usr-001',
  },
];

/** Cada vista con el método del servicio que debe consultar. */
const SCREENS = [
  {
    name: 'cliente',
    path: '/mis-vehiculos',
    title: 'Mis vehículos',
    method: 'getMyVehicles',
    emptyMessage: 'Todavía no tienes vehículos registrados en el taller.',
  },
  {
    name: 'mecánico',
    path: '/vehiculos-asignados',
    title: 'Vehículos asignados',
    method: 'getAssignedVehicles',
    emptyMessage: 'No tienes vehículos asignados en este momento.',
  },
  {
    name: 'administración',
    path: '/vehiculos',
    title: 'Vehículos registrados',
    method: 'getVehicles',
    emptyMessage: 'Todavía no hay vehículos registrados en el sistema.',
  },
] as const;

beforeEach(() => {
  jest.clearAllMocks();
  resetStores();
});

// El estado de navegación es global: se desmonta cada árbol para que las
// pruebas que navegan no afecten al render siguiente.
afterEach(() => cleanup());

describe('listado de vehículos: consulta al servicio', () => {
  it.each(SCREENS)(
    'la vista de $name consulta $method y representa los vehículos recibidos',
    async ({ path, title, method }) => {
      mockedService[method].mockResolvedValueOnce(vehicles);

      const router = renderRouterWithProviders(routes, { initialUrl: path });
      await router;

      await waitFor(() =>
        expect(screen.getByTestId('vehicle-card-veh-001')).toBeTruthy(),
      );

      expect(mockedService[method]).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('header', { name: title })).toBeTruthy();

      // Datos formateados y expuestos de forma accesible.
      expect(
        screen.getByLabelText(
          'Vehículo AB·CD·12. Toyota Corolla. Año: 2019. Kilometraje: 85.120 km',
        ),
      ).toBeTruthy();
      expect(
        screen.getByLabelText(
          'Vehículo EF·GH·34. Chevrolet Sail. Año: Sin año. Kilometraje: Sin kilometraje',
        ),
      ).toBeTruthy();

      expect(screen.queryByTestId('vehicle-list-empty')).toBeNull();
      expect(screen.queryByTestId('vehicle-list-error')).toBeNull();
    },
  );

  it('no consulta el endpoint de otro rol', async () => {
    mockedService.getMyVehicles.mockResolvedValueOnce([]);

    const router = renderRouterWithProviders(routes, {
      initialUrl: '/mis-vehiculos',
    });
    await router;

    await waitFor(() =>
      expect(screen.getByTestId('vehicle-list-empty')).toBeTruthy(),
    );

    expect(mockedService.getVehicles).not.toHaveBeenCalled();
    expect(mockedService.getAssignedVehicles).not.toHaveBeenCalled();
  });
});

describe('listado de vehículos: estado de carga', () => {
  it('muestra el indicador de carga mientras el servicio responde', async () => {
    let resolveQuery: (value: Vehicle[]) => void = () => {};

    mockedService.getMyVehicles.mockReturnValueOnce(
      new Promise<Vehicle[]>((resolve) => {
        resolveQuery = resolve;
      }),
    );

    const router = renderRouterWithProviders(routes, {
      initialUrl: '/mis-vehiculos',
    });
    await router;

    expect(screen.getByTestId('vehicle-list-loading')).toBeTruthy();
    expect(screen.queryByTestId('vehicle-card-veh-001')).toBeNull();

    resolveQuery(vehicles);

    await waitFor(() =>
      expect(screen.getByTestId('vehicle-card-veh-001')).toBeTruthy(),
    );
    expect(screen.queryByTestId('vehicle-list-loading')).toBeNull();
  });
});

describe('listado de vehículos: resultados vacíos', () => {
  it.each(SCREENS)(
    'la vista de $name informa cuando no hay vehículos',
    async ({ path, method, emptyMessage }) => {
      mockedService[method].mockResolvedValueOnce([]);

      const router = renderRouterWithProviders(routes, { initialUrl: path });
      await router;

      await waitFor(() =>
        expect(screen.getByTestId('vehicle-list-empty')).toBeTruthy(),
      );

      expect(screen.getByText(emptyMessage)).toBeTruthy();
      expect(screen.queryByTestId('vehicle-list-error')).toBeNull();
    },
  );
});

describe('listado de vehículos: errores', () => {
  it.each(SCREENS)(
    'la vista de $name muestra el mensaje de error propagado por el servicio',
    async ({ path, method }) => {
      mockedService[method].mockRejectedValueOnce(
        new Error('No fue posible cargar los vehículos.'),
      );

      const router = renderRouterWithProviders(routes, { initialUrl: path });
      await router;

      await waitFor(() =>
        expect(screen.getByTestId('vehicle-list-error')).toBeTruthy(),
      );

      expect(
        screen.getByText('No fue posible cargar los vehículos.'),
      ).toBeTruthy();
      expect(screen.queryByTestId('vehicle-list-empty')).toBeNull();
      expect(screen.queryByTestId('vehicle-card-veh-001')).toBeNull();
    },
  );

  it('usa un mensaje propio si el error no aporta ninguno', async () => {
    mockedService.getMyVehicles.mockRejectedValueOnce(new Error(''));

    const router = renderRouterWithProviders(routes, {
      initialUrl: '/mis-vehiculos',
    });
    await router;

    await waitFor(() =>
      expect(screen.getByTestId('vehicle-list-error')).toBeTruthy(),
    );

    expect(
      screen.getByText('No fue posible cargar los vehículos.'),
    ).toBeTruthy();
  });
});

describe('listado de vehículos: acceso desde cada panel', () => {
  /**
   * El estado de navegación de Expo Router es global al proceso, por lo que
   * las tres comprobaciones comparten un único árbol y se desplazan entre
   * paneles con el router de la aplicación.
   */
  it('cada panel ofrece un control que abre su propio listado', async () => {
    mockedService.getMyVehicles.mockResolvedValue([]);
    mockedService.getAssignedVehicles.mockResolvedValue([]);
    mockedService.getVehicles.mockResolvedValue([]);

    const testRouter = renderRouterWithProviders(routes, {
      initialUrl: '/cliente',
    });
    await testRouter;

    fireEvent.press(screen.getByRole('button', { name: 'Ver mis vehículos' }));
    await waitFor(() =>
      expect(testRouter.getPathname()).toBe('/mis-vehiculos'),
    );

    await act(async () => {
      router.replace('/mecanico');
    });
    await waitFor(() => expect(testRouter.getPathname()).toBe('/mecanico'));

    fireEvent.press(
      screen.getByRole('button', { name: 'Ver vehículos asignados' }),
    );
    await waitFor(() =>
      expect(testRouter.getPathname()).toBe('/vehiculos-asignados'),
    );

    await act(async () => {
      router.replace('/administrador');
    });
    await waitFor(() =>
      expect(testRouter.getPathname()).toBe('/administrador'),
    );

    fireEvent.press(
      screen.getByRole('button', { name: 'Ver vehículos registrados' }),
    );
    await waitFor(() => expect(testRouter.getPathname()).toBe('/vehiculos'));
  });
});
