import { Text } from 'react-native';

import {
  cleanup,
  fireEvent,
  renderRouterWithProviders,
  renderWithProviders,
  resetStores,
  screen,
  waitFor,
} from '../test-utils';
import ClienteScreen from '@/app/(cliente)/cliente';
import {
  VEHICLE_ORDERS_ERROR_MESSAGE,
  VehicleDetailScreen,
} from '@/components/vehicles/VehicleDetailScreen';
import { VehicleListScreen } from '@/components/vehicles/VehicleListScreen';
import { VehicleListView } from '@/components/vehicles/VehicleListView';
import { mapOrderResponse } from '@/mappers/order.mapper';
import { mapVehicleResponse } from '@/mappers/vehicle.mapper';
import { orderResponsePayloads } from '@/mocks/payloads/order.payload';
import { vehicleResponsePayloads } from '@/mocks/payloads/vehicle.payload';
import type { WorkOrder } from '@/models/order.model';
import type { Vehicle } from '@/models/vehicle.model';
import { ordersService } from '@/services/orders.service';
import { vehiclesService } from '@/services/vehicles.service';

describe('Sprint 3 Semana 1 — Panel Mi taller, detalle de vehículo y datos nulos', () => {
  beforeEach(() => {
    resetStores();
  });

  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });

  describe('S3-AMP-S1-JUAN-01 / JUAN-02 / S3-S1: Panel Mi taller conectado a datos reales', () => {
    it('muestra el indicador de carga del resumen del cliente mientras se consultan los servicios', async () => {
      let resolveOrders: (value: WorkOrder[]) => void = () => {};
      jest.spyOn(ordersService, 'getOrders').mockReturnValueOnce(
        new Promise<WorkOrder[]>((resolve) => {
          resolveOrders = resolve;
        }),
      );
      jest.spyOn(vehiclesService, 'getMyVehicles').mockResolvedValueOnce([
        mapVehicleResponse(vehicleResponsePayloads.completo),
      ]);

      const router = renderRouterWithProviders(
        { '(cliente)/cliente': ClienteScreen },
        { initialUrl: '/cliente' },
      );
      await router;

      expect(screen.getByRole('header', { name: 'Mi taller' })).toBeTruthy();
      expect(screen.getByTestId('cliente-summary-loading')).toBeTruthy();
      expect(
        screen.getByText('Cargando resumen de tu taller...'),
      ).toBeTruthy();

      resolveOrders([mapOrderResponse(orderResponsePayloads.en_reparacion)]);

      await waitFor(() =>
        expect(screen.queryByTestId('cliente-summary-loading')).toBeNull(),
      );
      expect(screen.getByTestId('cliente-summary-metrics')).toBeTruthy();
    });

    it('navega al detalle de una orden real desde el resumen del cliente y elimina textos fijos', async () => {
      jest.spyOn(ordersService, 'getOrders').mockResolvedValue([
        mapOrderResponse(orderResponsePayloads.en_reparacion),
      ]);
      jest.spyOn(vehiclesService, 'getMyVehicles').mockResolvedValue([
        mapVehicleResponse(vehicleResponsePayloads.completo),
      ]);

      const router = renderRouterWithProviders(
        {
          '(cliente)/cliente': ClienteScreen,
          '(cliente)/mis-ordenes/[id]': () => (
            <Text>Detalle de mi orden real</Text>
          ),
        },
        { initialUrl: '/cliente' },
      );
      await router;

      const orderButton = await screen.findByRole('button', {
        name: 'Abrir orden 105',
      });
      expect(screen.queryByText('Información de demostración')).toBeNull();
      expect(screen.queryByText('AB-CD-12')).toBeNull();
      expect(screen.queryByText('$125.000')).toBeNull();
      expect(screen.queryByText('OT-00124')).toBeNull();

      await fireEvent.press(orderButton);

      await waitFor(() =>
        expect(screen.getByText('Detalle de mi orden real')).toBeTruthy(),
      );
      expect(screen).toHavePathname('/mis-ordenes/105');
    });
  });

  describe('S3-AMP-S1-JUAN-03 / S3-S1: Separar error y sin órdenes en el detalle de vehículo', () => {
    const sampleVehicle: Vehicle = mapVehicleResponse(
      vehicleResponsePayloads.completo,
    );

    it('muestra ErrorMessage específico de órdenes cuando falla ordersService y permite reintentar', async () => {
      jest.spyOn( console, 'error').mockImplementation(() => {});
      jest
        .spyOn(vehiclesService, 'getVehicleById')
        .mockResolvedValue(sampleVehicle);
      const getOrdersSpy = jest
        .spyOn(ordersService, 'getOrders')
        .mockRejectedValueOnce(new Error(''))
        .mockResolvedValueOnce([
          {
            ...mapOrderResponse(orderResponsePayloads.en_reparacion),
            vehicleId: String(sampleVehicle.id),
          },
        ]);

      await renderWithProviders(
        <VehicleDetailScreen
          role="cliente"
          vehicleId={String(sampleVehicle.id)}
        />,
      );

      expect(
        await screen.findByTestId('vehicle-detail-orders-error'),
      ).toBeTruthy();
      expect(screen.getByText(VEHICLE_ORDERS_ERROR_MESSAGE)).toBeTruthy();
      expect(
        screen.queryByTestId('vehicle-detail-orders-empty'),
      ).toBeNull();

      await fireEvent.press(
        screen.getByRole('button', { name: 'Reintentar órdenes' }),
      );

      await waitFor(() =>
        expect(
          screen.queryByTestId('vehicle-detail-orders-error'),
        ).toBeNull(),
      );
      expect(await screen.findByText('#105')).toBeTruthy();
      expect(getOrdersSpy).toHaveBeenCalledTimes(2);
    });

    it('muestra EmptyState solo cuando la consulta de órdenes tuvo éxito pero no hay órdenes asociadas', async () => {
      jest
        .spyOn(vehiclesService, 'getVehicleById')
        .mockResolvedValue(sampleVehicle);
      jest.spyOn(ordersService, 'getOrders').mockResolvedValueOnce([]);

      await renderWithProviders(
        <VehicleDetailScreen
          role="cliente"
          vehicleId={String(sampleVehicle.id)}
        />,
      );

      expect(
        await screen.findByTestId('vehicle-detail-orders-empty'),
      ).toBeTruthy();
      expect(
        screen.getByText(
          'Este vehículo no registra órdenes de trabajo asociadas.',
        ),
      ).toBeTruthy();
      expect(
        screen.queryByTestId('vehicle-detail-orders-error'),
      ).toBeNull();
    });
  });

  describe('S3-AMP-S1-JUAN-04 / S3-S1: Renderizado de datos nulos y textos extensos de vehículos', () => {
    const nullAndLongVehicle: Vehicle = {
      id: '99',
      ownerId: '4',
      plate: '   ',
      brand: '   ',
      model: '',
      year: null,
      mileage: null,
    };

    const extensiveTextVehicle: Vehicle = {
      id: '100',
      ownerId: '4',
      plate: 'PATENTEEXTENSA2026',
      brand: 'Fabricante Automotriz Internacional de Pruebas Extensas S.A.',
      model: 'Modelo Sedán Híbrido Ejecutivo Versión Extendida Especial',
      year: 2024,
      mileage: 128450,
    };

    it('renderiza fallbacks seguros ante datos nulos o en blanco en VehicleDetailScreen', async () => {
      jest
        .spyOn(vehiclesService, 'getVehicleById')
        .mockResolvedValueOnce(nullAndLongVehicle);
      jest.spyOn(ordersService, 'getOrders').mockResolvedValueOnce([]);

      await renderWithProviders(
        <VehicleDetailScreen role="administrador" vehicleId="99" />,
      );

      expect(await screen.findByText('Sin patente')).toBeTruthy();
      expect(screen.getAllByText('Sin información').length).toBeGreaterThanOrEqual(4);
      expect(screen.queryByText('null')).toBeNull();
      expect(screen.queryByText('undefined')).toBeNull();
      expect(screen.queryByText('NaN')).toBeNull();
    });

    it('renderiza textos extensos y valores nulos en VehicleListView y VehicleListScreen sin desbordar ni fallar', async () => {
      const loadVehicles = jest
        .fn()
        .mockResolvedValue([nullAndLongVehicle, extensiveTextVehicle]);

      await renderWithProviders(
        <VehicleListView
          eyebrow="Portal del cliente"
          title="Mis vehículos"
          subtitle="Listado"
          emptyMessage="Sin vehículos"
          loadVehicles={loadVehicles}
        />,
      );

      expect(await screen.findByTestId('vehicle-card-99')).toBeTruthy();
      expect(screen.getByTestId('vehicle-card-100')).toBeTruthy();
      expect(
        screen.getByLabelText(
          'Vehículo Sin patente. Marca y modelo no registrados. Año: Sin año. Kilometraje: Sin kilometraje',
        ),
      ).toBeTruthy();

      jest
        .spyOn(vehiclesService, 'getMyVehicles')
        .mockResolvedValueOnce([nullAndLongVehicle, extensiveTextVehicle]);

      await renderWithProviders(<VehicleListScreen role="cliente" />);

      expect(await screen.findByTestId('vehicles-list')).toBeTruthy();
      expect(screen.getByText('PATENTEEXTENSA2026')).toBeTruthy();
    });
  });
});

