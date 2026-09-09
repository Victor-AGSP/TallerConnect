import {
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import { Button } from '@/components/common/Button';
import { colors, radius, spacing } from '@/constants/theme';

export interface ErrorMessageProps {
  message: string;
  title?: string;
  onRetry?: () => void;
  retryLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function ErrorMessage({
  message,
  title = 'Ocurrió un error',
  onRetry,
  retryLabel = 'Reintentar',
  style,
}: ErrorMessageProps) {
  return (
    <View
      accessibilityRole="alert"
      style={[styles.container, style]}
    >
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>

      {onRetry ? (
        <Button
          title={retryLabel}
          onPress={onRetry}
          variant="outline"
          style={styles.retryButton}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.dangerSoft,
    padding: spacing.lg,
  },

  title: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },

  message: {
    marginTop: spacing.xs,
    color: colors.text,
    fontSize: 14,
    textAlign: 'center',
  },

  retryButton: {
    marginTop: spacing.md,
  },
});
