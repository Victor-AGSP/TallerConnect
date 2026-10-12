import { StyleSheet } from 'react-native';

import {
  cleanup,
  fireEvent,
  renderRouterWithProviders,
  resetStores,
  screen,
  waitFor,
} from '../test-utils';
import OrdenScreen from '@/app/(admin)/ordenes/[id]';
import MiOrdenScreen from '@/app/(cliente)/mis-ordenes/[id]';
import OrdenAsignadaScreen from '@/app/(mecanico)/ordenes-asignadas/[id]';
import {
  ORDER_STATUS,
  getOrderStatusLabel,
  type WorkOrderStatus,
} from '@/constants/orderStatus';
import { colors } from '@/constants/theme';
import type { WorkOrder } from '@/models/order.model';
import { ordersService } from '@/services/orders.service';

/**
 * Regresión del flujo orden → presupuesto → repuestos en la app.
 *
 * Cubre lo que hoy existe en el proyecto: los estados del flujo definidos en
 * `ORDER_STATUS` y su propagación desde OrdersService hasta las vistas de
 * detalle de los tres roles, incluida la transición 3 → 4 / 5 que el
 * contrato de MS2 documenta para la aprobación del presupuesto.
 *
 * La relación con presupuestos y repuestos depende de MS3, que no tiene
 * contrato ni servicio en la app; esas comprobaciones quedan pendientes
 * (`it.todo`). Ver docs/integracion-cruzada-ordenes.md.
 */

jest.mock('@/services/orders.service', () => ({
  ordersService: {
    getOrderById: jest.fn(),
  },
}));

const mockedService = jest.mocked(ordersService);

const routes = {
  '(cliente)/mis-ordenes/[id]': MiOrdenScreen,
  '(mecanico)/ordenes-asignadas/[id]': OrdenAsignadaScreen,
  '(admin)/ordenes/[id]': OrdenScreen,
};

function orderWith(status: WorkOrderStatus): WorkOrder {
  return {
    id: 'ot-00126',
    vehicleId: 'veh-001',
    intakeId: 'ing-003',
    status,
    assignedMechanicId: 'usr-002',
    clientId: 'usr-001',
    createdById: 'usr-003',
    createdAt: '2026-03-04T08:00:00.000Z',
    updatedAt: '2026-03-04T08:00:00.000Z',
  };
}

function statusPill(status: WorkOrderStatus) {
  return screen.getByLabelText(
    `Estado de la orden: ${getOrderStatusLabel(status)}`,
  );
}

function backgroundOf(element: ReturnType<typeof statusPill>) {
  return StyleSheet.flatten(element.props.style).backgroundColor;
}

/** Espera a que la actualización termine para no solaparse con la prueba siguiente. */
async function waitForRefreshToSettle() {
  await waitFor(() =>
    expect(
      screen.getByTestId('order-detail-refresh').props.accessibilityState,
    ).toMatchObject({ busy: false }),
  );
}

async function renderOrder(path = '/ordenes/ot-00126') {
  await renderRouterWithProviders(routes, { initialUrl: path });

  await waitFor(() =>
    expect(screen.getByTestId('order-detail-ot-00126')).toBeTruthy(),
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  resetStores();
});

afterEach(() => cleanup());

describe('flujo orden → presupuesto → repuestos: representación de estados', () => {
  it.each([
    [ORDER_STATUS.ESPERANDO_DIAGNOSTICO, colors.infoSoft],
    [ORDER_STATUS.ESPERANDO_APROBACION_PRESUPUESTO, colors.warningSoft],
    [ORDER_STATUS.PAUSADO_POR_PRESUPUESTO_RECHAZADO, colors.dangerSoft],
    [ORDER_STATUS.ESPERANDO_REPUESTOS, colors.warningSoft],
    [ORDER_STATUS.EN_REPARACION, colors.warningSoft],
  ] as const)(
    'muestra el estado %s con su etiqueta y tono',
    async (status, background) => {
      mockedService.getOrderById.mockResolvedValueOnce(orderWith(status));

      await renderOrder();

      expect(backgroundOf(statusPill(status))).toBe(background);
    },
  );

  it.each([
    ['cliente', '/mis-ordenes/ot-00126'],
    ['mecánico', '/ordenes-asignadas/ot-00126'],
    ['administración', '/ordenes/ot-00126'],
  ] as const)(
    'la vista de %s muestra la espera de aprobación del presupuesto',
    async (_role, path) => {
      mockedService.getOrderById.mockResolvedValueOnce(
        orderWith(ORDER_STATUS.ESPERANDO_APROBACION_PRESUPUESTO),
      );

      await renderOrder(path);

      expect(
        statusPill(ORDER_STATUS.ESPERANDO_APROBACION_PRESUPUESTO),
      ).toBeTruthy();
      expect(mockedService.getOrderById).toHaveBeenCalledWith('ot-00126');
    },
  );
});

describe('flujo orden → presupuesto → repuestos: propagación de cambios', () => {
  it.each([
    ['esperando repuestos', ORDER_STATUS.ESPERANDO_REPUESTOS],
    ['en reparación', ORDER_STATUS.EN_REPARACION],
  ] as const)(
    'al actualizar refleja el paso de la aprobación del presupuesto a %s',
    async (_label, nextStatus) => {
      mockedService.getOrderById
        .mockResolvedValueOnce(
          orderWith(ORDER_STATUS.ESPERANDO_APROBACION_PRESUPUESTO),
        )
        .mockResolvedValueOnce({
          ...orderWith(nextStatus),
          updatedAt: '2026-03-06T10:00:00.000Z',
        });

      await renderOrder();

      await fireEvent.press(screen.getByRole('button', { name: 'Actualizar' }));

      await waitFor(() => expect(statusPill(nextStatus)).toBeTruthy());
      await waitForRefreshToSettle();

      expect(
        screen.queryByLabelText(
          `Estado de la orden: ${getOrderStatusLabel(
            ORDER_STATUS.ESPERANDO_APROBACION_PRESUPUESTO,
          )}`,
        ),
      ).toBeNull();
      expect(
        screen.getByLabelText('Última actualización: 06-03-2026'),
      ).toBeTruthy();
      expect(mockedService.getOrderById).toHaveBeenCalledTimes(2);
    },
  );

  it('propaga un error al actualizar y recupera el estado siguiente al reintentar', async () => {
    mockedService.getOrderById
      .mockResolvedValueOnce(
        orderWith(ORDER_STATUS.ESPERANDO_APROBACION_PRESUPUESTO),
      )
      .mockRejectedValueOnce(
        new Error('Backend no disponible o sin conexión a internet.'),
      )
      .mockResolvedValueOnce(orderWith(ORDER_STATUS.ESPERANDO_REPUESTOS));

    await renderOrder();

    await fireEvent.press(screen.getByRole('button', { name: 'Actualizar' }));

    await waitFor(() =>
      expect(screen.getByTestId('order-detail-error')).toBeTruthy(),
    );
    expect(
      screen.getByText('Backend no disponible o sin conexión a internet.'),
    ).toBeTruthy();

    // Un error no debe dejar visible un estado que ya no se pudo confirmar.
    expect(screen.queryByTestId('order-detail-ot-00126')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));

    await waitFor(() =>
      expect(statusPill(ORDER_STATUS.ESPERANDO_REPUESTOS)).toBeTruthy(),
    );
    await waitForRefreshToSettle();
    expect(mockedService.getOrderById).toHaveBeenCalledTimes(3);
  });
});

describe('flujo orden → presupuesto → repuestos: dependencias pendientes', () => {
  // MS3 sin contrato ni servicio en la app.
  it.todo('asocia la orden con su presupuesto');
  it.todo('asocia el presupuesto aprobado con los repuestos requeridos');
  // Mapper y servicio de órdenes (C1 y C2 en docs/integracion-cruzada-ordenes.md).
  it.todo('propaga los códigos 3 → 4 / 5 del contrato hasta la vista');
  it.todo('registra el cambio de estado mediante PATCH /ordenes/{id}/estado');
});
