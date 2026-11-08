import { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';

import { Button, Card } from '@/components/common';
import { EvidencePhotoPicker } from '@/components/evidence/EvidencePhotoPicker';
import { EvidenceUploadStatus } from '@/components/evidence/EvidenceUploadStatus';
import { spacing } from '@/constants/theme';
import { useEvidencePicker } from '@/hooks/useEvidencePicker';
import { useEvidenceUpload } from '@/hooks/useEvidenceUpload';
import type { EvidenceContext } from '@/models/evidence.model';

export interface EvidenceCapturePanelProps {
  /** Orden a la que se adjunta la evidencia (identificador de la ruta). */
  orderId: string;
}

/**
 * Captura o selección de una fotografía y su envío como evidencia de la orden.
 * Seleccionar no envía nada: la carga solo ocurre al pulsar "Enviar evidencia".
 */
export function EvidenceCapturePanel({ orderId }: EvidenceCapturePanelProps) {
  const picker = useEvidencePicker(orderId);
  const uploader = useEvidenceUpload(orderId);
  const [context, setContext] = useState<EvidenceContext>('reparacion');

  const { file, clear } = picker;
  const { state, upload } = uploader;

  const send = useCallback(async () => {
    if (!file) return;
    const evidence = await upload(file, context);
    // Una evidencia confirmada no debe poder reenviarse por error.
    if (evidence) clear();
  }, [clear, context, file, upload]);

  const retry = useCallback(async () => {
    if (await uploader.retry()) clear();
  }, [clear, uploader]);

  const inFlight =
    state.status === 'preparing' || state.status === 'sending' || state.status === 'verifying';
  const busy = inFlight || picker.isPicking;

  // Tras un fallo con resultado incierto la misma fotografía solo se reintenta
  // (con verificación previa): "Enviar" podría duplicarla.
  const failedWithSameFile = state.status === 'failed' && file !== null && state.file === file;
  const mustVerifyFirst = failedWithSameFile && state.outcome === 'uncertain';

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

      {file && !inFlight && !mustVerifyFirst ? (
        <Button
          testID="evidence-send"
          title="Enviar evidencia"
          disabled={picker.isPicking}
          onPress={send}
          style={styles.send}
        />
      ) : null}

      <EvidenceUploadStatus
        state={state}
        onRetry={retry}
        onCancel={uploader.cancel}
        canRetryCurrent={failedWithSameFile}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  send: {
    marginTop: spacing.md,
  },
});
