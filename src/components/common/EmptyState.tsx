import {
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewProps,
  ViewStyle,
} from 'react-native';

import { Button } from '@/components/common/Button';
import { colors, radius, spacing } from '@/constants/theme';

export interface EmptyStateProps
  extends Omit<ViewProps, 'children' | 'style'> {
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({
  title = 'Sin información',
  message,
  actionLabel,
  onAction,
  style,
  ...viewProps
}: EmptyStateProps) {
  return (
    <View
      {...viewProps}
      accessibilityRole="text"
      style={[styles.container, style]}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>○</Text>
      </View>

      <Text style={styles.title}>{title}</Text>

      <Text style={styles.message}>{message}</Text>

      {actionLabel && onAction ? (
        <Button
          title={actionLabel}
          onPress={onAction}
          variant="outline"
          style={styles.actionButton}
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
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.xl,
  },

  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 56,
    height: 56,
    marginBottom: spacing.md,
    borderRadius: 28,
    backgroundColor: colors.primarySoft,
  },

  icon: {
    color: colors.primary,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '700',
  },

  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },

  message: {
    maxWidth: 320,
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },

  actionButton: {
    marginTop: spacing.md,
  },
});