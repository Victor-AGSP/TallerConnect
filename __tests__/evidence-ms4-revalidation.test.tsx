import { fireEvent, renderWithProviders, screen, waitFor } from '../test-utils';
import contract from '../test-utils/fixtures/ms4-gateway-contract.json';
import { OrderEvidenceList } from '@/components/evidence/OrderEvidenceList';
import { evidenceResponsePayloads } from '@/mocks/payloads/evidence.payload';
import { evidenceDownloadResponseDtoSchema, evidenceResponseDtoSchema } from '@/schemas/evidence-dto.schema';
import { apiClient } from '@/services/api/client';
import { EvidenceServiceError, evidenceService } from '@/services/evidence.service';

/**
 * SCRUM-164 — Revalidación de la consulta y visualización MS4.
 *
 * 1. Contrato: el DTO y las peticiones de la app coinciden con el contrato
 *    publicado por la Gateway vigente (extracto en test-utils/fixtures).
 * 2. Códigos: cada respuesta de error documentada para el listado produce un
 *    error de dominio con mensaje y resultado coherentes.
 * 3. Recuperación: tras 502/503/504 o timeout, «Reintentar» vuelve a consultar
 *    y muestra la evidencia cuando el servicio responde.
 * No reemplaza la validación autenticada real (BLOCKED sin cuentas).
 */

jest.mock('@/services/api/client', () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn() },
}));

const get = jest.mocked(apiClient.get);
const VISIBLE = evidenceResponsePayloads.fotoDiagnostico;
const ORDER_ID = String(VISIBLE.orden_id);
const LIST = contract.paths['GET /api/evidencias'];
const EVIDENCE_SCHEMA = contract.schemas.EvidenciaRespuesta;

const httpError = (status: number) => ({
  isAxiosError: true,
  message: `Request failed with status code ${status}`,
  response: { status, data: {} },
});

beforeEach(() => jest.resetAllMocks());

describe('Contrato vigente de la Gateway (MS4)', () => {
  it('el extracto proviene de la Gateway vigente', () => {
    expect(contract.source.url).toBe('https://api-tallerconnect.inf.uct.cl/openapi.json');
    expect(LIST.response200).toEqual({ type: 'array', schema: 'EvidenciaRespuesta' });
  });

  it('el payload de la app tiene exactamente los campos requeridos de EvidenciaRespuesta', () => {
    expect(Object.keys(VISIBLE).sort()).toEqual([...EVIDENCE_SCHEMA.required].sort());
    expect(evidenceResponseDtoSchema.safeParse(VISIBLE).success).toBe(true);
  });

  it.each(EVIDENCE_SCHEMA.required)('el DTO rechaza una evidencia sin «%s»', (field) => {
    const partial: Record<string, unknown> = { ...VISIBLE };
    delete partial[field];
    expect(evidenceResponseDtoSchema.safeParse(partial).success).toBe(false);
  });

  it('el DTO de descarga exige los campos de UrlDescargaRespuesta', () => {
    const required = contract.schemas.UrlDescargaRespuesta.required;
    expect(required.sort()).toEqual(['expira_en', 'url']);
    expect(evidenceDownloadResponseDtoSchema.safeParse({ url: 'https://s3.example/x', expira_en: 300 }).success).toBe(true);
    expect(evidenceDownloadResponseDtoSchema.safeParse({ url: 'https://s3.example/x' }).success).toBe(false);
  });

  it('el listado envía orden_id entero, el único parámetro obligatorio', async () => {
    const required = LIST.parameters.filter((p) => p.required).map((p) => p.name);
    expect(required).toEqual(['orden_id']);
    get.mockResolvedValueOnce({ data: [VISIBLE] } as never);

    await evidenceService.listEvidence(ORDER_ID);

    expect(get).toHaveBeenCalledWith('/evidencias', { params: { orden_id: VISIBLE.orden_id } });
  });
});

describe('Códigos documentados del listado', () => {
  const errorStatuses = LIST.responses.map(Number).filter((status) => status >= 400);

  it('el contrato documenta 401, 404, 422 y la familia 5xx', () => {
    expect(errorStatuses).toEqual([401, 404, 422, 500, 502, 503, 504]);
  });

  it.each(errorStatuses)('HTTP %i produce un error de dominio con mensaje y resultado', async (status) => {
    get.mockRejectedValueOnce(httpError(status));
    const error = await evidenceService.listEvidence(ORDER_ID).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(EvidenceServiceError);
    const domain = error as EvidenceServiceError;
    expect(domain.status).toBe(status);
    expect(domain.message.trim().length).toBeGreaterThan(0);
    if (status === 401) expect(domain.outcome).toBe('session');
    else if (status >= 500) expect(domain.outcome).toBe('retryable');
    else expect(domain.outcome).toBe('rejected');
  });
});

describe('Recuperación tras errores transitorios', () => {
  it.each([
    ['HTTP 502', () => Promise.reject(httpError(502))],
    ['HTTP 503', () => Promise.reject(httpError(503))],
    ['HTTP 504', () => Promise.reject(httpError(504))],
    ['timeout', () => Promise.reject({ isAxiosError: true, code: 'ECONNABORTED', message: 'timeout of 15000ms exceeded' })],
  ])('%s: error con reintento y luego la evidencia visible', async (_label, failure) => {
    get.mockImplementationOnce(failure as never).mockResolvedValueOnce({ data: [VISIBLE] } as never);

    await renderWithProviders(<OrderEvidenceList orderId={ORDER_ID} role="cliente" />);
    await fireEvent.press(screen.getByTestId('order-evidence-show'));

    await waitFor(() => expect(screen.getByTestId('order-evidence-error')).toBeTruthy());
    expect(screen.queryByTestId('order-evidence-empty')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));

    await waitFor(() => expect(screen.getByTestId(`order-evidence-${VISIBLE.evidencia_id}`)).toBeTruthy());
    expect(screen.queryByTestId('order-evidence-error')).toBeNull();
    expect(get).toHaveBeenCalledTimes(2);
  });
});
