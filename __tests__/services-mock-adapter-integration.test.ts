import {
  MockVehicleAdapter,
  ServiceError,
  VehiclesService,
} from '@/services/vehicles.service';
import {
  MockOrderAdapter,
  OrdersService,
} from '@/services/orders.service';

describe('Integración de Servicios con Adaptador Simulado (VehicleService + OrderService)', () => {
  let vehicleService: VehiclesService;
  let orderService: OrdersService;

  beforeEach(() => {
    vehicleService = new VehiclesService(new MockVehicleAdapter());
    orderService = new OrdersService(new MockOrderAdapter());
  });

  it('1. Flujo completo extremo a extremo: Registrar vehículo → Actualizar kilometraje → Crear orden → Asignar mecánico → Avanzar estados → Consultar historial', async () => {
    // Paso 1: Cliente registra un nuevo vehículo
    const createdVehicle = await vehicleService.createVehicle({
      patente: 'st-uv-88',
      marca: 'Subaru',
      modelo: 'Forester',
      anio: 2023,
      kilometraje: 12000,
      owner_id: 'usr-001',
    });

    expect(createdVehicle.plate).toBe('ST-UV-88');
    expect(createdVehicle.brand).toBe('Subaru');
    expect(createdVehicle.ownerId).toBe('usr-001');

    // Paso 2: El cliente actualiza el kilometraje del vehículo (PATCH simulado)
    const updatedVehicle = await vehicleService.updateVehicle(createdVehicle.id, {
      kilometraje: 14500,
    });
    expect(updatedVehicle.mileage).toBe(14500);

    // Paso 3: Consultar vehículos filtrando por patente y propietario
    const filteredVehicles = await vehicleService.getVehicles({
      patente: 'ST-UV',
      cliente_id: 'usr-001',
    });
    expect(filteredVehicles).toHaveLength(1);
    expect(filteredVehicles[0].id).toBe(createdVehicle.id);

    // Paso 4: Administrador crea una orden de trabajo para ese vehículo
    const createdOrder = await orderService.createOrder({
      vehiculo_id: createdVehicle.id,
      cliente_id: 'usr-003',
      description: 'Mantención de 15.000 km y revisión de frenos',
    });

    expect(createdOrder.vehicleId).toBe(createdVehicle.id);
    expect(createdOrder.createdById).toBe('usr-003');
    expect(createdOrder.status).toBe('esperando_diagnostico');

    // Paso 5: Administrador asigna un mecánico responsable a la orden
    const assignedOrder = await orderService.assignMechanic(createdOrder.id, {
      mecanico_id: 'usr-002',
      observacion: 'Asignado a especialista Subaru',
    });
    expect(assignedOrder.assignedMechanicId).toBe('usr-002');

    // Paso 6: Mecánico consulta sus órdenes asignadas usando parámetros de consulta
    const mechanicOrders = await orderService.getOrders({
      assignedMechanicId: 'usr-002',
      vehicleId: createdVehicle.id,
    });
    expect(mechanicOrders).toHaveLength(1);
    expect(mechanicOrders[0].id).toBe(createdOrder.id);

    // Paso 7: Mecánico avanza el estado de la orden a en_reparacion y luego a listo_para_entrega
    const inRepairOrder = await orderService.updateOrderStatus(
      createdOrder.id,
      'en_reparacion'
    );
    expect(inRepairOrder.status).toBe('en_reparacion');

    const readyOrder = await orderService.updateOrderStatus(
      createdOrder.id,
      'listo_para_entrega'
    );
    expect(readyOrder.status).toBe('listo_para_entrega');

    // Paso 8: Consultar el historial de transiciones de la orden
    const history = await orderService.getOrderHistory(createdOrder.id);
    expect(history).toHaveLength(3);
    expect(history[0].estado_nuevo).toBe(2); // esperando_diagnostico
    expect(history[1].estado_nuevo).toBe(5); // en_reparacion
    expect(history[2].estado_nuevo).toBe(6); // listo_para_entrega
  });

  it('2. Validación y normalización de errores en el adaptador simulado (404, 409 y 422)', async () => {
    // Registrar un vehículo válido
    await vehicleService.createVehicle({
      patente: 'DUP-123',
      marca: 'Mazda',
      modelo: 'CX-5',
    });

    // Intentar registrar la misma patente debe lanzar ServiceError con código 409
    await expect(
      vehicleService.createVehicle({
        patente: 'dup-123',
        marca: 'Mazda',
        modelo: 'CX-5',
      })
    ).rejects.toMatchObject({
      name: 'ServiceError',
      status: 409,
      code: 'VEHICLE_CONFLICT',
      domain: 'vehicles',
    });

    // Consultar un vehículo inexistente debe lanzar ServiceError 404
    await expect(
      vehicleService.getVehicleById('veh-inexistente')
    ).rejects.toMatchObject({
      name: 'ServiceError',
      status: 404,
      code: 'VEHICLE_NOT_FOUND',
      domain: 'vehicles',
    });

    // Crear orden sin vehiculo_id debe lanzar ServiceError 422
    await expect(
      orderService.createOrder({ vehiculo_id: '' })
    ).rejects.toMatchObject({
      name: 'ServiceError',
      status: 422,
      code: 'ORDER_VALIDATION_ERROR',
      domain: 'orders',
    });

    // Una orden en estado terminal (entregado) no permite más cambios de estado (409)
    const order = await orderService.createOrder({
      vehiculo_id: 'veh-001',
      cliente_id: 'usr-001',
    });
    await orderService.updateOrderStatus(order.id, 'entregado');

    try {
      await orderService.updateOrderStatus(order.id, 'en_reparacion');
      fail('Debió rechazar la transición desde un estado terminal');
    } catch (error) {
      expect(error).toBeInstanceOf(ServiceError);
      expect((error as ServiceError).status).toBe(409);
      expect((error as ServiceError).code).toBe('ORDER_CONFLICT');
    }
  });
});
