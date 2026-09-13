import { fireEvent, render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { Button, Card, ErrorMessage, Input, Loading } from '@/components/common';

describe('componentes comunes', () => {
  it('Button ejecuta la acción y expone su estado de accesibilidad', async () => {
    const onPress = jest.fn();
    const { getByTestId } = await render(
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
    const { getByTestId } = await render(
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
    const { getByTestId } = await render(
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
    const { getByText } = await render(
      <Card title="Detalle" subtitle="Información del vehículo">
        <Text>Contenido de la tarjeta</Text>
      </Card>,
    );

    expect(getByText('Detalle')).toBeTruthy();
    expect(getByText('Información del vehículo')).toBeTruthy();
    expect(getByText('Contenido de la tarjeta')).toBeTruthy();
  });

  it('Input muestra errores de validación y los anuncia', async () => {
    const { getByTestId, getByText } = await render(
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
    const { getByTestId, getByText } = await render(
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
    const { getByTestId, getByText } = await render(
      <Loading message="Cargando órdenes" testID="orders-loading" />,
    );

    const loading = getByTestId('orders-loading');

    expect(loading.props.accessibilityRole).toBe('progressbar');
    expect(loading.props.accessibilityState).toEqual({ busy: true });
    expect(getByText('Cargando órdenes')).toBeTruthy();
  });

  it('ErrorMessage permite reintentar la operación', async () => {
    const onRetry = jest.fn();
    const { getByTestId, getByText } = await render(
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
    const { getByText, queryByText } = await render(
      <ErrorMessage
        title="Servicio no disponible"
        message="Intenta nuevamente más tarde"
      />,
    );

    expect(getByText('Servicio no disponible')).toBeTruthy();
    expect(queryByText('Reintentar')).toBeNull();
  });
});
