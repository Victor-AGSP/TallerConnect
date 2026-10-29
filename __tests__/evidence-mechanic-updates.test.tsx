import * as ImagePicker from 'expo-image-picker';
import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';

import {
  act,
  cleanup,
  fireEvent,
  renderRouterWithProviders,
  resetStores,
  screen,
  waitFor,
} from '../test-utils';
import OrdenAsignadaScreen from '@/app/(mecanico)/ordenes-asignadas/[id]';
import { mockUserByRole } from '@/mocks/users.mock';
import type { Evidence } from '@/models/evidence.model';
import type { OrderLogEntry } from '@/models/order-log.model';
import type { WorkOrder, WorkOrderStatus } from '@/models/order.model';
import { apiClient } from '@/services/api/client';
import { evidenceService } from '@/services/evidence.service';
import { orderLogService, OrderLogService } from '@/services/order-log.service';
import { ordersService } from '@/services/orders.service';
import { STORAGE_KEYS, storage } from '@/utils/storage';

jest.mock('expo-image-picker', () => ({
  getCameraPermissionsAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock('@/services/orders.service', () => ({
  ordersService: { getOrderById: jest.fn(), updateOrderStatus: jest.fn() },
}));

jest.mock('@/services/evidence.service', () => ({
  evidenceService: { uploadEvidence: jest.fn() },
}));

// Las vistas usan la instancia simulada; las pruebas del servicio usan una
// instancia real de OrderLogService con el cliente HTTP real.
jest.mock('@/services/order-log.service', () => {
  const actual = jest.requireActual('@/services/order-log.service');
  return {
    OrderLogService: actual.OrderLogService,
    orderLogService: { getOrderLog: jest.fn(), addOrderLogEntry: jest.fn() },
  };
});

const picker = jest.mocked(ImagePicker);
const mockedOrders = jest.mocked(ordersService);
const mockedEvidence = jest.mocked(evidenceService);
const mockedLog = jest.mocked(orderLogService);

/**
 * SCRUM-107: actualizaciones del mecánico (bitácora MS2) integradas con la
 * orden y con la evidencia fotográfica (MS4).
 */

const LOG_DTO = {
  bitacora_id: 501,
  orden_id: 31,
  autor_usuario_id: 50,
  tipo: 'observacion',
  descripcion: 'Pastillas delanteras gastadas',
  creado_en: '2026-10-28T15:00:00Z',
  repuestos: [],
};

function entry(overrides: Partial<OrderLogEntry> = {}): OrderLogEntry {
  return {
    id: '501',
    orderId: '31',
    authorUserId: '50',
    type: 'observacion',
    description: 'Pastillas delanteras gastadas',
    createdAt: '2026-10-28T15:00:00Z',
    parts: [],
    ...overrides,
  };
}

function order(status: WorkOrderStatus = 'en_reparacion', id = '31'): WorkOrder {
  return {
    id,
    vehicleId: '12',
    intakeId: '18',
    createdById: '99',
    status,
    assignedMechanicId: '50',
    createdAt: '2026-10-09T10:00:00-03:00',
    updatedAt: '2026-10-09T12:00:00-03:00',
  };
}

const EVIDENCE: Evidence = {
  id: '7b0f3e0c-1d2a-4c3b-9e8f-0a1b2c3d4e5f',
  orderId: '31',
  budgetId: null,
  context: 'reparacion',
  fileKind: 'foto',
  visibleToClient: true,
  status: 'confirmada',
  originalName: 'avance.jpg',
  contentType: 'image/jpeg',
  sizeBytes: 2048,
  createdAt: '2026-10-28T15:01:00Z',
};

const PHOTO: ImagePicker.ImagePickerResult = {
  canceled: false,
  assets: [
    {
      uri: 'file:///cache/ImagePicker/avance.jpg',
      fileName: 'avance.jpg',
      fileSize: 2048,
      mimeType: 'image/jpeg',
      type: 'image',
      width: 800,
      height: 600,
    },
  ],
};

// ---------------------------------------------------------------------------
// Servicio con el cliente HTTP real
// ---------------------------------------------------------------------------

describe('OrderLogService (bitácora MS2)', () => {
  const service = new OrderLogService();
  const adapter = jest.fn<ReturnType<AxiosAdapter>, Parameters<AxiosAdapter>>();
  const originalAdapter = apiClient.defaults.adapter;

  function respond(config: InternalAxiosRequestConfig, status: number, data: unknown) {
    const response = { data, status, statusText: String(status), headers: {}, config };
    if (status >= 400) {
      return Promise.reject(
        new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_REQUEST', config, null, response),
      );
    }
    return Promise.resolve(response);
  }

  beforeEach(() => {
    adapter.mockReset();
    apiClient.defaults.adapter = adapter;
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest
      .spyOn(storage, 'get')
      .mockImplementation(async (key: string) =>
        key === STORAGE_KEYS.AUTH_TOKEN ? 'token-de-prueba' : null,
      );
  });

  afterEach(() => {
    jest.restoreAllMocks();
    apiClient.defaults.adapter = originalAdapter;
  });

  it('registra una observación con solo tipo y descripción: sin actor, estado ni fecha', async () => {
    adapter.mockImplementation((config) => respond(config, 201, LOG_DTO));

    const result = await service.addOrderLogEntry('31', {
      type: 'observacion',
      description: '  Pastillas delanteras gastadas  ',
    });

    const [config] = adapter.mock.calls[0];
    expect(config.method).toBe('post');
    expect(config.url).toBe('/ordenes/31/bitacora');
    expect(JSON.parse(config.data)).toEqual({
      tipo: 'observacion',
      descripcion: 'Pastillas delanteras gastadas',
    });
    expect(config.headers.Authorization).toBe('Bearer token-de-prueba');
    // La identidad y la fecha las devuelve el servidor.
    expect(result).toEqual(entry());
  });

  it('una descripción vacía no llega al servidor', async () => {
    await expect(
      service.addOrderLogEntry('31', { type: 'accion', description: '   ' }),
    ).rejects.toThrow('Describe el avance realizado.');
    expect(adapter).not.toHaveBeenCalled();
  });

  it('un identificador de orden inválido no llega al servidor', async () => {
    await expect(
      service.addOrderLogEntry('31;DROP', { type: 'accion', description: 'x' }),
    ).rejects.toThrow('El identificador de la orden no es válido.');
    expect(adapter).not.toHaveBeenCalled();
  });

  it.each([
    [403, 'Solo el mecánico asignado o un administrador pueden registrar avances en esta orden.'],
    [404, 'La orden no existe o no está asignada a tu usuario.'],
    [422, 'El tipo o la descripción del avance no son válidos.'],
  ])('traduce el %s del contrato', async (status, message) => {
    adapter.mockImplementation((config) => respond(config, status, {}));

    await expect(
      service.addOrderLogEntry('31', { type: 'observacion', description: 'x' }),
    ).rejects.toThrow(message);
  });

  it('rechaza una respuesta fuera del contrato o de otra orden', async () => {
    adapter
      .mockImplementationOnce((config) => respond(config, 201, { ok: true }))
      .mockImplementationOnce((config) => respond(config, 201, { ...LOG_DTO, orden_id: 32 }));

    for (let i = 0; i < 2; i += 1) {
      await expect(
        service.addOrderLogEntry('31', { type: 'observacion', description: 'x' }),
      ).rejects.toThrow('La respuesta de la bitácora de la orden no es válida.');
    }
  });

  it('no reintenta automáticamente el registro (no es idempotente)', async () => {
    adapter.mockImplementation((config) => respond(config, 503, {}));

    await expect(
      service.addOrderLogEntry('31', { type: 'observacion', description: 'x' }),
    ).rejects.toThrow();
    expect(adapter).toHaveBeenCalledTimes(1);
  });

  it('consulta la bitácora con repuestos y rechaza entradas de otra orden', async () => {
    adapter
      .mockImplementationOnce((config) =>
        respond(config, 200, [
          { ...LOG_DTO, tipo: 'accion', repuestos: [{ nombre: 'Pastilla', cantidad: 2 }] },
        ]),
      )
      .mockImplementationOnce((config) => respond(config, 200, [{ ...LOG_DTO, orden_id: 9 }]));

    await expect(service.getOrderLog('31')).resolves.toEqual([
      entry({ type: 'accion', parts: [{ name: 'Pastilla', quantity: 2 }] }),
    ]);
    expect(adapter.mock.calls[0][0].url).toBe('/ordenes/31/bitacora');

    await expect(service.getOrderLog('31')).rejects.toThrow(
      'La respuesta de la bitácora de la orden no es válida.',
    );
  });
});

// ---------------------------------------------------------------------------
// Vista del mecánico
// ---------------------------------------------------------------------------

const routes = { '(mecanico)/ordenes-asignadas/[id]': OrdenAsignadaScreen };

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function openOrder() {
  const view = renderRouterWithProviders(routes, {
    initialUrl: '/ordenes-asignadas/31',
    initialAuthState: {
      user: mockUserByRole.mecanico,
      token: 'token-de-prueba',
      role: 'mecanico',
      isAuthenticated: true,
      isLoading: false,
      isHydrated: true,
    },
  });
  await view;
  await waitFor(() => expect(screen.getByTestId('order-update-panel')).toBeTruthy());
  return view;
}

async function describeUpdate(text: string) {
  await fireEvent.changeText(screen.getByTestId('order-update-description'), text);
}

async function attachPhoto() {
  await fireEvent.press(screen.getByTestId('order-update-photo-pick-library'));
  await waitFor(() => expect(screen.getByTestId('order-update-photo-preview')).toBeTruthy());
}

function pressHandlerOf(testID: string): () => void {
  const host = screen.getByTestId(testID);
  const event = { nativeEvent: {}, target: host, currentTarget: host, stopPropagation: () => {} };
  return () => host.props.onClick(event);
}

describe('Avances del mecánico en la orden', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    resetStores();
    mockedOrders.getOrderById.mockResolvedValue(order());
    mockedLog.getOrderLog.mockResolvedValue([]);
    picker.launchImageLibraryAsync.mockResolvedValue(PHOTO);
  });

  afterEach(() => {
    cleanup();
  });

  it('abrir la orden no consulta la bitácora hasta que se pide', async () => {
    mockedLog.getOrderLog.mockResolvedValue([entry()]);
    await openOrder();

    expect(mockedLog.getOrderLog).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('order-log-show'));

    await waitFor(() => expect(screen.getByTestId('order-log-entry-501')).toBeTruthy());
    expect(mockedLog.getOrderLog).toHaveBeenCalledWith('31');
    expect(screen.getByText('Pastillas delanteras gastadas')).toBeTruthy();
    expect(screen.getByText(/Observación · .* · usuario 50/)).toBeTruthy();
  });

  it('registra un avance sin fotografía con la confirmación del servidor', async () => {
    mockedLog.addOrderLogEntry.mockResolvedValue(entry({ type: 'accion' }));
    mockedLog.getOrderLog.mockResolvedValue([entry({ type: 'accion' })]);
    await openOrder();

    await fireEvent.press(screen.getByTestId('order-update-type-accion'));
    await describeUpdate('Cambio de pastillas delanteras');
    await fireEvent.press(screen.getByTestId('order-update-submit'));

    await waitFor(() => expect(screen.getByTestId('order-update-success')).toBeTruthy());
    expect(screen.getByText('Avance registrado')).toBeTruthy();
    expect(mockedLog.addOrderLogEntry).toHaveBeenCalledWith('31', {
      type: 'accion',
      description: 'Cambio de pastillas delanteras',
    });
    expect(mockedEvidence.uploadEvidence).not.toHaveBeenCalled();
    // No cambia el estado de la orden.
    expect(mockedOrders.updateOrderStatus).not.toHaveBeenCalled();
    // Muestra el historial persistido y limpia el formulario.
    await waitFor(() => expect(screen.getByTestId('order-log-entry-501')).toBeTruthy());
    expect(screen.getByTestId('order-update-description').props.value).toBe('');
  });

  it('registra el avance y luego la fotografía, en ese orden', async () => {
    const calls: string[] = [];
    mockedLog.addOrderLogEntry.mockImplementation(async () => {
      calls.push('bitacora');
      return entry();
    });
    mockedEvidence.uploadEvidence.mockImplementation(async () => {
      calls.push('evidencia');
      return EVIDENCE;
    });
    await openOrder();

    await describeUpdate('Pastillas delanteras gastadas');
    await attachPhoto();
    await fireEvent.press(screen.getByTestId('order-update-photo-context-diagnostico'));
    await fireEvent.press(screen.getByTestId('order-update-submit'));

    await waitFor(() => expect(screen.getByText('Avance y fotografía registrados')).toBeTruthy());
    expect(calls).toEqual(['bitacora', 'evidencia']);
    expect(mockedEvidence.uploadEvidence).toHaveBeenCalledWith({
      orderId: '31',
      context: 'diagnostico',
      file: expect.objectContaining({ name: 'avance.jpg' }),
    });
    expect(screen.queryByTestId('order-update-photo-preview')).toBeNull();
  });

  it('si la fotografía falla informa el éxito parcial y reintenta solo la carga', async () => {
    mockedLog.addOrderLogEntry.mockResolvedValue(entry());
    mockedEvidence.uploadEvidence
      .mockRejectedValueOnce(new Error('El servicio de evidencias no está disponible. La fotografía no se guardó.'))
      .mockResolvedValueOnce(EVIDENCE);
    await openOrder();

    await describeUpdate('Pastillas delanteras gastadas');
    await attachPhoto();
    await fireEvent.press(screen.getByTestId('order-update-submit'));

    await waitFor(() => expect(screen.getByTestId('order-update-partial')).toBeTruthy());
    expect(screen.getByText('Avance registrado sin fotografía')).toBeTruthy();
    expect(screen.getByText(/la fotografía no se envió: El servicio de evidencias no está disponible/)).toBeTruthy();
    // No se informa éxito completo ni se permite reenviar el avance.
    expect(screen.queryByTestId('order-update-success')).toBeNull();
    expect(screen.queryByTestId('order-update-submit')).toBeNull();
    expect(screen.getByTestId('order-update-description').props.editable).toBe(false);

    await fireEvent.press(screen.getByTestId('order-update-retry-photo'));

    await waitFor(() => expect(screen.getByText('Avance y fotografía registrados')).toBeTruthy());
    expect(mockedLog.addOrderLogEntry).toHaveBeenCalledTimes(1);
    expect(mockedEvidence.uploadEvidence).toHaveBeenCalledTimes(2);
  });

  it('tras un fallo de la fotografía se puede continuar sin ella', async () => {
    mockedLog.addOrderLogEntry.mockResolvedValue(entry());
    mockedEvidence.uploadEvidence.mockRejectedValue(new Error('Sin conexión'));
    await openOrder();

    await describeUpdate('Pastillas delanteras gastadas');
    await attachPhoto();
    await fireEvent.press(screen.getByTestId('order-update-submit'));
    await waitFor(() => expect(screen.getByTestId('order-update-partial')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('order-update-skip-photo'));

    expect(screen.getByText('Avance registrado')).toBeTruthy();
    expect(screen.queryByTestId('order-update-photo-preview')).toBeNull();
    expect(mockedLog.addOrderLogEntry).toHaveBeenCalledTimes(1);
  });

  it('si el avance falla no sube la fotografía y conserva el formulario', async () => {
    mockedLog.addOrderLogEntry.mockRejectedValue(
      new Error('Solo el mecánico asignado o un administrador pueden registrar avances en esta orden.'),
    );
    await openOrder();

    await describeUpdate('Pastillas delanteras gastadas');
    await attachPhoto();
    await fireEvent.press(screen.getByTestId('order-update-submit'));

    await waitFor(() => expect(screen.getByTestId('order-update-error')).toBeTruthy());
    expect(
      screen.getByText('Solo el mecánico asignado o un administrador pueden registrar avances en esta orden.'),
    ).toBeTruthy();
    expect(mockedEvidence.uploadEvidence).not.toHaveBeenCalled();
    expect(screen.getByTestId('order-update-description').props.value).toBe(
      'Pastillas delanteras gastadas',
    );
    expect(screen.getByTestId('order-update-photo-preview')).toBeTruthy();
  });

  it('informa una orden inexistente o no asignada (404)', async () => {
    mockedLog.addOrderLogEntry.mockRejectedValue(
      new Error('La orden no existe o no está asignada a tu usuario.'),
    );
    await openOrder();

    await describeUpdate('Revisión');
    await fireEvent.press(screen.getByTestId('order-update-submit'));

    await waitFor(() =>
      expect(screen.getByText('La orden no existe o no está asignada a tu usuario.')).toBeTruthy(),
    );
  });

  it('informa una respuesta inválida del servidor sin declarar éxito', async () => {
    mockedLog.addOrderLogEntry.mockRejectedValue(
      new Error('La respuesta de la bitácora de la orden no es válida.'),
    );
    await openOrder();

    await describeUpdate('Revisión');
    await fireEvent.press(screen.getByTestId('order-update-submit'));

    await waitFor(() => expect(screen.getByTestId('order-update-error')).toBeTruthy());
    expect(screen.queryByTestId('order-update-success')).toBeNull();
  });

  it('exige una descripción antes de enviar', async () => {
    await openOrder();

    await fireEvent.press(screen.getByTestId('order-update-submit'));

    expect(screen.getByText('Describe el avance realizado.')).toBeTruthy();
    expect(mockedLog.addOrderLogEntry).not.toHaveBeenCalled();
  });

  it('una doble pulsación registra un solo avance', async () => {
    const pending = deferred<OrderLogEntry>();
    mockedLog.addOrderLogEntry.mockReturnValue(pending.promise);
    await openOrder();
    await describeUpdate('Revisión');

    const submit = pressHandlerOf('order-update-submit');
    await act(async () => {
      submit();
      submit();
    });
    expect(mockedLog.addOrderLogEntry).toHaveBeenCalledTimes(1);

    await act(async () => {
      pending.resolve(entry());
    });
    await waitFor(() => expect(screen.getByTestId('order-update-success')).toBeTruthy());
  });

  it.each<WorkOrderStatus>(['entregado', 'cancelado'])(
    'en una orden %s no ofrece fotografías y deja que el servidor decida sobre el avance',
    async (status) => {
      mockedOrders.getOrderById.mockResolvedValue(order(status));
      mockedLog.addOrderLogEntry.mockRejectedValue(new Error('La orden ya está cerrada.'));
      await openOrder();

      expect(screen.getByTestId('order-update-photo-closed')).toBeTruthy();
      expect(screen.queryByTestId('order-update-photo-take-photo')).toBeNull();
      expect(screen.queryByTestId('evidence-capture-panel')).toBeNull();

      await describeUpdate('Nota final');
      await fireEvent.press(screen.getByTestId('order-update-submit'));
      await waitFor(() => expect(screen.getByText('La orden ya está cerrada.')).toBeTruthy());
      expect(mockedEvidence.uploadEvidence).not.toHaveBeenCalled();
    },
  );

  it('un historial que falla puede reintentarse', async () => {
    mockedLog.getOrderLog
      .mockRejectedValueOnce(new Error('No fue posible cargar los avances de la orden.'))
      .mockResolvedValueOnce([]);
    await openOrder();

    await fireEvent.press(screen.getByTestId('order-log-show'));
    await waitFor(() => expect(screen.getByTestId('order-log-error')).toBeTruthy());

    await fireEvent.press(screen.getByText('Reintentar'));
    await waitFor(() => expect(screen.getByTestId('order-log-empty')).toBeTruthy());
  });
});
