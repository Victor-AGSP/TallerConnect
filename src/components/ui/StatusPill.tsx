import { StyleSheet, Text, View } from 'react-native';

import { colors, radius } from '@/constants/theme';

type Tone = 'success' | 'warning' | 'info' | 'danger';

interface StatusPillProps {
  label: string;
  tone?: Tone;
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
}: StatusPillProps) {
  return (
    <View
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