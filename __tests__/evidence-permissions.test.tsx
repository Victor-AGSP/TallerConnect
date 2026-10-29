import { Linking, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import {
  cleanup,
  fireEvent,
  renderRouterWithProviders,
  resetStores,
  screen,
  waitFor,
} from '../test-utils';
import OrdenAsignadaScreen from '@/app/(mecanico)/ordenes-asignadas/[id]';
import {
  CAMERA_BLOCKED_MESSAGE,
  CAMERA_DENIED_MESSAGE,
  LIBRARY_DENIED_MESSAGE,
} from '@/hooks/useEvidencePicker';
import { mockUserByRole } from '@/mocks/users.mock';
import type { WorkOrder } from '@/models/order.model';
import { evidenceService } from '@/services/evidence.service';
import { ordersService } from '@/services/orders.service';

jest.mock('expo-image-picker', () => ({
  getCameraPermissionsAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  getMediaLibraryPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock('@/services/orders.service', () => ({
  ordersService: { getOrderById: jest.fn() },
}));

jest.mock('@/services/evidence.service', () => ({
  EvidenceServiceError: jest.requireActual('@/services/evidence.service').EvidenceServiceError,
  evidenceService: { uploadEvidence: jest.fn(), findUploadedEvidence: jest.fn() },
}));

// La bitácora del mecánico (SCRUM-107) se prueba en su propia suite.
jest.mock('@/services/order-log.service', () => ({
  orderLogService: { getOrderLog: jest.fn(async () => []), addOrderLogEntry: jest.fn() },
}));

const picker = jest.mocked(ImagePicker);
const mockedOrders = jest.mocked(ordersService);
const mockedEvidence = jest.mocked(evidenceService);

/**
 * SCRUM-110: permisos de cámara y galería rechazados, bloqueados, revocados o
 * no disponibles. Se simulan las respuestas nativas de expo-image-picker.
 */

const routes = { '(mecanico)/ordenes-asignadas/[id]': OrdenAsignadaScreen };

const ORDER: WorkOrder = {
  id: '31',
  vehicleId: '12',
  intakeId: '18',
  createdById: '99',
  status: 'en_reparacion',
  assignedMechanicId: '50',
  createdAt: '2026-10-09T10:00:00-03:00',
  updatedAt: '2026-10-09T12:00:00-03:00',
};

function permission(
  status: 'granted' | 'denied' | 'undetermined',
  canAskAgain: boolean,
): ImagePicker.PermissionResponse {
  return {
    status,
    granted: status === 'granted',
    canAskAgain,
    expires: 'never',
  } as ImagePicker.PermissionResponse;
}

const GRANTED = permission('granted', true);
const UNDETERMINED = permission('undetermined', true);
const DENIED = permission('denied', true);
const BLOCKED = permission('denied', false);

const PHOTO: ImagePicker.ImagePickerResult = {
  canceled: false,
  assets: [
    {
      uri: 'file:///cache/ImagePicker/sintetica.jpg',
      fileName: 'sintetica.jpg',
      fileSize: 2048,
      mimeType: 'image/jpeg',
      type: 'image',
      width: 800,
      height: 600,
    },
  ],
};

let view: ReturnType<typeof renderRouterWithProviders>;

async function openOrder() {
  view = renderRouterWithProviders(routes, {
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
  await waitFor(() => expect(screen.getByTestId('evidence-capture-panel')).toBeTruthy());
}

async function pressCamera() {
  await fireEvent.press(screen.getByTestId('evidence-take-photo'));
}

function expectMessage(text: string) {
  return waitFor(() =>
    expect(screen.getByTestId('evidence-picker-message')).toHaveTextContent(text),
  );
}

/** El contexto de la orden y la navegación siguen intactos. */
function expectOrderContextKept() {
  expect(view.getPathname()).toBe('/ordenes-asignadas/31');
  expect(screen.getByTestId('order-detail-31')).toBeTruthy();
  expect(screen.getByText('Se adjuntará a la orden 31.')).toBeTruthy();
}

let openSettings: jest.SpyInstance;

beforeEach(() => {
  jest.resetAllMocks();
  resetStores();
  mockedOrders.getOrderById.mockResolvedValue(ORDER);
  openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
});

afterEach(() => {
  openSettings.mockRestore();
  cleanup();
});

describe('Permisos de cámara', () => {
  it('con el permiso ya concedido abre la cámara sin volver a solicitarlo', async () => {
    picker.getCameraPermissionsAsync.mockResolvedValue(GRANTED);
    picker.launchCameraAsync.mockResolvedValue(PHOTO);
    await openOrder();

    await pressCamera();

    await waitFor(() => expect(screen.getByTestId('evidence-preview')).toBeTruthy());
    expect(picker.requestCameraPermissionsAsync).not.toHaveBeenCalled();
    expect(picker.launchCameraAsync).toHaveBeenCalledTimes(1);
  });

  it('no solicita permisos al abrir la orden: solo tras pulsar la cámara', async () => {
    await openOrder();

    expect(picker.getCameraPermissionsAsync).not.toHaveBeenCalled();
    expect(picker.requestCameraPermissionsAsync).not.toHaveBeenCalled();
    expect(picker.launchCameraAsync).not.toHaveBeenCalled();
  });

  it('si el usuario rechaza el permiso no abre la cámara y ofrece la galería', async () => {
    picker.getCameraPermissionsAsync.mockResolvedValue(UNDETERMINED);
    picker.requestCameraPermissionsAsync.mockResolvedValue(DENIED);
    picker.launchImageLibraryAsync.mockResolvedValue(PHOTO);
    await openOrder();

    await pressCamera();

    await expectMessage(CAMERA_DENIED_MESSAGE);
    expect(picker.requestCameraPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(picker.launchCameraAsync).not.toHaveBeenCalled();
    expectOrderContextKept();

    // La galería sigue disponible y funciona.
    await fireEvent.press(screen.getByTestId('evidence-pick-library'));
    await waitFor(() => expect(screen.getByTestId('evidence-preview')).toBeTruthy());
    expect(mockedEvidence.uploadEvidence).not.toHaveBeenCalled();
  });

  it('cada pulsación solicita el permiso una sola vez, sin bucles', async () => {
    picker.getCameraPermissionsAsync.mockResolvedValue(DENIED);
    picker.requestCameraPermissionsAsync.mockResolvedValue(DENIED);
    await openOrder();

    await pressCamera();
    await expectMessage(CAMERA_DENIED_MESSAGE);
    expect(picker.requestCameraPermissionsAsync).toHaveBeenCalledTimes(1);

    await pressCamera();
    await waitFor(() => expect(picker.requestCameraPermissionsAsync).toHaveBeenCalledTimes(2));
    expect(picker.launchCameraAsync).not.toHaveBeenCalled();
  });

  it('con rechazo permanente no vuelve a preguntar y ofrece abrir Ajustes', async () => {
    picker.getCameraPermissionsAsync.mockResolvedValue(BLOCKED);
    await openOrder();

    await pressCamera();

    await expectMessage(CAMERA_BLOCKED_MESSAGE);
    expect(picker.requestCameraPermissionsAsync).not.toHaveBeenCalled();
    expect(picker.launchCameraAsync).not.toHaveBeenCalled();
    // Ajustes solo se abre si el usuario lo pide.
    expect(openSettings).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('evidence-open-settings'));
    expect(openSettings).toHaveBeenCalledTimes(1);
    expectOrderContextKept();
  });

  it('cuando el rechazo se vuelve permanente al solicitarlo también ofrece Ajustes', async () => {
    picker.getCameraPermissionsAsync.mockResolvedValue(UNDETERMINED);
    picker.requestCameraPermissionsAsync.mockResolvedValue(BLOCKED);
    await openOrder();

    await pressCamera();

    await expectMessage(CAMERA_BLOCKED_MESSAGE);
    expect(screen.getByTestId('evidence-open-settings')).toBeTruthy();
  });

  it('permite reintentar tras habilitar el permiso en Ajustes', async () => {
    picker.getCameraPermissionsAsync
      .mockResolvedValueOnce(BLOCKED)
      .mockResolvedValueOnce(GRANTED);
    picker.launchCameraAsync.mockResolvedValue(PHOTO);
    await openOrder();

    await pressCamera();
    await expectMessage(CAMERA_BLOCKED_MESSAGE);

    await pressCamera();

    await waitFor(() => expect(screen.getByTestId('evidence-preview')).toBeTruthy());
    expect(screen.queryByTestId('evidence-picker-message')).toBeNull();
    expect(screen.queryByTestId('evidence-open-settings')).toBeNull();
  });

  it('detecta un permiso revocado después de haberse concedido', async () => {
    picker.getCameraPermissionsAsync
      .mockResolvedValueOnce(GRANTED)
      .mockResolvedValueOnce(BLOCKED);
    picker.launchCameraAsync.mockResolvedValue(PHOTO);
    await openOrder();

    await pressCamera();
    await waitFor(() => expect(screen.getByTestId('evidence-preview')).toBeTruthy());

    await pressCamera();

    await expectMessage(CAMERA_BLOCKED_MESSAGE);
    expect(picker.launchCameraAsync).toHaveBeenCalledTimes(1);
    // La fotografía válida ya elegida se conserva.
    expect(screen.getByTestId('evidence-preview')).toBeTruthy();
  });

  it('un permiso revocado justo antes de abrir la cámara se informa como permiso', async () => {
    picker.getCameraPermissionsAsync.mockResolvedValue(GRANTED);
    picker.launchCameraAsync.mockRejectedValue(
      Object.assign(new Error('Missing camera or camera roll permission.'), {
        code: 'ERR_MISSING_PERMISSIONS',
      }),
    );
    await openOrder();

    await pressCamera();

    await expectMessage(CAMERA_BLOCKED_MESSAGE);
    expect(screen.getByTestId('evidence-open-settings')).toBeTruthy();
  });

  it('una cámara no disponible no bloquea la pantalla', async () => {
    picker.getCameraPermissionsAsync.mockResolvedValue(GRANTED);
    picker.launchCameraAsync.mockRejectedValue(new Error('Camera not available on this device'));
    await openOrder();

    await pressCamera();

    await expectMessage('No se pudo abrir la cámara. Intenta nuevamente o usa la galería.');
    expect(screen.queryByTestId('evidence-open-settings')).toBeNull();
    expect(screen.getByTestId('evidence-pick-library')).toBeEnabled();
    expectOrderContextKept();
  });

  it('un fallo del módulo nativo al consultar el permiso se informa', async () => {
    picker.getCameraPermissionsAsync.mockRejectedValue(new Error('Native module missing'));
    await openOrder();

    await pressCamera();

    await expectMessage('No se pudo obtener la fotografía. Intenta nuevamente.');
    expect(picker.launchCameraAsync).not.toHaveBeenCalled();
  });

  it('cancelar la cámara tras conceder el permiso no muestra errores', async () => {
    picker.getCameraPermissionsAsync.mockResolvedValue(GRANTED);
    picker.launchCameraAsync.mockResolvedValue({ canceled: true, assets: null });
    await openOrder();

    await pressCamera();

    await waitFor(() => expect(picker.launchCameraAsync).toHaveBeenCalled());
    expect(screen.queryByTestId('evidence-picker-message')).toBeNull();
    expect(screen.queryByTestId('evidence-preview')).toBeNull();
  });
});

describe('Permisos de galería', () => {
  it('usa el selector del sistema sin solicitar acceso a la biblioteca', async () => {
    picker.launchImageLibraryAsync.mockResolvedValue(PHOTO);
    await openOrder();

    await fireEvent.press(screen.getByTestId('evidence-pick-library'));

    await waitFor(() => expect(screen.getByTestId('evidence-preview')).toBeTruthy());
    expect(picker.requestMediaLibraryPermissionsAsync).not.toHaveBeenCalled();
    expect(picker.getMediaLibraryPermissionsAsync).not.toHaveBeenCalled();
    expect(picker.getCameraPermissionsAsync).not.toHaveBeenCalled();
  });

  it('con acceso limitado a fotografías se puede elegir una sin pedir acceso completo', async () => {
    picker.getMediaLibraryPermissionsAsync.mockResolvedValue({
      ...GRANTED,
      accessPrivileges: 'limited',
    } as ImagePicker.MediaLibraryPermissionResponse);
    picker.launchImageLibraryAsync.mockResolvedValue(PHOTO);
    await openOrder();

    await fireEvent.press(screen.getByTestId('evidence-pick-library'));

    await waitFor(() => expect(screen.getByTestId('evidence-preview')).toBeTruthy());
    expect(picker.requestMediaLibraryPermissionsAsync).not.toHaveBeenCalled();
  });

  it('si la plataforma exige permiso y fue rechazado, lo informa y ofrece Ajustes', async () => {
    picker.launchImageLibraryAsync.mockRejectedValue(
      Object.assign(new Error('Missing photo library permission'), {
        code: 'ERR_MISSING_PERMISSIONS',
      }),
    );
    await openOrder();

    await fireEvent.press(screen.getByTestId('evidence-pick-library'));

    await expectMessage(LIBRARY_DENIED_MESSAGE);
    expect(screen.getByTestId('evidence-open-settings')).toBeTruthy();
    expect(openSettings).not.toHaveBeenCalled();
    expectOrderContextKept();
  });

  it('una galería no disponible se informa sin ofrecer Ajustes', async () => {
    picker.launchImageLibraryAsync.mockRejectedValue(new Error('No activity found'));
    await openOrder();

    await fireEvent.press(screen.getByTestId('evidence-pick-library'));

    await expectMessage('No se pudo abrir la galería. Intenta nuevamente.');
    expect(screen.queryByTestId('evidence-open-settings')).toBeNull();
  });

  it('cancelar el selector no muestra errores', async () => {
    picker.launchImageLibraryAsync.mockResolvedValue({ canceled: true, assets: null });
    await openOrder();

    await fireEvent.press(screen.getByTestId('evidence-pick-library'));

    await waitFor(() => expect(picker.launchImageLibraryAsync).toHaveBeenCalled());
    expect(screen.queryByTestId('evidence-picker-message')).toBeNull();
  });

  it('un archivo que no se puede leer se informa y permite elegir otro', async () => {
    picker.launchImageLibraryAsync
      .mockResolvedValueOnce({
        canceled: false,
        assets: [
          {
            ...PHOTO.assets![0],
            file: {
              type: 'image/jpeg',
              size: 2048,
              slice: () => ({
                arrayBuffer: () => Promise.reject(new Error('NotReadableError')),
              }),
            } as unknown as File,
          },
        ],
      })
      .mockResolvedValueOnce(PHOTO);
    await openOrder();

    await fireEvent.press(screen.getByTestId('evidence-pick-library'));
    await expectMessage('No se pudo leer la fotografía: puede que ya no exista. Elige otra.');
    expect(screen.queryByTestId('evidence-preview')).toBeNull();

    await fireEvent.press(screen.getByTestId('evidence-pick-library'));
    await waitFor(() => expect(screen.getByTestId('evidence-preview')).toBeTruthy());
  });
});

describe('Diferencias de plataforma', () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalOS });
  });

  it('en web no ofrece abrir Ajustes, que el navegador no permite', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
    picker.getCameraPermissionsAsync.mockResolvedValue(BLOCKED);
    await openOrder();

    await pressCamera();

    await expectMessage(CAMERA_BLOCKED_MESSAGE);
    expect(screen.queryByTestId('evidence-open-settings')).toBeNull();
  });
});

describe('Sin envíos accidentales', () => {
  it('ningún rechazo de permisos dispara una subida', async () => {
    picker.getCameraPermissionsAsync.mockResolvedValue(BLOCKED);
    picker.launchImageLibraryAsync.mockRejectedValue(
      Object.assign(new Error('permission'), { code: 'ERR_MISSING_PERMISSIONS' }),
    );
    await openOrder();

    await pressCamera();
    await expectMessage(CAMERA_BLOCKED_MESSAGE);
    await fireEvent.press(screen.getByTestId('evidence-pick-library'));
    await expectMessage(LIBRARY_DENIED_MESSAGE);

    expect(screen.queryByTestId('evidence-send')).toBeNull();
    expect(mockedEvidence.uploadEvidence).not.toHaveBeenCalled();
  });
});
