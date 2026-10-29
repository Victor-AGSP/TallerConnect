import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';
import {
  EvidenceService,
  MAX_IMAGE_SIZE_BYTES,
  MockEvidenceAdapter,
  ServiceError,
  evidenceService,
} from '@/services/evidence.service';
import { apiClient } from '@/services/api/client';
import { buildEvidenceFormData } from '@/mappers/evidence.mapper';
import { useEvidenceUploadStore } from '@/stores/evidenceUploadStore';
import {
  ensureCameraPermission,
  ensureMediaLibraryPermission,
  MediaPermissionError,
} from '@/utils/media-permissions';
import {
  evidenceDownloadUrlPayload,
  evidenceResponsePayloads,
} from '@/mocks/payloads/evidence.payload';

jest.mock('@/services/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

jest.mock('expo-image-picker', () => ({
  getCameraPermissionsAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  getMediaLibraryPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock('expo-camera', () => ({
  Camera: {
    requestCameraPermissionsAsync: jest.fn(),
  },
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;
const mockedImagePicker = ImagePicker as jest.Mocked<typeof ImagePicker>;
const mockedCamera = Camera as jest.Mocked<typeof Camera>;

describe('evidenceService (Evidencia Multimedia — MS4, Permisos, Multipart y Progreso)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    evidenceService.useRealAdapter();
    evidenceService.resetMocks();
  });

  describe('1. Manejo de permisos de cámara y archivos (media-permissions)', () => {
    it('concede acceso cuando el permiso de cámara ya está otorgado', async () => {
      mockedImagePicker.getCameraPermissionsAsync.mockResolvedValueOnce({
        granted: true,
        status: 'granted',
        canAskAgain: true,
        expires: 'never',
      } as never);

      const permission = await ensureCameraPermission();

      expect(permission.granted).toBe(true);
      expect(permission.status).toBe('granted');
      expect(
        mockedImagePicker.requestCameraPermissionsAsync
      ).not.toHaveBeenCalled();
    });

    it('solicita permiso de galería si estaba undetermined y falla con MediaPermissionError si el usuario rechaza', async () => {
      mockedImagePicker.getMediaLibraryPermissionsAsync.mockResolvedValueOnce({
        granted: false,
        status: 'undetermined',
        canAskAgain: true,
        expires: 'never',
      } as never);
      mockedImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValueOnce(
        {
          granted: false,
          status: 'denied',
          canAskAgain: true,
          expires: 'never',
        } as never
      );

      await expect(ensureMediaLibraryPermission()).rejects.toThrow(
        MediaPermissionError
      );
    });

    it('indica habilitar desde Configuración cuando canAskAgain es false (permiso bloqueado)', async () => {
      mockedImagePicker.getCameraPermissionsAsync.mockResolvedValueOnce({
        granted: false,
        status: 'denied',
        canAskAgain: false,
        expires: 'never',
      } as never);

      try {
        await ensureCameraPermission();
        fail('Debió lanzar MediaPermissionError');
      } catch (err) {
        expect(err).toBeInstanceOf(MediaPermissionError);
        const permErr = err as MediaPermissionError;
        expect(permErr.canAskAgain).toBe(false);
        expect(permErr.message).toContain('Configuración del dispositivo');
      }
      expect(mockedCamera.requestCameraPermissionsAsync).not.toHaveBeenCalled();
    });
  });

  describe('2. Construcción de solicitudes multipart/form-data (buildEvidenceFormData)', () => {
    it('construye un FormData con archivo, orden_id, contexto, presupuesto_id y visible_cliente', () => {
      const appendSpy = jest.spyOn(FormData.prototype, 'append');

      buildEvidenceFormData({
        archivo: {
          uri: 'file:///cache/diagnostico_motor.jpg',
          fileName: 'diagnostico_motor.jpg',
          mimeType: 'image/jpeg',
          mediaType: 'image',
          fileSize: 482310,
        },
        orden_id: 101,
        contexto: 'diagnostico',
        presupuesto_id: 1,
        visible_cliente: true,
      });

      expect(appendSpy).toHaveBeenCalledWith(
        'archivo',
        expect.objectContaining({
          uri: 'file:///cache/diagnostico_motor.jpg',
          name: 'diagnostico_motor.jpg',
          type: 'image/jpeg',
        })
      );
      expect(appendSpy).toHaveBeenCalledWith('orden_id', '101');
      expect(appendSpy).toHaveBeenCalledWith('contexto', 'diagnostico');
      expect(appendSpy).toHaveBeenCalledWith('presupuesto_id', '1');
      expect(appendSpy).toHaveBeenCalledWith('visible_cliente', 'true');

      appendSpy.mockRestore();
    });
  });

  describe('3. Subida de evidencia y estado de progreso/carga (POST /evidencias)', () => {
    it('envía multipart/form-data, actualiza useEvidenceUploadStore (0% → 50% → 100%) y retorna Evidence mapeada', async () => {
      const progressSnapshots: number[] = [];

      mockedApiClient.post.mockImplementationOnce(
        async (_url, _data, config) => {
          config?.onUploadProgress?.({
            loaded: 241155,
            total: 482310,
            bytes: 241155,
            lengthComputable: true,
          });
          config?.onUploadProgress?.({
            loaded: 482310,
            total: 482310,
            bytes: 241155,
            lengthComputable: true,
          });
          return { data: evidenceResponsePayloads.fotoDiagnostico } as never;
        }
      );

      const uploaded = await evidenceService.uploadEvidence(
        {
          archivo: {
            uri: 'file:///cache/bujias_desgastadas.jpg',
            fileName: 'bujias_desgastadas.jpg',
            mimeType: 'image/jpeg',
            fileSize: 482310,
            mediaType: 'image',
          },
          orden_id: 101,
          contexto: 'diagnostico',
          visible_cliente: true,
        },
        {
          requestId: 'req-ms4-001',
          onProgress: (event) => {
            progressSnapshots.push(event.percentage);
          },
        }
      );

      expect(mockedApiClient.post).toHaveBeenCalledWith(
        '/evidencias',
        expect.any(FormData),
        expect.objectContaining({
          headers: {
            'Content-Type': 'multipart/form-data',
            'X-Request-ID': 'req-ms4-001',
          },
          onUploadProgress: expect.any(Function),
        })
      );

      expect(progressSnapshots).toEqual([50, 100]);
      expect(uploaded.id).toBe('550e8400-e29b-41d4-a716-446655440001');
      expect(uploaded.context).toBe('diagnostico');
      expect(uploaded.sizeBytes).toBe(482310);

      const storeState = useEvidenceUploadStore.getState();
      expect(storeState.status).toBe('success');
      expect(storeState.progress).toBe(100);
      expect(storeState.lastUploadedEvidence?.id).toBe(uploaded.id);
    });

    it('integra captura desde cámara y subida directa con captureAndUploadEvidence', async () => {
      mockedImagePicker.getCameraPermissionsAsync.mockResolvedValueOnce({
        granted: true,
        status: 'granted',
        canAskAgain: true,
        expires: 'never',
      } as never);

      mockedImagePicker.launchCameraAsync.mockResolvedValueOnce({
        canceled: false,
        assets: [
          {
            uri: 'file:///cache/captura_camara.png',
            fileName: 'captura_camara.png',
            mimeType: 'image/png',
            fileSize: 615200,
            type: 'image',
            width: 1280,
            height: 720,
          },
        ],
      } as never);

      mockedApiClient.post.mockResolvedValueOnce({
        data: evidenceResponsePayloads.fotoPresupuesto,
      } as never);

      const result = await evidenceService.captureAndUploadEvidence({
        orden_id: 102,
        contexto: 'presupuesto',
        presupuesto_id: 2,
      });

      expect(mockedImagePicker.launchCameraAsync).toHaveBeenCalled();
      expect(result).not.toBeNull();
      expect(result?.id).toBe('550e8400-e29b-41d4-a716-446655440002');
      expect(result?.budgetId).toBe('2');
    });

    it('retorna null y limpia el estado de carga si el usuario cancela la selección en galería', async () => {
      mockedImagePicker.getMediaLibraryPermissionsAsync.mockResolvedValueOnce({
        granted: true,
        status: 'granted',
        canAskAgain: true,
        expires: 'never',
      } as never);

      mockedImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({
        canceled: true,
        assets: null,
      } as never);

      const result = await evidenceService.pickAndUploadEvidence({
        orden_id: 101,
        contexto: 'diagnostico',
      });

      expect(result).toBeNull();
      expect(useEvidenceUploadStore.getState().status).toBe('idle');
    });
  });

  describe('4. Consulta de evidencias y URL prefirmada de descarga (GET /evidencias)', () => {
    it('lista las evidencias de una orden (GET /evidencias?orden_id={id})', async () => {
      mockedApiClient.get.mockResolvedValueOnce({
        data: [evidenceResponsePayloads.fotoDiagnostico],
      } as never);

      const list = await evidenceService.getEvidencesByOrder(101);

      expect(mockedApiClient.get).toHaveBeenCalledWith('/evidencias', {
        params: { orden_id: 101 },
      });
      expect(list).toHaveLength(1);
      expect(list[0].originalName).toBe('bujias_desgastadas.jpg');
    });

    it('obtiene el detalle de una evidencia y su URL prefirmada de descarga', async () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440001';
      mockedApiClient.get
        .mockResolvedValueOnce({
          data: evidenceResponsePayloads.fotoDiagnostico,
        } as never)
        .mockResolvedValueOnce({
          data: evidenceDownloadUrlPayload,
        } as never);

      const detail = await evidenceService.getEvidenceById(uuid);
      const download = await evidenceService.getEvidenceDownloadUrl(uuid);

      expect(mockedApiClient.get).toHaveBeenNthCalledWith(
        1,
        `/evidencias/${uuid}`
      );
      expect(mockedApiClient.get).toHaveBeenNthCalledWith(
        2,
        `/evidencias/${uuid}/descarga`
      );
      expect(detail.id).toBe(uuid);
      expect(download.expiresInSeconds).toBe(300);
      expect(download.url).toContain('X-Amz-Expires=300');
    });
  });

  describe('5. Tratamiento de errores de carga (400, 409, 413, 415, 422, 503) y MockEvidenceAdapter', () => {
    it.each([
      [400, 'EVIDENCE_BAD_FILE', 'No se pudo leer el archivo enviado'],
      [409, 'EVIDENCE_CONFLICT', 'La orden está entregada o cancelada'],
      [413, 'EVIDENCE_TOO_LARGE', 'El archivo supera el tamaño máximo'],
      [
        415,
        'EVIDENCE_UNSUPPORTED_MEDIA',
        'Formato no permitido: solo JPG, PNG, WEBP, MP4 y MOV',
      ],
      [
        422,
        'EVIDENCE_VALIDATION_ERROR',
        'Presupuesto inexistente o de otra orden',
      ],
      [
        503,
        'EVIDENCE_STORAGE_UNAVAILABLE',
        'El almacenamiento MinIO/S3 no está disponible',
      ],
    ])(
      'normaliza HTTP %i como ServiceError con código %s y actualiza el store en estado error',
      async (status, expectedCode, detailMsg) => {
        mockedApiClient.post.mockRejectedValueOnce({
          isAxiosError: true,
          response: {
            status,
            data: { detail: detailMsg },
          },
        });

        await expect(
          evidenceService.uploadEvidence({
            archivo: {
              uri: 'file:///cache/test.jpg',
              name: 'test.jpg',
              type: 'image/jpeg',
            },
            orden_id: 101,
            contexto: 'diagnostico',
          })
        ).rejects.toMatchObject({
          name: 'ServiceError',
          status,
          code: expectedCode,
          domain: 'evidences',
          message: detailMsg,
        });

        expect(useEvidenceUploadStore.getState().status).toBe('error');
        expect(useEvidenceUploadStore.getState().errorMessage).toBe(detailMsg);
      }
    );

    it('valida formato (415), tamaño máximo (413) y subida con progreso en MockEvidenceAdapter', async () => {
      const mockService = new EvidenceService(new MockEvidenceAdapter());

      // 1. Formato no permitido (PDF) debe lanzar 415 EVIDENCE_UNSUPPORTED_MEDIA
      await expect(
        mockService.uploadEvidence({
          archivo: {
            uri: 'file:///cache/manual.pdf',
            fileName: 'manual.pdf',
            mimeType: 'application/pdf',
            mediaType: 'image',
          },
          orden_id: 101,
          contexto: 'diagnostico',
        })
      ).rejects.toMatchObject({
        status: 415,
        code: 'EVIDENCE_UNSUPPORTED_MEDIA',
      });

      // 2. Imagen mayor al máximo permitido debe lanzar 413 EVIDENCE_TOO_LARGE
      await expect(
        mockService.uploadEvidence({
          archivo: {
            uri: 'file:///cache/foto_pesada.jpg',
            fileName: 'foto_pesada.jpg',
            mimeType: 'image/jpeg',
            fileSize: MAX_IMAGE_SIZE_BYTES + 1024,
            mediaType: 'image',
          },
          orden_id: 101,
          contexto: 'diagnostico',
        })
      ).rejects.toMatchObject({
        status: 413,
        code: 'EVIDENCE_TOO_LARGE',
      });

      // 3. Subida válida en el adaptador simulado
      const created = await mockService.uploadEvidence({
        archivo: {
          uri: 'file:///cache/frenos_nuevos.webp',
          fileName: 'frenos_nuevos.webp',
          mimeType: 'image/webp',
          fileSize: 320000,
          mediaType: 'image',
        },
        orden_id: '105',
        contexto: 'reparacion',
      });

      expect(created.orderId).toBe('105');
      expect(created.context).toBe('reparacion');

      const orderEvidences = await mockService.getEvidencesByOrder('105');
      expect(orderEvidences.some((e) => e.id === created.id)).toBe(true);
    });
  });
});
