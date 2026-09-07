import {
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger';

interface AppButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: ViewStyle;
}

export function AppButton({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
}: AppButtonProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          variant === 'outline' && styles.outlineText,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: 'transparent',
  },

  primary: {
    backgroundColor: colors.primary,
  },

  secondary: {
    backgroundColor: colors.accent,
  },

  outline: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },

  danger: {
    backgroundColor: colors.danger,
  },

  text: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  outlineText: {
    color: colors.text,
  },

  pressed: {
    opacity: 0.8,
  },

  disabled: {
    opacity: 0.45,
  },
});