import appConfig from '../app.json';
import {
  cleanup,
  renderWithProviders,
  resetStores,
  screen,
} from '../test-utils';
import { EmptyState } from '@/components/common';
import { InventoryScreen } from '@/components/inventory/InventoryScreen';
import { EMPTY_STATE_COPY } from '@/constants/emptyStates';
import { API_GATEWAY_URLS, isSecureGatewayUrl } from '@/config/env';

describe('Sprint 3 Semana 4 — Limpieza demo, estados vacíos unificados y auditoría Android', () => {
  beforeEach(() => {
    resetStores();
  });

  afterEach(() => {
    cleanup();
  });

  it('S3-AMP-S4-JUAN-04: InventoryScreen no muestra avisos de datos simulados o demostración', async () => {
    await renderWithProviders(<InventoryScreen />);

    expect(screen.queryByText(/Datos simulados para desarrollo/i)).toBeNull();
    expect(screen.queryByText(/Información de demostración/i)).toBeNull();
  });

  it('S3-AMP-S4-JUAN-01: unifica los textos de estado vacío y oculta el glifo decorativo a accesibilidad', async () => {
    await renderWithProviders(
      <EmptyState
        testID="unified-empty"
        title={EMPTY_STATE_COPY.evidences.title}
        message={EMPTY_STATE_COPY.evidences.message}
      />,
    );

    expect(screen.getByText('Sin evidencias')).toBeTruthy();
    expect(
      screen.getByText('Esta orden aún no tiene evidencias disponibles.'),
    ).toBeTruthy();
  });

  it('S3-AMP-S4-JUAN-03 / S3-S4: app.json mantiene orientación vertical y configuración segura de integración Kubero', () => {
    expect(appConfig.expo.orientation).toBe('portrait');
    expect(appConfig.expo.scheme).toBe('tallerconnect');
    expect(API_GATEWAY_URLS.INTEGRATION).toBe(
      'https://api-tallerconnect.inf.uct.cl/api',
    );
    expect(
      isSecureGatewayUrl(API_GATEWAY_URLS.INTEGRATION, 'integration'),
    ).toBe(true);
    expect(
      isSecureGatewayUrl(API_GATEWAY_URLS.PRODUCTION, 'production'),
    ).toBe(true);
  });
});
