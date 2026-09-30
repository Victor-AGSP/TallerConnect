import React from 'react';
import { fireEvent, renderWithProviders, screen } from '../test-utils';
import { ConnectivityBanner } from '@/components/common/ConnectivityBanner';
import { useConnectivityStore } from '@/stores/connectivityStore';

describe('ConnectivityBanner (Componente Global de Alerta de Red)', () => {
  beforeEach(() => {
    useConnectivityStore.getState().reset();
  });

  it('no se renderiza cuando la conectividad es saludable (hasNetworkIssue: false)', async () => {
    await renderWithProviders(<ConnectivityBanner />);

    expect(screen.queryByTestId('connectivity-banner')).toBeNull();
  });

  it('se renderiza visible cuando se detecta un problema de red', async () => {
    useConnectivityStore
      .getState()
      .setNetworkIssue('Sin conexión a internet o con la API Gateway.');

    await renderWithProviders(<ConnectivityBanner />);

    expect(screen.getByTestId('connectivity-banner')).toBeTruthy();
    expect(screen.getByText('Sin conexión a internet o con la API Gateway.')).toBeTruthy();
    expect(screen.getByTestId('connectivity-retry-button')).toBeTruthy();
  });

  it('permite accionar el botón Reintentar y dispara checkConnectivity', async () => {
    useConnectivityStore.getState().setNetworkIssue('Falla de red temporal');

    const checkConnectivitySpy = jest
      .spyOn(useConnectivityStore.getState(), 'checkConnectivity')
      .mockResolvedValueOnce(true);

    await renderWithProviders(<ConnectivityBanner />);

    const retryButton = screen.getByTestId('connectivity-retry-button');
    fireEvent.press(retryButton);

    expect(checkConnectivitySpy).toHaveBeenCalledTimes(1);
  });

  it('permite ejecutar un handler personalizado onRetry si se provee por props', async () => {
    useConnectivityStore.getState().setNetworkIssue('Falla de red temporal');

    const customOnRetry = jest.fn();
    await renderWithProviders(<ConnectivityBanner onRetry={customOnRetry} />);

    const retryButton = screen.getByTestId('connectivity-retry-button');
    fireEvent.press(retryButton);

    expect(customOnRetry).toHaveBeenCalledTimes(1);
  });

  it('deshabilita el botón de reintento mientras está comprobando (isChecking: true)', async () => {
    useConnectivityStore.getState().setNetworkIssue('Comprobando...');
    useConnectivityStore.setState({ isChecking: true });

    const customOnRetry = jest.fn();
    await renderWithProviders(<ConnectivityBanner onRetry={customOnRetry} />);

    const retryButton = screen.getByTestId('connectivity-retry-button');
    expect(retryButton.props.accessibilityState).toEqual({
      disabled: true,
      busy: true,
    });

    fireEvent.press(retryButton);
    expect(customOnRetry).not.toHaveBeenCalled();
  });
});
