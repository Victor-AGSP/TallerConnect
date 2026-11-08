import { StyleSheet, Text, View, type ViewProps } from 'react-native';

import { colors, radius } from '@/constants/theme';

export type StatusTone = 'success' | 'warning' | 'info' | 'danger';

interface StatusPillProps extends Omit<ViewProps, 'children' | 'style'> {
  label: string;
  tone?: StatusTone;
}

const backgrounds = {
  success: colors.successSoft,
  warning: colors.warningSoft,
  info: colors.infoSoft,
  danger: colors.dangerSoft,
};

const foregrounds = {
  success: colors.success,
  warning: colors.warning,
  info: colors.info,
  danger: colors.danger,
};

export function StatusPill({
  label,
  tone = 'info',
  accessibilityLabel,
  ...viewProps
}: StatusPillProps) {
  return (
    <View
      {...viewProps}
      accessible
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel ?? label}
      style={[
        styles.container,
        { backgroundColor: backgrounds[tone] },
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: foregrounds[tone] },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },

  text: {
    fontSize: 12,
    fontWeight: '800',
  },
});