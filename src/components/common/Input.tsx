import { useState } from 'react';

import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';

type InputFocusEvent = Parameters<NonNullable<TextInputProps['onFocus']>>[0];
type InputBlurEvent = Parameters<NonNullable<TextInputProps['onBlur']>>[0];

export interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  helperText?: string;
  containerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<TextStyle>;
}

export function Input({
  label,
  error,
  helperText,
  containerStyle,
  style,
  onFocus,
  onBlur,
  placeholderTextColor = colors.textMuted,
  editable = true,
  accessibilityLabel,
  ...textInputProps
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const supportingText = error || helperText;

  const handleFocus = (event: InputFocusEvent) => {
    setFocused(true);
    onFocus?.(event);
  };

  const handleBlur = (event: InputBlurEvent) => {
    setFocused(false);
    onBlur?.(event);
  };

  return (
    <View style={containerStyle}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <TextInput
        {...textInputProps}
        accessibilityLabel={accessibilityLabel ?? label}
        editable={editable}
        onBlur={handleBlur}
        onFocus={handleFocus}
        placeholderTextColor={placeholderTextColor}
        style={[
          styles.input,
          focused && styles.inputFocused,
          error && styles.inputError,
          !editable && styles.inputDisabled,
          style,
        ]}
      />

      {supportingText ? (
        <Text
          accessibilityLiveRegion={error ? 'polite' : 'none'}
          accessibilityRole={error ? 'alert' : undefined}
          style={[styles.supportingText, error && styles.errorText]}
        >
          {supportingText}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },

  input: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: 16,
  },

  inputFocused: {
    borderColor: colors.accent,
  },

  inputError: {
    borderColor: colors.danger,
  },

  inputDisabled: {
    opacity: 0.6,
  },

  supportingText: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: 12,
  },

  errorText: {
    color: colors.danger,
  },
});
