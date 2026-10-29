import * as ImagePicker from 'expo-image-picker';
import { router as appRouter } from 'expo-router';

import {
  act,
  cleanup,
  fireEvent,
  renderRouterWithProviders,
  renderWithProviders,
  resetStores,
  screen,
  waitFor,
} from '../test-utils';
import OrdenAsignadaScreen from '@/app/(mecanico)/ordenes-asignadas/[id]';
import { OrderDetailView } from '@/components/orders/OrderDetailView';
import { mockUserByRole } from '@/mocks/users.mock';
import type { Evidence } from '@/models/evidence.model';
import type { WorkOrder } from '@/models/order.model';
import { evidenceService } from '@/services/evidence.service';
import { ordersService } from '@/services/orders.service';

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  getCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock('@/services/orders.service', () => ({
  ordersService: { getOrderById: jest.fn() },
}));

jest.mock('@/services/evidence.service', () => ({
  evidenceService: { uploadEvidence: jest.fn() },
}));

const picker = jest.mocked(ImagePicker);
const mockedOrders = jest.mocked(ordersService);
const mockedEvidence = jest.mocked(evidenceService);

/**
 * SCRUM-106: captura/selección de fotografías asociada a la orden del mecánico.
 * Pantalla real; se simulan el selector nativo y los servicios.
 */

const routes = { '(mecanico)/ordenes-asignadas/[id]': OrdenAsignadaScreen };

function order(id: string): WorkOrder {
  return {
    id,
    vehicleId: '12',
    intakeId: '18',
    createdById: '99',
    status: 'en_reparacion',
    assignedMechanicId: '50',
    createdAt: '2026-10-09T10:00:00-03:00',
    updatedAt: '2026-10-09T12:00:00-03:00',
  };
}

function asset(name: string, overrides: Partial<ImagePicker.ImagePickerAsset> = {}) {
  return {
    uri: `file:///cache/ImagePicker/${name}`,
    fileName: name,
    fileSize: 2048,
    mimeType: 'image/jpeg',
    type: 'image' as const,
    width: 800,
    height: 600,
    ...overrides,
  };
}

function picked(...assets: ImagePicker.ImagePickerAsset[]): ImagePicker.ImagePickerResult {
  return { canceled: false, assets };
}

const CANCELED: ImagePicker.ImagePickerResult = { canceled: true, assets: null };

const GRANTED = {
  status: 'granted',
  granted: true,
  canAskAgain: true,
  expires: 'never',
} as ImagePicker.PermissionResponse;

function evidence(orderId: string, name: string): Evidence {
  return {
    id: '7b0f3e0c-1d2a-4c3b-9e8f-0a1b2c3d4e5f',
    orderId,
    budgetId: null,
    context: 'reparacion',
    fileKind: 'foto',
    visibleToClient: true,
    status: 'confirmada',
    originalName: name,
    contentType: 'image/jpeg',
    sizeBytes: 2048,
    createdAt: '2026-10-28T12:00:00-03:00',
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

async function openMechanicOrder(id: string | null = '31') {
  const view = renderRouterWithProviders(routes, {
    initialUrl: id ? `/ordenes-asignadas/${id}` : '/ordenes-asignadas/',
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
  return { view };
}

async function waitForPanel(orderId: string) {
  await waitFor(() => expect(screen.getByTestId(`order-detail-${orderId}`)).toBeTruthy());
  expect(screen.getByTestId('evidence-capture-panel')).toBeTruthy();
}

function pressHandlerOf(testID: string): () => void {
  const host = screen.getByTestId(testID);
  const event = { nativeEvent: {}, target: host, currentTarget: host, stopPropagation: () => {} };
  return () => host.props.onClick(event);
}

beforeEach(() => {
  jest.resetAllMocks();
  resetStores();
  mockedOrders.getOrderById.mockImplementation(async (id) => order(String(id)));
  // Primer uso: el permiso aún no se ha decidido y se solicita al pulsar.
  picker.getCameraPermissionsAsync.mockResolvedValue({
    ...GRANTED,
    status: 'undetermined',
    granted: false,
  } as ImagePicker.PermissionResponse);
  picker.requestCameraPermissionsAsync.mockResolvedValue(GRANTED);
});

afterEach(() => {
  cleanup();
});

describe('Captura y selección de fotografías en la orden del mecánico', () => {
  it('muestra la sección de evidencia identificando la orden', async () => {
    await openMechanicOrder('31');
    await waitForPanel('31');

    expect(screen.getByText('Se adjuntará a la orden 31.')).toBeTruthy();
    expect(screen.queryByTestId('evidence-preview')).toBeNull();
    expect(picker.requestCameraPermissionsAsync).not.toHaveBeenCalled();
  });

  it('captura una fotografía con la cámara tras conceder el permiso y la previsualiza', async () => {
    picker.launchCameraAsync.mockResolvedValue(picked(asset('captura.jpg')));
    await openMechanicOrder('31');
    await waitForPanel('31');

    await fireEvent.press(screen.getByTestId('evidence-take-photo'));

    await waitFor(() => expect(screen.getByTestId('evidence-preview')).toBeTruthy());
    expect(picker.requestCameraPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(picker.launchCameraAsync).toHaveBeenCalledWith(
      expect.objectContaining({ mediaTypes: ['images'], exif: false, allowsMultipleSelection: false }),
    );
    expect(screen.getByLabelText('Vista previa de la fotografía captura.jpg')).toBeTruthy();
    // Seleccionar no sube nada.
    expect(mockedEvidence.uploadEvidence).not.toHaveBeenCalled();
  });

  it('selecciona desde la galería sin pedir permisos de biblioteca', async () => {
    picker.launchImageLibraryAsync.mockResolvedValue(picked(asset('galeria.png', { mimeType: 'image/png' })));
    await openMechanicOrder('31');
    await waitForPanel('31');

    await fireEvent.press(screen.getByTestId('evidence-pick-library'));

    await waitFor(() => expect(screen.getByText('galeria.png')).toBeTruthy());
    expect(picker.requestCameraPermissionsAsync).not.toHaveBeenCalled();
    expect(mockedEvidence.uploadEvidence).not.toHaveBeenCalled();
  });

  it('una cancelación no muestra errores ni vista previa', async () => {
    picker.launchCameraAsync.mockResolvedValue(CANCELED);
    await openMechanicOrder('31');
    await waitForPanel('31');

    await fireEvent.press(screen.getByTestId('evidence-take-photo'));

    await waitFor(() => expect(picker.launchCameraAsync).toHaveBeenCalled());
    expect(screen.queryByTestId('evidence-preview')).toBeNull();
    expect(screen.queryByTestId('evidence-picker-message')).toBeNull();
  });

  it('reemplaza la fotografía y la cancelación posterior conserva la anterior', async () => {
    picker.launchImageLibraryAsync
      .mockResolvedValueOnce(picked(asset('primera.jpg')))
      .mockResolvedValueOnce(picked(asset('segunda.jpg')))
      .mockResolvedValueOnce(CANCELED);
    await openMechanicOrder('31');
    await waitForPanel('31');

    await fireEvent.press(screen.getByTestId('evidence-pick-library'));
    await waitFor(() => expect(screen.getByText('primera.jpg')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('evidence-pick-library'));
    await waitFor(() => expect(screen.getByText('segunda.jpg')).toBeTruthy());
    expect(screen.queryByText('primera.jpg')).toBeNull();

    await fireEvent.press(screen.getByTestId('evidence-pick-library'));
    await waitFor(() => expect(picker.launchImageLibraryAsync).toHaveBeenCalledTimes(3));
    expect(screen.getByText('segunda.jpg')).toBeTruthy();
  });

  it('un archivo inválido se informa y conserva la selección válida anterior', async () => {
    picker.launchImageLibraryAsync
      .mockResolvedValueOnce(picked(asset('valida.jpg')))
      .mockResolvedValueOnce(picked(asset('clip.mp4', { mimeType: 'video/mp4', type: 'video' })));
    await openMechanicOrder('31');
    await waitForPanel('31');

    await fireEvent.press(screen.getByTestId('evidence-pick-library'));
    await waitFor(() => expect(screen.getByText('valida.jpg')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('evidence-pick-library'));
    await waitFor(() =>
      expect(screen.getByTestId('evidence-picker-message')).toHaveTextContent(
        'Formato no permitido: solo fotografías JPG, PNG o WEBP.',
      ),
    );
    expect(screen.getByText('valida.jpg')).toBeTruthy();
  });

  it('quita la fotografía antes de enviarla', async () => {
    picker.launchCameraAsync.mockResolvedValue(picked(asset('captura.jpg')));
    await openMechanicOrder('31');
    await waitForPanel('31');

    await fireEvent.press(screen.getByTestId('evidence-take-photo'));
    await waitFor(() => expect(screen.getByTestId('evidence-preview')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('evidence-remove'));

    expect(screen.queryByTestId('evidence-preview')).toBeNull();
    expect(screen.queryByTestId('evidence-send')).toBeNull();
    expect(mockedEvidence.uploadEvidence).not.toHaveBeenCalled();
  });

  it('informa un error nativo de la cámara sin bloquear la galería', async () => {
    picker.launchCameraAsync.mockRejectedValue(new Error('E_CAMERA_UNAVAILABLE'));
    picker.launchImageLibraryAsync.mockResolvedValue(picked(asset('galeria.jpg')));
    await openMechanicOrder('31');
    await waitForPanel('31');

    await fireEvent.press(screen.getByTestId('evidence-take-photo'));
    await waitFor(() =>
      expect(screen.getByTestId('evidence-picker-message')).toHaveTextContent(
        'No se pudo abrir la cámara. Intenta nuevamente o usa la galería.',
      ),
    );

    await fireEvent.press(screen.getByTestId('evidence-pick-library'));
    await waitFor(() => expect(screen.getByText('galeria.jpg')).toBeTruthy());
    expect(screen.queryByTestId('evidence-picker-message')).toBeNull();
  });

  it('sin identificador de orden no ofrece capturar evidencia', async () => {
    const renderSections = jest.fn(() => null);
    await renderWithProviders(
      <OrderDetailView
        eyebrow="Área de trabajo"
        orderId={undefined}
        loadOrder={mockedOrders.getOrderById}
        renderSections={renderSections}
      />,
    );

    expect(screen.getByTestId('order-detail-missing-id')).toBeTruthy();
    expect(renderSections).not.toHaveBeenCalled();
    expect(mockedOrders.getOrderById).not.toHaveBeenCalled();
  });

  it('no muestra la sección si la orden cargada no es la de la ruta', async () => {
    mockedOrders.getOrderById.mockResolvedValue(order('99'));
    await openMechanicOrder('31');

    await waitFor(() => expect(screen.getByTestId('order-detail-99')).toBeTruthy());
    expect(screen.queryByTestId('evidence-capture-panel')).toBeNull();
  });

  it('envía la fotografía seleccionada a la orden de la ruta con el contexto elegido', async () => {
    picker.launchCameraAsync.mockResolvedValue(picked(asset('captura.jpg')));
    mockedEvidence.uploadEvidence.mockResolvedValue(evidence('31', 'captura.jpg'));
    await openMechanicOrder('31');
    await waitForPanel('31');

    await fireEvent.press(screen.getByTestId('evidence-take-photo'));
    await waitFor(() => expect(screen.getByTestId('evidence-preview')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('evidence-context-diagnostico'));
    await fireEvent.press(screen.getByTestId('evidence-send'));

    await waitFor(() => expect(screen.getByTestId('evidence-upload-success')).toBeTruthy());
    expect(mockedEvidence.uploadEvidence).toHaveBeenCalledTimes(1);
    expect(mockedEvidence.uploadEvidence).toHaveBeenCalledWith({
      orderId: '31',
      context: 'diagnostico',
      file: expect.objectContaining({ name: 'captura.jpg', mimeType: 'image/jpeg', size: 2048 }),
    });
    expect(screen.getByText('Evidencia registrada')).toBeTruthy();
    // La selección enviada se limpia para no reenviarla por error.
    expect(screen.queryByTestId('evidence-preview')).toBeNull();
  });

  it('una doble pulsación de envío produce una sola solicitud', async () => {
    const pending = deferred<Evidence>();
    picker.launchCameraAsync.mockResolvedValue(picked(asset('captura.jpg')));
    mockedEvidence.uploadEvidence.mockReturnValue(pending.promise);
    await openMechanicOrder('31');
    await waitForPanel('31');

    await fireEvent.press(screen.getByTestId('evidence-take-photo'));
    await waitFor(() => expect(screen.getByTestId('evidence-send')).toBeTruthy());

    const send = pressHandlerOf('evidence-send');
    await act(async () => {
      send();
      send();
    });
    expect(mockedEvidence.uploadEvidence).toHaveBeenCalledTimes(1);

    await act(async () => {
      pending.resolve(evidence('31', 'captura.jpg'));
    });
    await waitFor(() => expect(screen.getByTestId('evidence-upload-success')).toBeTruthy());
  });

  it('una fotografía elegida en una orden no se ofrece ni se envía en otra', async () => {
    picker.launchCameraAsync.mockResolvedValue(picked(asset('orden31.jpg')));
    await openMechanicOrder('31');
    await waitForPanel('31');

    await fireEvent.press(screen.getByTestId('evidence-take-photo'));
    await waitFor(() => expect(screen.getByText('orden31.jpg')).toBeTruthy());

    await act(async () => {
      appRouter.setParams({ id: '32' });
    });
    await waitForPanel('32');

    expect(screen.getByText('Se adjuntará a la orden 32.')).toBeTruthy();
    expect(screen.queryByText('orden31.jpg')).toBeNull();
    expect(screen.queryByTestId('evidence-send')).toBeNull();
    expect(mockedEvidence.uploadEvidence).not.toHaveBeenCalled();
  });

  it('descarta el resultado del selector que llega después de cambiar de orden', async () => {
    const pendingPick = deferred<ImagePicker.ImagePickerResult>();
    picker.launchImageLibraryAsync.mockReturnValueOnce(pendingPick.promise);
    await openMechanicOrder('31');
    await waitForPanel('31');

    // Sin esperar al selector: queda abierto mientras se cambia de orden.
    const pick = pressHandlerOf('evidence-pick-library');
    await act(async () => {
      pick();
    });
    expect(picker.launchImageLibraryAsync).toHaveBeenCalledTimes(1);

    await act(async () => {
      appRouter.setParams({ id: '32' });
    });
    await waitForPanel('32');

    await act(async () => {
      pendingPick.resolve(picked(asset('tardia.jpg')));
    });

    expect(screen.queryByText('tardia.jpg')).toBeNull();
    expect(screen.queryByTestId('evidence-preview')).toBeNull();
    expect(mockedEvidence.uploadEvidence).not.toHaveBeenCalled();
  });

  it('no abre dos selectores a la vez', async () => {
    const pendingPick = deferred<ImagePicker.ImagePickerResult>();
    picker.launchImageLibraryAsync.mockReturnValue(pendingPick.promise);
    await openMechanicOrder('31');
    await waitForPanel('31');

    const pick = pressHandlerOf('evidence-pick-library');
    await act(async () => {
      pick();
      pick();
    });
    expect(picker.launchImageLibraryAsync).toHaveBeenCalledTimes(1);

    await act(async () => {
      pendingPick.resolve(CANCELED);
    });
  });
});
