import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, ErrorMessage } from '@/components/common';
import { EvidencePhotoPicker } from '@/components/evidence/EvidencePhotoPicker';
import { colors, radius, spacing } from '@/constants/theme';
import { useEvidencePicker } from '@/hooks/useEvidencePicker';
import type { Evidence, EvidenceContext } from '@/models/evidence.model';
import { evidenceService } from '@/services/evidence.service';
import { formatDate } from '@/utils/formatters';

export interface EvidenceCapturePanelProps {
  /** Orden a la que se adjunta la evidencia (identificador de la ruta). */
  orderId: string;
}

type UploadState =
  | { status: 'idle' }
  | { status: 'sending' }
  | { status: 'success'; evidence: Evidence }
  | { status: 'error'; message: string };

/**
 * Captura o selección de una fotografía y su envío como evidencia de la orden.
 * Seleccionar no envía nada: la carga solo ocurre al pulsar "Enviar evidencia".
 */
export function EvidenceCapturePanel({ orderId }: EvidenceCapturePanelProps) {
  const picker = useEvidencePicker(orderId);
  const [context, setContext] = useState<EvidenceContext>('reparacion');
  const [upload, setUpload] = useState<UploadState>({ status: 'idle' });

  const sendingRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const { file, clear } = picker;

  const send = useCallback(async () => {
    // Bloqueo síncrono: una segunda pulsación antes del nuevo render no envía otra vez.
    if (!file || sendingRef.current) return;
    sendingRef.current = true;
    setUpload({ status: 'sending' });

    try {
      const evidence = await evidenceService.uploadEvidence({ orderId, file, context });
      if (!isMountedRef.current) return;
      clear();
      setUpload({ status: 'success', evidence });
    } catch (error: unknown) {
      if (!isMountedRef.current) return;
      setUpload({
        status: 'error',
        message: error instanceof Error ? error.message : 'No fue posible subir la evidencia.',
      });
    } finally {
      sendingRef.current = false;
    }
  }, [clear, context, file, orderId]);

  const isSending = upload.status === 'sending';
  const busy = isSending || picker.isPicking;

  return (
    <Card
      testID="evidence-capture-panel"
      title="Evidencia fotográfica"
      subtitle={`Se adjuntará a la orden ${orderId}.`}
    >
      <EvidencePhotoPicker
        picker={picker}
        context={context}
        onContextChange={setContext}
        disabled={busy}
      />

      {file ? (
        <Button
          testID="evidence-send"
          title="Enviar evidencia"
          loading={isSending}
          disabled={picker.isPicking}
          onPress={send}
          style={styles.send}
        />
      ) : null}

      {upload.status === 'error' ? (
        <ErrorMessage
          testID="evidence-upload-error"
          title="No se envió la evidencia"
          message={upload.message}
          style={styles.feedback}
        />
      ) : null}

      {upload.status === 'success' ? (
        <View testID="evidence-upload-success" accessibilityRole="alert" style={styles.success}>
          <Text style={styles.successTitle}>Evidencia registrada</Text>
          <Text style={styles.successText}>
            {`${upload.evidence.originalName} · ${formatDate(upload.evidence.createdAt)}`}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  send: {
    marginTop: spacing.md,
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
