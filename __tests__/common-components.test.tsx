import { fireEvent, renderWithProviders } from '../test-utils';
import { Text } from 'react-native';

import { Button, Card, ErrorMessage, Input, Loading } from '@/components/common';
import { AppScreen } from '@/components/layout/AppScreen';
import { InfoCard } from '@/components/ui/InfoCard';
import { StatusPill } from '@/components/ui/StatusPill';

describe('componentes comunes', () => {
  it('Button ejecuta la acción y expone su estado de accesibilidad', async () => {
    const onPress = jest.fn();
    const { getByTestId } = await renderWithProviders(
      <Button title="Guardar" onPress={onPress} testID="save-button" />,
    );

    const button = getByTestId('save-button');

    expect(button.props.accessibilityRole).toBe('button');
    expect(button.props.accessibilityLabel).toBe('Guardar');

    fireEvent.press(button);

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('Button bloquea la interacción mientras carga', async () => {
    const onPress = jest.fn();
    const { getByTestId } = await renderWithProviders(
      <Button
        title="Guardar"
        loading
        onPress={onPress}
        testID="loading-button"
      />,
    );

    const button = getByTestId('loading-button');

    expect(button.props.accessibilityState).toEqual({
      disabled: true,
      busy: true,
    });

    fireEvent.press(button);

    expect(onPress).not.toHaveBeenCalled();
  });

  it('Button admite etiqueta de accesibilidad personalizada', async () => {
    const { getByTestId } = await renderWithProviders(
      <Button
        title="Eliminar"
        variant="danger"
        accessibilityLabel="Eliminar orden de trabajo"
        onPress={jest.fn()}
        testID="delete-button"
      />,
    );

    expect(getByTestId('delete-button').props.accessibilityLabel).toBe(
      'Eliminar orden de trabajo',
    );
  });

  it('Card renderiza su encabezado y contenido', async () => {
    const { getByText } = await renderWithProviders(
      <Card title="Detalle" subtitle="Información del vehículo">
        <Text>Contenido de la tarjeta</Text>
      </Card>,
    );

    expect(getByText('Detalle')).toBeTruthy();
    expect(getByText('Información del vehículo')).toBeTruthy();
    expect(getByText('Contenido de la tarjeta')).toBeTruthy();
  });

  it('Input muestra errores de validación y los anuncia', async () => {
    const { getByTestId, getByText } = await renderWithProviders(
      <Input
        label="Correo"
        error="El correo es obligatorio"
        testID="email-input"
      />,
    );

    expect(getByTestId('email-input')).toBeTruthy();
    expect(getByText('El correo es obligatorio').props.accessibilityRole).toBe(
      'alert',
    );
  });

  it('Input muestra ayuda y notifica foco y desenfoque', async () => {
    const onFocus = jest.fn();
    const onBlur = jest.fn();
    const { getByTestId, getByText } = await renderWithProviders(
      <Input
        label="Correo"
        helperText="Usa el correo registrado"
        onFocus={onFocus}
        onBlur={onBlur}
        testID="helper-input"
      />,
    );

    const input = getByTestId('helper-input');

    await fireEvent(input, 'focus');
    await fireEvent(input, 'blur');

    expect(input.props.accessibilityLabel).toBe('Correo');
    expect(getByText('Usa el correo registrado')).toBeTruthy();
    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it('Loading expone un indicador ocupado y un mensaje', async () => {
    const { getByTestId, getByText } = await renderWithProviders(
      <Loading message="Cargando órdenes" testID="orders-loading" />,
    );

    const loading = getByTestId('orders-loading');

    expect(loading.props.accessibilityRole).toBe('progressbar');
    expect(loading.props.accessibilityState).toEqual({ busy: true });
    expect(getByText('Cargando órdenes')).toBeTruthy();
  });

  it('ErrorMessage permite reintentar la operación', async () => {
    const onRetry = jest.fn();
    const { getByTestId, getByText } = await renderWithProviders(
      <ErrorMessage
        message="No se pudo cargar la información"
        onRetry={onRetry}
        testID="error-message"
      />,
    );

    expect(getByTestId('error-message').props.accessibilityRole).toBe('alert');

    fireEvent.press(getByText('Reintentar'));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('ErrorMessage permite personalizar el título y ocultar el reintento', async () => {
    const { getByText, queryByText } = await renderWithProviders(
      <ErrorMessage
        title="Servicio no disponible"
        message="Intenta nuevamente más tarde"
      />,
    );

    expect(getByText('Servicio no disponible')).toBeTruthy();
    expect(queryByText('Reintentar')).toBeNull();
  });

  it('Button expone y respeta el estado deshabilitado explícito', async () => {
    const onPress = jest.fn();
    const { getByRole } = await renderWithProviders(
      <Button title="Continuar" disabled onPress={onPress} />,
    );

    const button = getByRole('button', { name: 'Continuar' });

    expect(button.props.accessibilityState).toEqual({
      disabled: true,
      busy: false,
    });

    fireEvent.press(button);

    expect(onPress).not.toHaveBeenCalled();
  });

  it('Input conserva su etiqueta accesible cuando no es editable', async () => {
    const { getByLabelText } = await renderWithProviders(
      <Input label="Correo" editable={false} />,
    );

    expect(getByLabelText('Correo').props.editable).toBe(false);
  });

  it('Input anuncia el error como una región de actualización accesible', async () => {
    const { getByRole } = await renderWithProviders(
      <Input label="Correo" error="Correo inválido" />,
    );

    expect(
      getByRole('alert', { name: 'Correo inválido' }).props,
    ).toMatchObject({ accessibilityLiveRegion: 'polite' });
  });

  it('InfoCard muestra sus campos opcionales y contenido', async () => {
    const { getByText, queryByText } = await renderWithProviders(
      <InfoCard title="Vehículo" subtitle="Patente ABCD12">
        <Text>En revisión</Text>
      </InfoCard>,
    );

    expect(getByText('Vehículo')).toBeTruthy();
    expect(getByText('Patente ABCD12')).toBeTruthy();
    expect(getByText('En revisión')).toBeTruthy();
    expect(queryByText('Otro dato')).toBeNull();
  });

  it.each(['success', 'warning', 'info', 'danger'] as const)(
    'StatusPill mantiene su etiqueta accesible en tono %s',
    async (tone) => {
      const { getByText } = await renderWithProviders(
        <StatusPill label="Orden en proceso" tone={tone} />,
      );

      expect(getByText('Orden en proceso')).toBeTruthy();
    },
  );

  it('AppScreen deja título, descripción y contenido disponibles', async () => {
    const { getByText } = await renderWithProviders(
      <AppScreen
        eyebrow="Panel"
        title="Mis órdenes"
        subtitle="Revisa el avance del taller"
      >
        <Text>Orden 42</Text>
      </AppScreen>,
    );

    expect(getByText('Panel')).toBeTruthy();
    expect(getByText('Mis órdenes')).toBeTruthy();
    expect(getByText('Revisa el avance del taller')).toBeTruthy();
    expect(getByText('Orden 42')).toBeTruthy();
  });
});
