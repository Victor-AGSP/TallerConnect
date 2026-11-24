import { cleanup, renderWithProviders, screen, waitFor } from '../test-utils';
import AdministradorScreen from '@/app/(admin)/administrador';
import ClienteScreen from '@/app/(cliente)/cliente';
import MecanicoScreen from '@/app/(mecanico)/mecanico';
import { ENV, isMockModeEnabled } from '@/config/env';
import { mapOrderResponse } from '@/mappers/order.mapper';
import { mapVehicleResponse } from '@/mappers/vehicle.mapper';
import { orderResponsePayloads } from '@/mocks/payloads/order.payload';
import { vehicleResponsePayloads } from '@/mocks/payloads/vehicle.payload';
import { notificationsService } from '@/services/notifications.service';
import { ordersService } from '@/services/orders.service';
import { vehiclesService } from '@/services/vehicles.service';

/**
 * SCRUM-163 — Detección de cifras hardcodeadas en el entorno real.
 *
 * 1. Estático: ninguna pantalla importa mocks ni snapshots con cifras, y las
 *    cifras de negocio literales solo existen en archivos que las protegen con
 *    `ENV.USE_DEMO_DATA`.
 * 2. Ejecución: con la configuración real (demo desactivada) ninguna pantalla
 *    de inicio por rol muestra marcadores de datos ficticios.
 * 3. Dinámico: las métricas cambian cuando cambia la respuesta del servicio, y
 *    un fallo de consulta no se presenta como «0».
 * Los valores de presentación (tamaños, colores, porcentajes, timeouts) no son
 * datos de negocio y no deben confundirse con ellos.
 */

jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));
jest.mock('@/services/orders.service', () => ({ ordersService: { getOrders: jest.fn() } }));
jest.mock('@/services/vehicles.service', () => ({ vehiclesService: { getVehicles: jest.fn() } }));
jest.mock('@/services/notifications.service', () => ({
  notificationsService: { getNotifications: jest.fn() },
}));

// Sin @types/node en el proyecto: mismo patrón que microservices-audit.test.ts,
// con tipos mínimos en lugar de `any`.
declare const require: (id: string) => unknown;
declare const __dirname: string;
const fs = require('fs') as {
  readFileSync(file: string, encoding: 'utf8'): string;
  readdirSync(dir: string, options: { withFileTypes: true }): { name: string; isDirectory(): boolean }[];
};
const path = require('path') as {
  resolve(...segments: string[]): string;
  join(...segments: string[]): string;
  relative(from: string, to: string): string;
};

const ROOT: string = path.resolve(__dirname, '..');
const UI_DIRS = ['src/app', 'src/components'];

/** Marcadores de datos de negocio inventados (montos CLP, OT, patentes, conteos fijos). */
const BUSINESS_FIGURE_MARKERS: [string, RegExp][] = [
  ['monto CLP literal', /\$\d{1,3}(?:\.\d{3})+/],
  ['código de orden literal', /\bOT-\d{5}\b/],
  ['patente literal', /\b[A-Z]{2}-[A-Z]{2}-\d{2}\b/],
  ['conteo literal en métrica', /\bvalue="\d+"/],
  ['conteo literal de archivos', /\b\d+ archivos disponibles\b/],
];

function findBusinessFigures(text: string): string[] {
  return BUSINESS_FIGURE_MARKERS.filter(([, regex]) => regex.test(text)).map(([name]) => name);
}

function listUiFiles(): string[] {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.tsx?$/.test(entry.name)) files.push(full);
    }
  };
  UI_DIRS.forEach((dir) => walk(path.join(ROOT, dir)));
  return files;
}

type RenderedNode = { props?: { accessibilityLabel?: unknown }; children?: (RenderedNode | string)[] | null };

/** Texto visible y etiquetas accesibles del árbol renderizado (lo que percibe el usuario). */
function renderedText(): string {
  const parts: string[] = [];
  const visit = (node: RenderedNode | RenderedNode[] | string | null) => {
    if (node === null) return;
    if (typeof node === 'string') return void parts.push(node);
    if (Array.isArray(node)) return node.forEach(visit);
    const label = node.props?.accessibilityLabel;
    if (typeof label === 'string') parts.push(label);
    (node.children ?? []).forEach(visit);
  };
  visit(screen.toJSON() as RenderedNode | RenderedNode[] | null);
  return parts.join('\n');
}

const getOrders = jest.mocked(ordersService.getOrders);
const getVehicles = jest.mocked(vehiclesService.getVehicles);

beforeEach(() => {
  jest.resetAllMocks();
  getOrders.mockResolvedValue([]);
  getVehicles.mockResolvedValue([]);
  jest.mocked(notificationsService.getNotifications).mockResolvedValue([]);
});

describe('Detección estática en pantallas y componentes', () => {
  const files = listUiFiles();

  it('recorre las pantallas reales del proyecto', () => {
    expect(files.length).toBeGreaterThan(30);
  });

  it('ninguna pantalla importa mocks ni el snapshot fijo del panel de administración', () => {
    const offenders = files.filter((file) => {
      const source = fs.readFileSync(file, 'utf8');
      return /from '@\/mocks|INITIAL_ADMIN_DASHBOARD_DATA/.test(source);
    });
    expect(offenders.map((file) => path.relative(ROOT, file))).toEqual([]);
  });

  it('las cifras de negocio literales solo aparecen en archivos protegidos por ENV.USE_DEMO_DATA', () => {
    const offenders = files
      .map((file) => {
        const source = fs.readFileSync(file, 'utf8');
        const figures = findBusinessFigures(source);
        const gated = /ENV\.USE_DEMO_DATA\s*\?/.test(source);
        return { file: path.relative(ROOT, file), figures, gated };
      })
      .filter(({ figures, gated }) => figures.length > 0 && !gated);
    expect(offenders).toEqual([]);
  });

  it('control positivo: detecta las cifras de las vistas de demostración protegidas', () => {
    const gatedWithFigures = files
      .filter((file) => {
        const source = fs.readFileSync(file, 'utf8');
        return findBusinessFigures(source).length > 0 && /ENV\.USE_DEMO_DATA\s*\?/.test(source);
      })
      .map((file) => path.relative(ROOT, file));
    expect(gatedWithFigures).toEqual(
      expect.arrayContaining(['src/app/(cliente)/cliente.tsx', 'src/app/(mecanico)/mecanico.tsx']),
    );
  });

  it('no confunde valores de presentación o configuración con datos de negocio', () => {
    const presentation = [
      'fontSize: 30', "width: '48%'", "borderColor: '#444444'", 'DEFAULT_TIMEOUT_MS = 15000',
      'minHeight: 92', "accessibilityLabel={`${label}: ${value}`}", 'Paso 1 de 4',
    ];
    presentation.forEach((sample) => expect(findBusinessFigures(sample)).toEqual([]));
    expect(findBusinessFigures('value="12"')).toEqual(['conteo literal en métrica']);
    expect(findBusinessFigures('Total: $125.000')).toEqual(['monto CLP literal']);
  });
});

describe('Configuración real', () => {
  it('la demostración está desactivada sin banderas explícitas y exige ambas', () => {
    expect(ENV.USE_DEMO_DATA).toBe(false);
    expect(isMockModeEnabled(undefined, undefined)).toBe(false);
    expect(isMockModeEnabled('false', 'false')).toBe(false);
  });

  it.each([
    ['Cliente', ClienteScreen],
    ['Mecánico', MecanicoScreen],
    ['Administrador', AdministradorScreen],
  ])('la pantalla de inicio de %s no muestra cifras ficticias', async (_role, Screen) => {
    await renderWithProviders(<Screen />);
    await waitFor(() => expect(screen.queryByText(/Cargando/)).toBeNull());
    expect(findBusinessFigures(renderedText())).toEqual([]);
    expect(renderedText()).not.toMatch(/demostración/i);
  });
});

describe('Métricas dinámicas del panel de administración', () => {
  const vehicles = Object.values(vehicleResponsePayloads).map(mapVehicleResponse);
  const orders = Object.values(orderResponsePayloads).map(mapOrderResponse);

  async function renderAdmin() {
    await renderWithProviders(<AdministradorScreen />);
    await waitFor(() => expect(screen.queryByText(/Cargando/)).toBeNull());
  }

  it('reflejan la respuesta del servicio y cambian cuando esta cambia', async () => {
    getVehicles.mockResolvedValueOnce(vehicles);
    getOrders.mockResolvedValueOnce(orders);
    await renderAdmin();
    const active = orders.filter((o) => o.status !== 'entregado' && o.status !== 'cancelado');
    expect(screen.getByLabelText(`Vehículos registrados: ${vehicles.length}`)).toBeTruthy();
    expect(screen.getByLabelText(`Órdenes activas: ${active.length}`)).toBeTruthy();
    await cleanup();

    getVehicles.mockResolvedValueOnce(vehicles.slice(0, 1));
    getOrders.mockResolvedValueOnce(orders.slice(0, 1));
    await renderAdmin();
    expect(screen.getByLabelText('Vehículos registrados: 1')).toBeTruthy();
    expect(screen.getByLabelText('Órdenes activas: 1')).toBeTruthy();
  });

  it('un fallo de órdenes muestra «No disponible», no un conteo 0 inventado', async () => {
    getVehicles.mockResolvedValueOnce(vehicles);
    getOrders.mockRejectedValueOnce(new Error('Error interno en el servidor.'));
    await renderAdmin();
    for (const label of ['Órdenes activas', 'Pendientes de aprobación', 'Mecánicos asignados']) {
      expect(screen.getByLabelText(`${label}: No disponible`)).toBeTruthy();
      expect(screen.queryByLabelText(`${label}: 0`)).toBeNull();
    }
    expect(screen.getByLabelText(`Vehículos registrados: ${vehicles.length}`)).toBeTruthy();
  });

  it('un fallo de vehículos muestra «No disponible» solo en su métrica', async () => {
    getVehicles.mockRejectedValueOnce(new Error('Error interno en el servidor.'));
    getOrders.mockResolvedValueOnce([]);
    await renderAdmin();
    expect(screen.getByLabelText('Vehículos registrados: No disponible')).toBeTruthy();
    // Una lista de órdenes válida y vacía sí es un 0 legítimo.
    expect(screen.getByLabelText('Órdenes activas: 0')).toBeTruthy();
  });
});
