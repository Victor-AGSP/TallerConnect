import {
  ActivityIndicator,
  ActivityIndicatorProps,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewProps,
  ViewStyle,
} from 'react-native';

import { colors, spacing } from '@/constants/theme';

export interface LoadingProps extends Omit<ViewProps, 'children' | 'style'> {
  message?: string;
  size?: ActivityIndicatorProps['size'];
  color?: ActivityIndicatorProps['color'];
  style?: StyleProp<ViewStyle>;
}

export function Loading({
  message = 'Cargando...',
  size = 'large',
  color = colors.primary,
  style,
  accessibilityLabel,
  accessibilityState,
  ...viewProps
}: LoadingProps) {
  const label = accessibilityLabel ?? message ?? 'Cargando';

  return (
    <View
      {...viewProps}
      accessible
      accessibilityLabel={label}
      accessibilityRole="progressbar"
      accessibilityState={{ ...accessibilityState, busy: true }}
      style={[styles.container, style]}
    >
      <ActivityIndicator color={color} size={size} />
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },

  message: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    fontSize: 14,
  },
});
