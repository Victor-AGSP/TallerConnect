import { mapEvidenceUploadRequest } from '@/mappers/evidence-upload.mapper';
import { buildEvidenceFormData } from '@/mappers/evidence.mapper';
import {
  mockEvidenceUploadRequests,
  mockInvalidEvidenceUploadMetadata,
  mockMediaAssets,
  type EvidenceUploadCase,
} from '@/mocks/evidence-uploads.mock';
import { evidenceResponsePayloads } from '@/mocks/payloads/evidence.payload';
import { evidenceUploadRequestPayloads } from '@/mocks/payloads/evidence-upload.payload';
import type { EvidenceUploadMetadata } from '@/models/evidence.model';
import { evidenceUploadMetadataSchema } from '@/schemas/evidence.schema';
import { apiClient } from '@/services/api/client';
import { evidenceService } from '@/services/evidence.service';

jest.mock('@/services/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

/**
 * El `FormData` global de Jest es el de Node. Las pruebas usan el de React Native,
 * que es el que recibe la app en Android e iOS.
 */
const RNFormData = jest.requireActual('react-native/Libraries/Network/FormData').default;
const originalFormData = globalThis.FormData;

type FormDataPart = {
  fieldName: string;
  string?: string;
  uri?: string;
  name?: string;
  type?: string;
  headers: Record<string, string>;
};

const partsOf = (form: unknown): FormDataPart[] =>
  (form as { getParts(): FormDataPart[] }).getParts();

const textFields = (form: unknown): Record<string, string> =>
  Object.fromEntries(
    partsOf(form)
      .filter((part) => part.string !== undefined)
      .map((part) => [part.fieldName, part.string as string])
  );

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;
const cases = Object.keys(mockEvidenceUploadRequests) as EvidenceUploadCase[];
const CONTRACT_FIELDS = ['archivo', 'orden_id', 'contexto', 'presupuesto_id', 'visible_cliente'];

beforeAll(() => {
  (globalThis as { FormData: unknown }).FormData = RNFormData;
});

afterAll(() => {
  globalThis.FormData = originalFormData;
});

describe('Serialización de solicitudes de subida de evidencia (Body_subir_evidencias_post)', () => {
  describe('modelo de la app → campos del contrato', () => {
    it.each(cases)('%s: el mapper produce los campos esperados', (key) => {
      expect(mapEvidenceUploadRequest(mockEvidenceUploadRequests[key])).toEqual(
        evidenceUploadRequestPayloads[key]
      );
    });
  });

  describe('campos del contrato → multipart/form-data', () => {
    it.each(cases)('%s: solo envía campos del contrato y nunca el texto "null" ni "undefined"', (key) => {
      const parts = partsOf(buildEvidenceFormData(evidenceUploadRequestPayloads[key]));

      parts.forEach((part) => {
        expect(CONTRACT_FIELDS).toContain(part.fieldName);
        expect(part.string).not.toBe('null');
        expect(part.string).not.toBe('undefined');
      });
    });

    it('envía cada campo de texto como lo interpreta el contrato', () => {
      expect(textFields(buildEvidenceFormData(evidenceUploadRequestPayloads.presupuesto))).toEqual({
        orden_id: '103',
        contexto: 'presupuesto',
        presupuesto_id: '2',
        visible_cliente: 'true',
      });
      expect(textFields(buildEvidenceFormData(evidenceUploadRequestPayloads.reparacion))).toEqual({
        orden_id: '105',
        contexto: 'reparacion',
        presupuesto_id: '3',
        visible_cliente: 'false',
      });
    });

    it('omite los campos opcionales sin valor', () => {
      expect(textFields(buildEvidenceFormData(evidenceUploadRequestPayloads.diagnostico))).toEqual({
        orden_id: '102',
        contexto: 'diagnostico',
      });
      expect(textFields(buildEvidenceFormData(evidenceUploadRequestPayloads.resultadoFinal))).toEqual({
        orden_id: '106',
        contexto: 'resultado_final',
      });
    });

    it('agrega el archivo como { uri, name, type } con filename y Content-Type de la parte', () => {
      const [archivo] = partsOf(buildEvidenceFormData(evidenceUploadRequestPayloads.reparacion));

      expect(archivo).toMatchObject({
        fieldName: 'archivo',
        uri: mockMediaAssets.videoMp4.uri,
        name: 'ajuste_correa_distribucion.mp4',
        type: 'video/mp4',
      });
      expect(archivo.headers).toEqual({
        'content-disposition': 'form-data; name="archivo"; filename="ajuste_correa_distribucion.mp4"',
        'content-type': 'video/mp4',
      });
    });
  });

  describe('metadatos inválidos', () => {
    it.each(['contextoInvalido', 'presupuestoVacio'] as const)(
      '%s: el esquema lo rechaza antes del mapeo',
      (key) => {
        expect(evidenceUploadMetadataSchema.safeParse(mockInvalidEvidenceUploadMetadata[key]).success).toBe(
          false
        );
      }
    );

    it.each(['ordenSimulada', 'presupuestoNoNumerico'] as const)(
      '%s: pasa el esquema, pero el mapper lo rechaza por no ser un entero positivo',
      (key) => {
        const metadata = mockInvalidEvidenceUploadMetadata[key];

        expect(evidenceUploadMetadataSchema.safeParse(metadata).success).toBe(true);
        expect(() =>
          mapEvidenceUploadRequest({
            file: mockMediaAssets.fotoJpeg,
            metadata: metadata as unknown as EvidenceUploadMetadata,
          })
        ).toThrow('Identificador inválido');
      }
    );
  });

  describe('envío mediante EvidenceService', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      evidenceService.useRealAdapter();
      evidenceService.resetMocks();
    });

    it('la solicitud de la app llega a POST /evidencias como el FormData esperado', async () => {
      mockedApiClient.post.mockResolvedValueOnce({
        data: evidenceResponsePayloads.videoReparacion,
      } as never);

      await evidenceService.uploadEvidence(
        mapEvidenceUploadRequest(mockEvidenceUploadRequests.reparacion)
      );

      const [url, body, config] = mockedApiClient.post.mock.calls[0];
      expect(url).toBe('/evidencias');
      expect(partsOf(body).map((part) => part.fieldName)).toEqual(CONTRACT_FIELDS);
      expect(textFields(body)).toEqual({
        orden_id: '105',
        contexto: 'reparacion',
        presupuesto_id: '3',
        visible_cliente: 'false',
      });
      expect(config?.headers).toEqual(
        expect.objectContaining({ 'Content-Type': 'multipart/form-data' })
      );
    });
  });
});