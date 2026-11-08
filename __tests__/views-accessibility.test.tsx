import {
  renderRouterWithProviders,
  renderWithProviders,
  resetStores,
  screen,
} from '../test-utils';
import AdministradorScreen from '@/app/(admin)/administrador';
import ClienteScreen from '@/app/(cliente)/cliente';
import MecanicoScreen from '@/app/(mecanico)/mecanico';
import { ordersService } from '@/services/orders.service';
import { vehiclesService } from '@/services/vehicles.service';
import { mapOrderResponse } from '@/mappers/order.mapper';
import { mapVehicleResponse } from '@/mappers/vehicle.mapper';
import { orderResponsePayloads } from '@/mocks/payloads/order.payload';
import { vehicleResponsePayloads } from '@/mocks/payloads/vehicle.payload';
import { StatusPill } from '@/components/ui/StatusPill';
import { useAuthStore } from '@/stores/authStore';
import { mockAuthResponses } from '@/mocks/auth.mock';

/**
 * Accesibilidad de las vistas principales de vehículo y orden.
 *
 * Verifica que la información que antes se comunicaba solo de forma visual
 * (color del estado, pares etiqueta/valor sueltos, glifos decorativos)
 * quede expuesta correctamente a las tecnologías de asistencia.
 */

async function renderScreen(
  path: '/cliente' | '/mecanico' | '/administrador',
) {
  const router = renderRouterWithProviders(
    {
      '(cliente)/cliente': ClienteScreen,
      '(mecanico)/mecanico': MecanicoScreen,
      '(admin)/administrador': AdministradorScreen,
    },
    { initialUrl: path },
  );

  await router;
  if (path === '/administrador') {
    await screen.findByRole('header', { name: 'Panel del taller' });
  }

  return router;
}

beforeEach(() => resetStores());

describe('StatusPill', () => {
  it('se anuncia como texto usando su etiqueta visible', async () => {
    const view = await renderWithProviders(
      <StatusPill label="En reparación" tone="warning" />,
    );

    const pill = view.getByLabelText('En reparación');

    expect(pill.props.accessibilityRole).toBe('text');
  });

  it('permite describir el estado con una etiqueta explícita', async () => {
    const view = await renderWithProviders(
      <StatusPill
        label="Aprobado"
        tone="success"
        accessibilityLabel="Estado del presupuesto: Aprobado"
      />,
    );

    expect(
      view.getByLabelText('Estado del presupuesto: Aprobado'),
    ).toBeTruthy();
  });
});

describe('vista de vehículo y orden del cliente', () => {
  it('expone el título principal y los títulos de tarjeta como encabezados', async () => {
    await renderScreen('/cliente');

    expect(screen.getByRole('header', { name: 'Mi taller' })).toBeTruthy();
    expect(
      screen.getByRole('header', { name: 'Vehículo en servicio' }),
    ).toBeTruthy();
    expect(
      screen.getByRole('header', { name: 'Seguimiento de la orden' }),
    ).toBeTruthy();
    expect(
      screen.getByRole('header', { name: 'Orden de trabajo' }),
    ).toBeTruthy();
  });

  it('describe el estado del vehículo y del presupuesto sin depender del color', async () => {
    await renderScreen('/cliente');

    expect(
      screen.getByLabelText('Estado del vehículo: En reparación'),
    ).toBeTruthy();
    expect(
      screen.getByLabelText('Estado del presupuesto: Aprobado'),
    ).toBeTruthy();
  });

  it('comunica el estado de cada etapa del seguimiento como texto', async () => {
    await renderScreen('/cliente');

    expect(
      screen.getByLabelText(
        'Etapa: Vehículo recibido. Registro completado. Estado: Completado',
      ),
    ).toBeTruthy();
    expect(
      screen.getByLabelText(
        'Etapa: Reparación. Trabajo actualmente en curso. Estado: En curso',
      ),
    ).toBeTruthy();
    expect(
      screen.getByLabelText('Etapa: Entrega. Pendiente. Estado: Pendiente'),
    ).toBeTruthy();
  });

  it('agrupa los datos del vehículo y de la orden en una sola etiqueta', async () => {
    await renderScreen('/cliente');

    expect(screen.getByLabelText('Patente: AB-CD-12')).toBeTruthy();
    expect(
      screen.getByLabelText('Servicio: Mantención preventiva'),
    ).toBeTruthy();
    expect(screen.getByLabelText('Total estimado: $125.000')).toBeTruthy();
    expect(screen.getByLabelText('Presupuesto: $125.000')).toBeTruthy();
    expect(screen.getByLabelText('Número: OT-00124')).toBeTruthy();
    expect(screen.getByLabelText('Técnico: Mecánico asignado')).toBeTruthy();
  });

  it('oculta el icono decorativo de evidencias a los lectores de pantalla', async () => {
    await renderScreen('/cliente');

    // Queda fuera del árbol de accesibilidad: solo es alcanzable
    // incluyendo explícitamente los elementos ocultos.
    expect(screen.queryByTestId('cliente-media-icon')).toBeNull();

    const decoration = screen.getByTestId('cliente-media-icon', {
      includeHiddenElements: true,
    });

    expect(decoration.props.accessible).toBe(false);
    expect(decoration.props.accessibilityElementsHidden).toBe(true);
    expect(decoration.props.importantForAccessibility).toBe(
      'no-hide-descendants',
    );
  });

  it('mantiene el cierre de sesión como control accesible y enfocable', async () => {
    await renderScreen('/cliente');

    const logout = screen.getByRole('button', { name: 'Cerrar sesión' });

    expect(logout.props.accessibilityState).toMatchObject({
      disabled: false,
      busy: false,
    });
  });
});

describe('vista real de órdenes del mecánico', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: { ...mockAuthResponses.mecanico.user, id: '2' },
    });

    jest.spyOn(ordersService, 'getOrders').mockResolvedValue([
      mapOrderResponse(orderResponsePayloads.en_reparacion),
      mapOrderResponse(orderResponsePayloads.listo_para_entrega),
      mapOrderResponse(orderResponsePayloads.entregado),
      mapOrderResponse(orderResponsePayloads.recibido),
    ]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('expone encabezados y órdenes consultadas al servicio', async () => {
    await renderScreen('/mecanico');

    expect(
      screen.getByRole('header', { name: 'Mis órdenes' })
    ).toBeTruthy();

    expect(
      screen.getByRole('header', { name: 'Mis órdenes recientes' })
    ).toBeTruthy();

    expect(
      await screen.findByRole('button', { name: 'Abrir orden 105' })
    ).toBeTruthy();

    expect(ordersService.getOrders).toHaveBeenCalledTimes(1);
  });

  it('calcula estadísticas desde órdenes asignadas', async () => {
    await renderScreen('/mecanico');

    await screen.findByRole('button', { name: 'Abrir orden 105' });

    expect(
      screen.getByLabelText('Órdenes asignadas: 3')
    ).toBeTruthy();

    expect(
      screen.getByLabelText('Órdenes activas: 2')
    ).toBeTruthy();

    expect(
      screen.getByLabelText('En reparación: 1')
    ).toBeTruthy();

    expect(
      screen.getByLabelText('Listas para entrega: 1')
    ).toBeTruthy();
  });

  it('solo muestra órdenes del mecánico autenticado', async () => {
    await renderScreen('/mecanico');

    expect(
      await screen.findByRole('button', { name: 'Abrir orden 105' })
    ).toBeTruthy();

    expect(
      screen.getByRole('button', { name: 'Abrir orden 106' })
    ).toBeTruthy();

    expect(
      screen.queryByRole('button', { name: 'Abrir orden 101' })
    ).toBeNull();

    expect(
      screen.queryByText('OT-00124')
    ).toBeNull();

    expect(
      screen.queryByText('Cliente de demostración')
    ).toBeNull();
  });

  it('mantiene accesibles los controles funcionales', async () => {
    await renderScreen('/mecanico');

    await screen.findByRole('button', { name: 'Abrir orden 105' });

    for (const name of [
      'Ver mis órdenes asignadas',
      'Ver repuestos y proveedores',
      'Ver vehículos asignados',
      'Cerrar sesión',
    ]) {
      expect(
        screen.getByRole('button', { name })
      ).toBeTruthy();
    }
  });

  it('muestra estado vacío sin inventar órdenes', async () => {
    jest.mocked(ordersService.getOrders).mockResolvedValueOnce([]);

    await renderScreen('/mecanico');

    expect(
      await screen.findByText('Sin órdenes asignadas')
    ).toBeTruthy();

    expect(
      screen.getByLabelText('Órdenes asignadas: 0')
    ).toBeTruthy();

    expect(
      screen.queryByRole('button', { name: 'Abrir orden 105' })
    ).toBeNull();
  });

  it('informa errores cuando el backend falla', async () => {
    jest.mocked(ordersService.getOrders).mockRejectedValueOnce(
      new Error('Servicio de órdenes no disponible')
    );

    await renderScreen('/mecanico');

    expect(
      await screen.findByText('Servicio de órdenes no disponible')
    ).toBeTruthy();

    expect(
      screen.getByRole('button', { name: 'Reintentar' })
    ).toBeTruthy();
  });
});

describe('vista de vehículos y órdenes del administrador', () => {
  beforeEach(() => {
    jest.spyOn(ordersService, 'getOrders').mockResolvedValue([
      mapOrderResponse(orderResponsePayloads.en_reparacion),
      mapOrderResponse(orderResponsePayloads.esperando_aprobacion_presupuesto),
    ]);
    jest.spyOn(vehiclesService, 'getVehicles').mockResolvedValue([
      mapVehicleResponse(vehicleResponsePayloads.completo),
    ]);
  });
  afterEach(() => jest.restoreAllMocks());
  it('expone los títulos de la vista como encabezados', async () => {
    await renderScreen('/administrador');

    expect(
      screen.getByRole('header', { name: 'Panel del taller' }),
    ).toBeTruthy();
    expect(
      screen.getByRole('header', { name: 'Resumen general' }),
    ).toBeTruthy();
    expect(
      screen.getByRole('header', { name: 'Órdenes recientes' }),
    ).toBeTruthy();
  });

  it('agrupa cada orden con su patente y estado', async () => {
    await renderScreen('/administrador');

    expect(
      screen.getByLabelText(
        'Orden OT 105. Patente ABCD12. Estado: En reparación',
      ),
    ).toBeTruthy();
    expect(
      screen.getByLabelText(
        'Orden OT 103. Patente ABCD12. Estado: Esperando aprobación del presupuesto',
      ),
    ).toBeTruthy();
  });

  it('agrupa el resumen por estado, los mecánicos y las aprobaciones pendientes', async () => {
    await renderScreen('/administrador');

    expect(screen.getByLabelText('Órdenes activas: 2')).toBeTruthy();
    expect(screen.getByLabelText('Mecánicos asignados: 1')).toBeTruthy();
    expect(screen.getByLabelText('Pendientes de aprobación: 1')).toBeTruthy();
    expect(screen.getByLabelText('Vehículos registrados: 1')).toBeTruthy();
    for (const name of ['Ver vehículos registrados', 'Inventario', 'Ver repuestos', 'Ver proveedores', 'Cerrar sesión']) {
      expect(screen.getByRole('button', { name })).toBeTruthy();
    }
  });
});
