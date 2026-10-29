import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button, ErrorMessage } from '@/components/common';
import { colors, radius, spacing } from '@/constants/theme';
import type { EvidenceUploadState } from '@/hooks/useEvidenceUpload';
import { formatDate } from '@/utils/formatters';

export interface EvidenceUploadStatusProps {
  state: EvidenceUploadState;
  onRetry: () => void;
  onCancel: () => void;
  /** Muestra el reintento solo si la fotografía fallida sigue seleccionada. */
  canRetryCurrent: boolean;
  testIDPrefix?: string;
}

/**
 * Estado visible del envío de una evidencia. El éxito solo se muestra con una
 * evidencia confirmada por MS4 (respuesta válida o encontrada en la consulta).
 */
export function EvidenceUploadStatus({
  state,
  onRetry,
  onCancel,
  canRetryCurrent,
  testIDPrefix = 'evidence-upload',
}: EvidenceUploadStatusProps) {
  switch (state.status) {
    case 'preparing':
    case 'sending':
    case 'verifying': {
      const text =
        state.status === 'preparing'
          ? 'Validando y preparando la fotografía...'
          : state.status === 'verifying'
            ? 'Comprobando si la fotografía llegó al servidor...'
            : state.progress === null
              ? 'Enviando fotografía...'
              : `Enviando fotografía... ${Math.round(state.progress * 100)} %`;
      return (
        <View
          testID={`${testIDPrefix}-${state.status}`}
          accessibilityRole="progressbar"
          accessibilityLiveRegion="polite"
          style={styles.progress}
        >
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.progressText}>{text}</Text>
          {state.status === 'sending' ? (
            <Button
              testID={`${testIDPrefix}-cancel`}
              title="Cancelar envío"
              variant="outline"
              onPress={onCancel}
              style={styles.cancel}
            />
          ) : null}
        </View>
      );
    }
    case 'failed':
      return (
        <ErrorMessage
          testID={`${testIDPrefix}-error`}
          title={state.canceled ? 'Envío cancelado' : 'No se envió la evidencia'}
          message={state.message}
          onRetry={state.canRetry && canRetryCurrent ? onRetry : undefined}
          retryLabel="Reintentar envío"
          style={styles.feedback}
        />
      );
    case 'success':
      return (
        <View testID={`${testIDPrefix}-success`} accessibilityRole="alert" style={styles.success}>
          <Text style={styles.successTitle}>Evidencia registrada</Text>
          <Text style={styles.successText}>
            {`${state.evidence.originalName} · ${formatDate(state.evidence.createdAt)}`}
          </Text>
          {state.recovered ? (
            <Text testID={`${testIDPrefix}-recovered`} style={styles.successText}>
              La fotografía ya estaba guardada en el servidor; no se volvió a enviar.
            </Text>
          ) : null}
        </View>
      );
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  progress: {
    marginTop: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  progressText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  cancel: {
    minHeight: 44,
    alignSelf: 'stretch',
  },
  feedback: {
    marginTop: spacing.md,
  },
  success: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.successSoft,
  },
  successTitle: {
    color: colors.success,
    fontWeight: '800',
  },
  successText: {
    marginTop: spacing.xs,
    color: colors.text,
    fontSize: 13,
  },
});
