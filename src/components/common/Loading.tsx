import {
  ActivityIndicator,
  ActivityIndicatorProps,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import { colors, spacing } from '@/constants/theme';

export interface LoadingProps {
  message?: string;
  size?: ActivityIndicatorProps['size'];
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export function Loading({
  message = 'Cargando...',
  size = 'large',
  color = colors.primary,
  style,
}: LoadingProps) {
  return (
    <View
      accessible
      accessibilityLabel={message}
      accessibilityRole="progressbar"
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
