import { mapOrderStatusUpdateRequest } from '@/mappers/order.mapper';
import {
  mockOrderStatusUpdateRequests,
  type OrderStatusUpdateCase,
} from '@/mocks/order-status-updates.mock';
import { orderResponsePayloads } from '@/mocks/payloads/order.payload';
import { orderStatusUpdatePayloads } from '@/mocks/payloads/order-status-update.payload';
import { apiClient } from '@/services/api/client';
import { ordersService } from '@/services/orders.service';

jest.mock('@/services/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    put: jest.fn(),
  },
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;
const cases = Object.keys(mockOrderStatusUpdateRequests) as OrderStatusUpdateCase[];
const CONTRACT_FIELDS = ['estado_destino', 'observacion'];

describe('Serialización de solicitudes de cambio de estado (CambioEstadoSolicitud)', () => {
  describe('modelo de la app → cuerpo del contrato', () => {
    it.each(cases)('%s: el mapper produce el cuerpo esperado', (key) => {
      expect(mapOrderStatusUpdateRequest(mockOrderStatusUpdateRequests[key])).toEqual(
        orderStatusUpdatePayloads[key]
      );
    });

    it.each(cases)('%s: el cuerpo solo contiene campos del contrato', (key) => {
      const body = mapOrderStatusUpdateRequest(mockOrderStatusUpdateRequests[key]);
      Object.keys(body).forEach((field) => expect(CONTRACT_FIELDS).toContain(field));
    });
  });

  describe('cuerpo JSON enviado', () => {
    it('omite la observación cuando no se indica', () => {
      expect(
        JSON.stringify(mapOrderStatusUpdateRequest(mockOrderStatusUpdateRequests.solicitarRepuestos))
      ).toBe('{"estado_destino":4}');
    });

    it('envía la observación null cuando se indica explícitamente', () => {
      expect(
        JSON.stringify(mapOrderStatusUpdateRequest(mockOrderStatusUpdateRequests.marcarListo))
      ).toBe('{"estado_destino":6,"observacion":null}');
    });

    it('envía la observación de texto tal cual', () => {
      expect(
        JSON.stringify(mapOrderStatusUpdateRequest(mockOrderStatusUpdateRequests.cancelarConObservacion))
      ).toBe('{"estado_destino":8,"observacion":"El cliente desiste de la reparación"}');
    });

    it('no completa la observación de una cancelación: la exigencia la valida MS2 (422)', () => {
      expect(
        JSON.stringify(mapOrderStatusUpdateRequest(mockOrderStatusUpdateRequests.cancelarSinObservacion))
      ).toBe('{"estado_destino":8}');
    });
  });

  describe('envío mediante OrdersService', () => {
    const orderId = String(orderResponsePayloads.en_reparacion.orden_id);

    beforeEach(() => {
      jest.clearAllMocks();
      ordersService.useRealAdapter();
    });

    it.each(cases)('%s: PATCH /ordenes/{orden_id}/estado con el cuerpo esperado', async (key) => {
      mockedApiClient.patch.mockResolvedValueOnce({
        data: orderResponsePayloads.en_reparacion,
      } as never);
      const { targetStatus, observation } = mockOrderStatusUpdateRequests[key];

      await ordersService.updateOrderStatus(orderId, targetStatus, observation);

      expect(mockedApiClient.patch).toHaveBeenCalledWith(
        `/ordenes/${orderId}/estado`,
        orderStatusUpdatePayloads[key]
      );
    });
  });
});