import { Text } from 'react-native';

import {
  act,
  cleanup,
  fireEvent,
  renderRouterWithProviders,
  resetStores,
  screen,
  waitFor,
} from '../test-utils';
import AdminLayout from '@/app/(admin)/_layout';
import AdministradorScreen from '@/app/(admin)/administrador';
import ProveedorScreen from '@/app/(admin)/proveedores/[id]';
import ProveedoresScreen from '@/app/(admin)/proveedores/index';
import RepuestosScreen from '@/app/(admin)/repuestos';
import AuthLayout from '@/app/(auth)/_layout';
import ClienteLayout from '@/app/(cliente)/_layout';
import MecanicoLayout from '@/app/(mecanico)/_layout';
import type { UserRole } from '@/constants/roles';
import { mockUserByRole } from '@/mocks/users.mock';
import type { SparePart, SupplierDetail } from '@/models/parts.model';
import { partsService } from '@/services/parts.service';

jest.mock('@/services/parts.service', () => ({
  partsService: {
    getSpareParts: jest.fn(),
    getSuppliers: jest.fn(),
    getSupplierById: jest.fn(),
  },
}));

const mockedService = jest.mocked(partsService);

/**
 * Integración de las vistas de repuestos y proveedores con PartsService.
 *
 * Se usan las pantallas y layouts reales (RoleGuard); solo se simula el
 * servicio. Las respuestas del MS3 frente al cliente HTTP se cubren en
 * `parts-service.test.ts`.
 */

/** Pantallas del administrador, sin layouts: navegación y estados de datos. */
const screenRoutes = {
  '(admin)/administrador': AdministradorScreen,
  '(admin)/repuestos': RepuestosScreen,
  '(admin)/proveedores/index': ProveedoresScreen,
  '(admin)/proveedores/[id]': ProveedorScreen,
};

/** Layouts reales (RoleGuard) de cada grupo: restricciones por rol. */
const guardedRoutes = {
  '(auth)/_layout': AuthLayout,
  '(auth)/login': () => <Text>Iniciar sesión</Text>,
  '(admin)/_layout': AdminLayout,
  '(admin)/administrador': () => <Text>Panel administrador</Text>,
  '(admin)/repuestos': RepuestosScreen,
  '(admin)/proveedores/index': ProveedoresScreen,
  '(admin)/proveedores/[id]': ProveedorScreen,
  '(cliente)/_layout': ClienteLayout,
  '(cliente)/cliente': () => <Text>Portal cliente</Text>,
  '(mecanico)/_layout': MecanicoLayout,
  '(mecanico)/mecanico': () => <Text>Panel mecánico</Text>,
};

const parts: SparePart[] = [
  {
    id: '7',
    name: 'Filtro de aceite',
    supplierId: '3',
    supplierName: 'Repuestos del Sur',
    stock: 12,
    ownThreshold: null,
    effectiveThreshold: 5,
    belowThreshold: false,
  },
  {
    id: '8',
    name: 'Bujía',
    supplierId: '3',
    supplierName: 'Repuestos del Sur',
    stock: 1,
    ownThreshold: 4,
    effectiveThreshold: 4,
    belowThreshold: true,
  },
];

const supplierDetail: SupplierDetail = {
  id: '3',
  name: 'Repuestos del Sur',
  contact: 'ventas@repuestosdelsur.cl',
  partsCount: 2,
  parts,
};

function sessionForRole(role: UserRole) {
  return {
    user: mockUserByRole[role],
    token: 'token-de-prueba',
    role,
    isAuthenticated: true,
    isLoading: false,
    isHydrated: true,
  };
}

let view: ReturnType<typeof renderRouterWithProviders>;

async function renderAs(role: UserRole, initialUrl: string) {
  view = renderRouterWithProviders(screenRoutes, {
    initialUrl,
    initialAuthState: sessionForRole(role),
  });
  await view;
}

async function renderGuarded(role: UserRole, initialUrl: string) {
  view = renderRouterWithProviders(guardedRoutes, {
    initialUrl,
    initialAuthState: sessionForRole(role),
  });
  await view;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

beforeEach(() => {
  jest.clearAllMocks();
  resetStores();
});

afterEach(() => {
  cleanup();
});

describe('Repuestos (administrador)', () => {
  it('muestra la carga y luego los repuestos con proveedor, stock y umbral', async () => {
    const pending = deferred<{ items: SparePart[]; total: number }>();
    mockedService.getSpareParts.mockReturnValueOnce(pending.promise);

    await renderAs('administrador', '/repuestos');

    await waitFor(() =>
      expect(screen.getByTestId('spare-part-list-loading')).toBeTruthy(),
    );

    await act(async () => {
      pending.resolve({ items: parts, total: 2 });
    });

    expect(screen.getByText('Filtro de aceite')).toBeTruthy();
    expect(screen.getByText('Bujía')).toBeTruthy();
    expect(screen.getByText('Stock bajo')).toBeTruthy();
    expect(screen.getByText('Umbral 4 (propio)')).toBeTruthy();
    expect(screen.getByText('Umbral 5 (general)')).toBeTruthy();
    expect(screen.getByLabelText(/Repuesto Bujía\. Proveedor: Repuestos del Sur\. Stock: 1/)).toBeTruthy();
    expect(mockedService.getSpareParts).toHaveBeenCalledTimes(1);
  });

  it('indica cuando el servidor tiene más repuestos que los recibidos', async () => {
    mockedService.getSpareParts.mockResolvedValueOnce({ items: parts, total: 120 });

    await renderAs('administrador', '/repuestos');

    await waitFor(() =>
      expect(screen.getByText('Mostrando 2 de 120 repuestos')).toBeTruthy(),
    );
  });

  it('muestra el estado vacío y permite actualizar', async () => {
    mockedService.getSpareParts
      .mockResolvedValueOnce({ items: [], total: 0 })
      .mockResolvedValueOnce({ items: parts, total: 2 });

    await renderAs('administrador', '/repuestos');

    await waitFor(() =>
      expect(screen.getByTestId('spare-part-list-empty')).toBeTruthy(),
    );

    await fireEvent.press(screen.getByText('Actualizar'));

    await waitFor(() =>
      expect(screen.getByText('Filtro de aceite')).toBeTruthy(),
    );
    expect(mockedService.getSpareParts).toHaveBeenCalledTimes(2);
  });

  it('muestra el error del servicio y se recupera con el reintento', async () => {
    mockedService.getSpareParts
      .mockRejectedValueOnce(new Error('Backend no disponible o sin conexión a internet. Revisa tu conexión.'))
      .mockResolvedValueOnce({ items: parts, total: 2 });

    await renderAs('administrador', '/repuestos');

    await waitFor(() =>
      expect(screen.getByTestId('spare-part-list-error')).toBeTruthy(),
    );
    expect(
      screen.getByText('Backend no disponible o sin conexión a internet. Revisa tu conexión.'),
    ).toBeTruthy();

    await fireEvent.press(screen.getByText('Reintentar'));

    await waitFor(() =>
      expect(screen.getByText('Bujía')).toBeTruthy(),
    );
  });

  it('actualiza manualmente los datos ya cargados', async () => {
    mockedService.getSpareParts
      .mockResolvedValueOnce({ items: [parts[0]], total: 1 })
      .mockResolvedValueOnce({ items: parts, total: 2 });

    await renderAs('administrador', '/repuestos');

    await waitFor(() =>
      expect(screen.getByText('Mostrando 1 de 1 repuestos')).toBeTruthy(),
    );

    await fireEvent.press(screen.getByTestId('spare-part-list-refresh'));

    await waitFor(() =>
      expect(screen.getByText('Mostrando 2 de 2 repuestos')).toBeTruthy(),
    );
  });
});

describe('Proveedores (administrador)', () => {
  it('lista los proveedores y abre el detalle con sus repuestos', async () => {
    mockedService.getSuppliers.mockResolvedValueOnce({
      items: [supplierDetail],
      total: 1,
    });
    mockedService.getSupplierById.mockResolvedValueOnce(supplierDetail);

    await renderAs('administrador', '/proveedores');

    await waitFor(() =>
      expect(screen.getByText('2 repuestos')).toBeTruthy(),
    );

    await fireEvent.press(screen.getByTestId('supplier-card-3'));

    await waitFor(() =>
      expect(screen.getByTestId('supplier-detail-3')).toBeTruthy(),
    );
    expect(view.getPathname()).toBe('/proveedores/3');
    expect(mockedService.getSupplierById).toHaveBeenCalledWith('3');
    expect(screen.getByText('ventas@repuestosdelsur.cl')).toBeTruthy();
    expect(screen.getByText('Filtro de aceite')).toBeTruthy();
    expect(screen.getByText('Bujía')).toBeTruthy();
  });

  it('muestra el estado vacío del listado', async () => {
    mockedService.getSuppliers.mockResolvedValueOnce({ items: [], total: 0 });

    await renderAs('administrador', '/proveedores');

    await waitFor(() =>
      expect(screen.getByTestId('supplier-list-empty')).toBeTruthy(),
    );
  });

  it('muestra el error del listado y se recupera con el reintento', async () => {
    mockedService.getSuppliers
      .mockRejectedValueOnce(new Error('Error interno en el servidor. Intenta nuevamente más tarde.'))
      .mockResolvedValueOnce({ items: [supplierDetail], total: 1 });

    await renderAs('administrador', '/proveedores');

    await waitFor(() =>
      expect(screen.getByTestId('supplier-list-error')).toBeTruthy(),
    );

    await fireEvent.press(screen.getByText('Reintentar'));

    await waitFor(() =>
      expect(screen.getByTestId('supplier-card-3')).toBeTruthy(),
    );
  });

  it('muestra un proveedor sin repuestos', async () => {
    mockedService.getSupplierById.mockResolvedValueOnce({
      ...supplierDetail,
      partsCount: 0,
      parts: [],
    });

    await renderAs('administrador', '/proveedores/3');

    await waitFor(() =>
      expect(screen.getByTestId('supplier-detail-no-parts')).toBeTruthy(),
    );
  });

  it('muestra el 404 de un proveedor inexistente con reintento', async () => {
    mockedService.getSupplierById.mockRejectedValueOnce(
      new Error('Proveedor inexistente'),
    );

    await renderAs('administrador', '/proveedores/999');

    await waitFor(() =>
      expect(screen.getByText('Proveedor inexistente')).toBeTruthy(),
    );
    expect(screen.getByText('Reintentar')).toBeTruthy();
  });
});

describe('Navegación desde el panel del administrador', () => {
  it.each([
    ['Ver repuestos', '/repuestos', 'spare-part-list-empty'],
    ['Ver proveedores', '/proveedores', 'supplier-list-empty'],
  ])('"%s" abre %s', async (button, path, testID) => {
    mockedService.getSpareParts.mockResolvedValue({ items: [], total: 0 });
    mockedService.getSuppliers.mockResolvedValue({ items: [], total: 0 });

    await renderAs('administrador', '/administrador');

    await waitFor(() => expect(screen.getByText(button)).toBeTruthy());
    await fireEvent.press(screen.getByText(button));

    await waitFor(() =>
      expect(screen.getByTestId(testID)).toBeTruthy(),
    );
    expect(view.getPathname()).toBe(path);
  });
});

describe('Restricciones de acceso por rol', () => {
  it.each(['/repuestos', '/proveedores', '/proveedores/3'])(
    'el administrador accede a %s a través de su layout',
    async (path) => {
      mockedService.getSpareParts.mockResolvedValueOnce({ items: [], total: 0 });
      mockedService.getSuppliers.mockResolvedValueOnce({ items: [], total: 0 });
      mockedService.getSupplierById.mockResolvedValueOnce(supplierDetail);

      await renderGuarded('administrador', path);

      await waitFor(() =>
        expect(screen.getByRole('header', { name: /Repuestos|Proveedores|Repuestos del Sur/ })).toBeTruthy(),
      );
      expect(view.getPathname()).toBe(path);
    },
  );

  it.each([
    ['cliente', '/repuestos', '/cliente', 'Portal cliente'],
    ['cliente', '/proveedores', '/cliente', 'Portal cliente'],
    ['cliente', '/proveedores/3', '/cliente', 'Portal cliente'],
    ['mecanico', '/repuestos', '/mecanico', 'Panel mecánico'],
    ['mecanico', '/proveedores', '/mecanico', 'Panel mecánico'],
    ['mecanico', '/proveedores/3', '/mecanico', 'Panel mecánico'],
  ] as const)(
    'el rol %s no accede a %s ni consulta el MS3',
    async (role, path, home, content) => {
      await renderGuarded(role, path);

      await waitFor(() => expect(view.getPathname()).toBe(home));
      expect(screen.getByText(content)).toBeTruthy();
      expect(mockedService.getSpareParts).not.toHaveBeenCalled();
      expect(mockedService.getSuppliers).not.toHaveBeenCalled();
      expect(mockedService.getSupplierById).not.toHaveBeenCalled();
    },
  );
});
