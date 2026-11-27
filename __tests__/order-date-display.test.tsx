import { cleanup, renderWithProviders } from '../test-utils';
import { OrderDetailView } from '@/components/orders/OrderDetailView';
import { ORDER_STATUS } from '@/constants/orderStatus';
import { mapOrderResponse } from '@/mappers/order.mapper';
import { ordersGatewayResponse } from '@/mocks/gateway/orders.gateway';
import type { WorkOrder } from '@/models/order.model';
import { formatDate } from '@/utils/formatters';

/**
 * Las fechas ISO usan horas cercanas al mediodía para que el día mostrado sea el mismo
 * en UTC y en la hora de Chile.
 */
const order: WorkOrder = {
  id: '1001',
  vehicleId: '101',
  intakeId: '201',
  status: ORDER_STATUS.EN_REPARACION,
  assignedMechanicId: null,
  createdById: '301',
  createdAt: '2026-10-12T14:30:00Z',
  updatedAt: '2026-10-15T12:00:00-03:00',
};

afterEach(() => cleanup());

describe('formatDate con fechas de órdenes', () => {
  it.each([
    ['ISO con zona UTC', '2026-10-12T14:30:00Z', '12-10-2026'],
    ['ISO con desfase horario', '2026-10-15T12:00:00-03:00', '15-10-2026'],
  ])('%s se muestra como fecha legible', (_caso, valor, esperado) => {
    expect(formatDate(valor)).toBe(esperado);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['texto vacío', ''],
  ])('un valor %s se muestra como "Sin fecha"', (_caso, valor) => {
    expect(formatDate(valor)).toBe('Sin fecha');
  });

  it.each(['no-es-fecha', '2026-13-40T00:00:00Z', '12/10/2026 a las 14:30'])(
    'la fecha no interpretable "%s" se muestra como "Sin fecha"',
    (valor) => {
      expect(formatDate(valor)).toBe('Sin fecha');
    }
  );
});

describe('Fechas imposibles en la respuesta de órdenes', () => {
  // new Date() normaliza un día inexistente al mes siguiente (30-02 pasa a 02-03), así que
  // formatDate no lo detecta; el esquema del mapper lo rechaza antes de llegar a la vista.
  it.each(['2026-02-30T10:00:00Z', '2026-04-31T10:00:00Z', '2026-02-29T10:00:00Z'])(
    'mapOrderResponse rechaza la fecha con día inexistente "%s"',
    (valor) => {
      expect(() =>
        mapOrderResponse({ ...ordersGatewayResponse[0], creado_en: valor })
      ).toThrow();
    }
  );

  it('mapOrderResponse acepta el 29 de febrero de un año bisiesto', () => {
    const orden = mapOrderResponse({
      ...ordersGatewayResponse[0],
      creado_en: '2028-02-29T12:00:00Z',
    });

    expect(formatDate(orden.createdAt)).toBe('29-02-2028');
  });
});

describe('Fechas en el detalle de la orden', () => {
  async function renderOrder(datos: WorkOrder) {
    return renderWithProviders(
      <OrderDetailView
        eyebrow="Detalle"
        orderId={datos.id}
        loadOrder={() => Promise.resolve(datos)}
      />
    );
  }

  it('muestra las fechas ISO de creación y actualización', async () => {
    const view = await renderOrder(order);

    expect(await view.findByLabelText('Fecha de creación: 12-10-2026')).toBeTruthy();
    expect(view.getByLabelText('Última actualización: 15-10-2026')).toBeTruthy();
  });

  it('una fecha no interpretable muestra "Sin fecha" y no "Invalid Date"', async () => {
    const view = await renderOrder({ ...order, createdAt: 'no-es-fecha' });

    expect(await view.findByLabelText('Fecha de creación: Sin fecha')).toBeTruthy();
    expect(view.getByLabelText('Última actualización: 15-10-2026')).toBeTruthy();
    expect(view.queryByText('Invalid Date')).toBeNull();
  });

  it('una fecha null muestra "Sin fecha" sin interrumpir el detalle', async () => {
    // Fuera de contrato: creado_en no admite null. Se fuerza el tipo para comprobar la vista.
    const view = await renderOrder({ ...order, createdAt: null as unknown as string });

    expect(await view.findByLabelText('Fecha de creación: Sin fecha')).toBeTruthy();
    expect(view.getByTestId('order-detail-1001')).toBeTruthy();
  });
});
