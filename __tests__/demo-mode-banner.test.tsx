import { Text } from 'react-native';

import { cleanup, renderRouterWithProviders, renderWithProviders, screen, waitFor } from '../test-utils';
import RootLayout from '@/app/_layout';
import { DemoModeBanner } from '@/components/common';
import { ENV } from '@/config/env';
import { apiClient } from '@/services/api/client';
import { evidenceService } from '@/services/evidence.service';

/**
 * SCRUM-166 — Contingencia de demo.
 * El modo demostración se identifica en toda la app, y MS4 no tiene un camino
 * simulado en la lista de evidencias: un fallo real no se reemplaza por datos.
 */

const flags = ENV as { USE_MOCK_SERVICES: boolean; USE_MOCK_AUTH: boolean };
jest.mock('@/config/env', () => {
  const actual = jest.requireActual('@/config/env');
  return { ...actual, ENV: { ...actual.ENV, USE_MOCK_SERVICES: false, USE_MOCK_AUTH: false } };
});
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));
jest.mock('@/services/api/client', () => ({
  apiClient: { get: jest.fn(), post: jest.fn() },
}));

const BANNER_TEXT = 'Modo demostración: datos simulados, no provienen del taller';

beforeEach(() => {
  flags.USE_MOCK_SERVICES = false;
  flags.USE_MOCK_AUTH = false;
  jest.mocked(apiClient.get).mockReset();
});
afterEach(cleanup);

describe('Franja de modo demostración', () => {
  it.each([
    ['servicios simulados', { USE_MOCK_SERVICES: true, USE_MOCK_AUTH: false }],
    ['autenticación simulada', { USE_MOCK_SERVICES: false, USE_MOCK_AUTH: true }],
  ])('se muestra con %s', async (_label, values) => {
    Object.assign(flags, values);
    await renderWithProviders(<DemoModeBanner />);
    expect(screen.getByTestId('demo-mode-banner')).toHaveTextContent(BANNER_TEXT);
  });

  it('no se muestra con la configuración real', async () => {
    await renderWithProviders(<DemoModeBanner />);
    expect(screen.queryByTestId('demo-mode-banner')).toBeNull();
  });

  it('el layout raíz la muestra sobre cualquier pantalla en modo demostración', async () => {
    flags.USE_MOCK_SERVICES = true;
    await renderRouterWithProviders({ _layout: RootLayout, index: () => <Text>Pantalla</Text> });
    await waitFor(() => expect(screen.getByText('Pantalla')).toBeTruthy());
    expect(screen.getByTestId('demo-mode-banner')).toBeTruthy();
  });
});

describe('MS4 sin camino simulado', () => {
  it('la lista de evidencias consulta la API aun en modo demostración y propaga su fallo', async () => {
    flags.USE_MOCK_SERVICES = true;
    jest.mocked(apiClient.get).mockRejectedValueOnce({
      isAxiosError: true,
      message: 'status 503',
      response: { status: 503, data: {} },
    });

    await expect(evidenceService.listEvidence('102')).rejects.toMatchObject({ status: 503 });
    expect(apiClient.get).toHaveBeenCalledWith('/evidencias', { params: { orden_id: 102 } });
  });

  it('los identificadores de orden simulados no se aceptan como órdenes MS4', async () => {
    await expect(evidenceService.listEvidence('ot-00124')).rejects.toMatchObject({
      code: 'EVIDENCE_INVALID_ORDER',
    });
    expect(apiClient.get).not.toHaveBeenCalled();
  });
});
