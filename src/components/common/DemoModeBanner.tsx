import { StyleSheet, Text } from 'react-native';

import { ENV } from '@/config/env';
import { colors, spacing } from '@/constants/theme';

export interface DemoModeBannerProps {
  testID?: string;
}

/**
 * Franja global que identifica el modo demostración (autenticación o servicios
 * simulados). Evita que datos simulados se confundan con datos del taller
 * durante una presentación. No se muestra con la configuración real.
 */
export function DemoModeBanner({ testID = 'demo-mode-banner' }: DemoModeBannerProps) {
  if (!ENV.USE_MOCK_SERVICES && !ENV.USE_MOCK_AUTH) {
    return null;
  }

  return (
    <Text testID={testID} accessibilityRole="text" style={styles.banner}>
      Modo demostración: datos simulados, no provienen del taller
    </Text>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.warningSoft,
    borderBottomWidth: 1,
    borderBottomColor: colors.warning,
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
});
