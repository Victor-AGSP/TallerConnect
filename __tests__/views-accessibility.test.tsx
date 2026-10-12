import {
  renderRouterWithProviders,
  renderWithProviders,
  resetStores,
  screen,
} from '../test-utils';
import AdministradorScreen from '@/app/(admin)/administrador';
import ClienteScreen from '@/app/(cliente)/cliente';
import MecanicoScreen from '@/app/(mecanico)/mecanico';
import { StatusPill } from '@/components/ui/StatusPill';

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

describe('vista de órdenes del mecánico', () => {
  it('expone los títulos de la vista como encabezados', async () => {
    await renderScreen('/mecanico');

    expect(screen.getByRole('header', { name: 'Mis órdenes' })).toBeTruthy();
    expect(screen.getByRole('header', { name: 'OT-00124' })).toBeTruthy();
    expect(
      screen.getByRole('header', { name: 'Progreso de la orden' }),
    ).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Otras órdenes' })).toBeTruthy();
  });

  it('describe el estado de la orden y de sus etapas sin depender del color', async () => {
    await renderScreen('/mecanico');

    expect(
      screen.getByLabelText('Estado de la orden: En reparación'),
    ).toBeTruthy();
    expect(
      screen.getByLabelText('Etapa: Reparación. En curso. Estado: En curso'),
    ).toBeTruthy();
    expect(
      screen.getByLabelText('Etapa: Entrega. Pendiente. Estado: Pendiente'),
    ).toBeTruthy();
  });

  it('agrupa cada orden del listado con su vehículo y estado', async () => {
    await renderScreen('/mecanico');

    expect(
      screen.getByLabelText(
        'Orden OT-00125. Vehículo EF-GH-34. Estado: Diagnóstico',
      ),
    ).toBeTruthy();
    expect(
      screen.getByLabelText(
        'Orden OT-00128. Vehículo XY-ZW-90. Estado: Finalizado',
      ),
    ).toBeTruthy();
  });

  it('agrupa las métricas y los detalles de la orden', async () => {
    await renderScreen('/mecanico');

    expect(screen.getByLabelText('Órdenes asignadas: 5')).toBeTruthy();
    expect(screen.getByLabelText('Trabajo: Mantención preventiva')).toBeTruthy();
    expect(screen.getByLabelText('Órdenes completadas: 12')).toBeTruthy();
  });

  it('no anuncia como botones las tarjetas de acción que aún no tienen acción asociada', async () => {
    await renderScreen('/mecanico');

    const action = screen.getByLabelText('Acción 01: Actualizar estado');

    expect(action.props.accessibilityRole).toBe('text');
    expect(
      screen.queryByRole('button', { name: 'Acción 01: Actualizar estado' }),
    ).toBeNull();
  });
});

describe('vista de vehículos y órdenes del administrador', () => {
  it('expone los títulos de la vista como encabezados', async () => {
    await renderScreen('/administrador');

    expect(
      screen.getByRole('header', { name: 'Panel del taller' }),
    ).toBeTruthy();
    expect(
      screen.getByRole('header', { name: 'Estado de las órdenes' }),
    ).toBeTruthy();
    expect(
      screen.getByRole('header', { name: 'Vehículos en atención' }),
    ).toBeTruthy();
  });

  it('agrupa cada orden con su patente y estado', async () => {
    await renderScreen('/administrador');

    expect(
      screen.getByLabelText(
        'Orden OT-00124. Patente AB-CD-12. Estado: En reparación',
      ),
    ).toBeTruthy();
    expect(
      screen.getByLabelText(
        'Orden OT-00127. Patente XY-ZW-90. Estado: Listo para entrega',
      ),
    ).toBeTruthy();
  });

  it('agrupa el resumen por estado, los mecánicos y las aprobaciones pendientes', async () => {
    await renderScreen('/administrador');

    expect(screen.getByLabelText('En reparación: 4')).toBeTruthy();
    expect(
      screen.getByLabelText(
        'Mecánico de demostración. 3 órdenes asignadas. Estado: Activo',
      ),
    ).toBeTruthy();
    expect(
      screen.getByLabelText(
        'Orden OT-00126. Vehículo IJ-KL-56. Monto $185.000. Pendiente de aprobación',
      ),
    ).toBeTruthy();
    expect(screen.getByLabelText('Vehículos registrados: 32')).toBeTruthy();
  });
});
