import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useConnectivityStore } from '@/stores/connectivityStore';
import { colors, radius, spacing } from '@/constants/theme';

export interface ConnectivityBannerProps {
  /**
   * Acción opcional personalizada al presionar Reintentar.
   * Si no se provee, ejecuta checkConnectivity() por defecto.
   */
  onRetry?: () => Promise<void> | void;

  /**
   * Identificador de prueba para Jest / Testing Library.
   */
  testID?: string;
}

/**
 * Indicador global de conectividad con acción de reintento.
 * Se muestra automáticamente en la parte superior de la aplicación
 * cuando se detecta un timeout de red o una pérdida de conexión.
 */
export function ConnectivityBanner({
  onRetry,
  testID = 'connectivity-banner',
}: ConnectivityBannerProps) {
  const hasNetworkIssue = useConnectivityStore((state) => state.hasNetworkIssue);
  const errorMessage = useConnectivityStore((state) => state.errorMessage);
  const isChecking = useConnectivityStore((state) => state.isChecking);
  const checkConnectivity = useConnectivityStore((state) => state.checkConnectivity);

  if (!hasNetworkIssue) {
    return null;
  }

  const handlePressRetry = async () => {
    if (isChecking) return;
    if (onRetry) {
      await onRetry();
    } else {
      await checkConnectivity();
    }
  };

  return (
    <View
      testID={testID}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      style={styles.bannerContainer}
    >
      <View style={styles.contentRow}>
        <View
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={styles.indicatorDot}
        />
        <Text style={styles.messageText} numberOfLines={2}>
          {errorMessage || 'Sin conexión a internet o con la API Gateway.'}
        </Text>
      </View>

      <TouchableOpacity
        testID="connectivity-retry-button"
        accessibilityRole="button"
        accessibilityLabel="Reintentar conexión"
        accessibilityHint="Comprueba nuevamente la conexión con el servidor"
        accessibilityState={{ disabled: isChecking, busy: isChecking }}
        onPress={handlePressRetry}
        disabled={isChecking}
        style={[styles.retryButton, isChecking && styles.retryButtonDisabled]}
      >
        {isChecking ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.retryButtonText}>Reintentar</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    backgroundColor: colors.warningSoft,
    borderBottomWidth: 1,
    borderBottomColor: colors.warning,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 9999,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  indicatorDot: {
    width: 10,
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.warning,
    marginRight: spacing.sm,
  },
  messageText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  retryButton: {
    backgroundColor: '#92400E',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 88,
    minHeight: 44,
  },
  retryButtonDisabled: {
    opacity: 0.6,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
