import { StyleSheet, Text } from 'react-native';

import {
  cleanup,
  fireEvent,
  renderWithProviders,
  resetStores,
  screen,
} from '../test-utils';
import {
  ConnectivityBanner,
  ErrorMessage,
  Loading,
} from '@/components/common';
import { AppScreen } from '@/components/layout/AppScreen';
import { OrderBudgetView } from '@/components/orders/OrderBudgetView';
import { colors } from '@/constants/theme';
import type { Budget } from '@/models/budget.model';
import { useConnectivityStore } from '@/stores/connectivityStore';

/** Calcula la relación de contraste WCAG 2.1 entre dos colores hexadecimales. */
function contrastRatio(hexA: string, hexB: string): number {
  const luminance = (hex: string) => {
    const clean = hex.replace('#', '');
    const channels = [0, 2, 4].map((i) => {
      const srgb = parseInt(clean.slice(i, i + 2), 16) / 255;
      return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  };
  const l1 = luminance(hexA);
  const l2 = luminance(hexB);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const SENT_BUDGET: Budget = {
  id: '10',
  orderId: '1',
  createdAt: '2026-11-15T10:00:00Z',
  latestVersion: 1,
  latestStatus: 'enviada',
  latestTotal: '52000.00',
  currentVersion: null,
  versions: [
    {
      number: 1,
      status: 'enviada',
      isModification: false,
      createdAt: '2026-11-15T10:00:00Z',
      sentAt: '2026-11-15T11:00:00Z',
      total: '52000.00',
      items: [],
      decision: null,
    },
  ],
};

describe('Sprint 3 Semana 3 — Accesibilidad, contraste, SafeArea, teclado y red lenta', () => {
  beforeEach(() => {
    resetStores();
  });

  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });

  describe('S3-AMP-S3-JUAN-01 / JUAN-03 / S3-S3: Accesibilidad de botones de presupuesto y teclado de rechazo', () => {
    it('expone etiquetas, hints accesibles y propiedades de teclado Android en motivo de rechazo', async () => {
      const loadBudget = jest.fn().mockResolvedValueOnce(SENT_BUDGET);

      await renderWithProviders(
        <OrderBudgetView
          eyebrow="Portal del cliente"
          orderId="1"
          loadBudget={loadBudget}
          decisionActions={{
            decide: jest.fn(),
            retryApplication: jest.fn(),
          }}
        />,
      );

      const approveBtn = await screen.findByTestId('order-budget-approve');
      const rejectBtn = screen.getByTestId('order-budget-reject');
      const refreshBtn = screen.getByTestId('order-budget-refresh');
      const reasonInput = screen.getByTestId('order-budget-reason');

      expect(approveBtn.props.accessibilityRole).toBe('button');
      expect(approveBtn.props.accessibilityLabel).toBe('Aprobar presupuesto');
      expect(approveBtn.props.accessibilityHint).toBeTruthy();

      expect(rejectBtn.props.accessibilityRole).toBe('button');
      expect(rejectBtn.props.accessibilityLabel).toBe('Rechazar presupuesto');
      expect(rejectBtn.props.accessibilityHint).toBeTruthy();

      expect(refreshBtn.props.accessibilityHint).toBeTruthy();
      expect(StyleSheet.flatten(refreshBtn.props.style)?.minHeight).toBeGreaterThanOrEqual(44);

      // Teclado en formulario de motivo de rechazo (Android)
      expect(reasonInput.props.multiline).toBe(true);
      expect(reasonInput.props.returnKeyType).toBe('done');
      expect(reasonInput.props.blurOnSubmit).toBe(true);
      expect(reasonInput.props.textAlignVertical).toBe('top');
      expect(reasonInput.props.accessibilityHint).toBeTruthy();

      // Al pasar a confirmación también mantiene hint accesible
      await fireEvent.changeText(reasonInput, 'Precio elevado');
      await fireEvent.press(rejectBtn);
      const confirmBtn = screen.getByTestId('order-budget-confirm');
      expect(confirmBtn.props.accessibilityLabel).toBe('Confirmar rechazo');
      expect(confirmBtn.props.accessibilityHint).toBeTruthy();
    });
  });

  describe('S3-AMP-S3-JUAN-02 / S3-S3: Contraste WCAG AA en mensajes de error y aviso de conectividad', () => {
    it('cumple relación de contraste >= 4.5:1 en ErrorMessage y ConnectivityBanner', async () => {
      // ErrorMessage: danger sobre dangerSoft y text sobre dangerSoft
      expect(contrastRatio(colors.danger, colors.dangerSoft)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(colors.text, colors.dangerSoft)).toBeGreaterThanOrEqual(4.5);

      // ConnectivityBanner: text sobre warningSoft y blanco sobre botón #92400E
      expect(contrastRatio(colors.text, colors.warningSoft)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio('#FFFFFF', '#92400E')).toBeGreaterThanOrEqual(4.5);

      useConnectivityStore.setState({
        hasNetworkIssue: true,
        errorMessage: 'Tiempo de espera agotado. El servidor tardó demasiado en responder.',
        isChecking: false,
      });

      const onRetry = jest.fn();
      await renderWithProviders(
        <>
          <ConnectivityBanner onRetry={onRetry} />
          <ErrorMessage message="Error de prueba" onRetry={onRetry} />
        </>,
      );

      const bannerRetry = screen.getByTestId('connectivity-retry-button');
      expect(StyleSheet.flatten(bannerRetry.props.style)?.minHeight).toBeGreaterThanOrEqual(44);
      expect(bannerRetry.props.accessibilityHint).toBeTruthy();
    });
  });

  describe('S3-AMP-S3-JUAN-04 / S3-S3: SafeArea compacto y visualización con conexión lenta', () => {
    it('renderiza AppScreen con SafeArea y mantiene indicador de carga accesible con conexión lenta', async () => {
      await renderWithProviders(
        <AppScreen eyebrow="Prueba" title="Pantalla compacta">
          <Loading testID="slow-loading" message="Cargando con conexión lenta..." />
          <Text>Contenido visible</Text>
        </AppScreen>,
      );

      expect(screen.getByRole('header', { name: 'Pantalla compacta' })).toBeTruthy();
      const loading = screen.getByTestId('slow-loading');
      expect(loading.props.accessibilityRole).toBe('progressbar');
      expect(loading.props.accessibilityState).toMatchObject({ busy: true });
    });
  });
});
