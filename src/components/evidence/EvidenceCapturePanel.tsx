import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Card, ErrorMessage } from '@/components/common';
import { colors, radius, spacing } from '@/constants/theme';
import { useEvidencePicker } from '@/hooks/useEvidencePicker';
import type { Evidence, EvidenceContext } from '@/models/evidence.model';
import { evidenceService } from '@/services/evidence.service';
import { formatDate } from '@/utils/formatters';

/**
 * Contextos que el mecánico puede elegir. `presupuesto` se omite: MS4 valida
 * contra MS3 el `presupuesto_id` asociado y esta vista no lo gestiona.
 */
export const MECHANIC_EVIDENCE_CONTEXTS: { value: EvidenceContext; label: string }[] = [
  { value: 'diagnostico', label: 'Diagnóstico' },
  { value: 'reparacion', label: 'Reparación' },
  { value: 'resultado_final', label: 'Resultado final' },
];

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
      <View style={styles.actions}>
        <Button
          testID="evidence-take-photo"
          title={file ? 'Tomar otra fotografía' : 'Tomar fotografía'}
          variant="outline"
          disabled={busy}
          onPress={picker.takePhoto}
          style={styles.action}
        />
        <Button
          testID="evidence-pick-library"
          title={file ? 'Elegir otra de la galería' : 'Elegir de la galería'}
          variant="outline"
          disabled={busy}
          onPress={picker.pickFromLibrary}
          style={styles.action}
        />
      </View>

      {picker.message ? (
        <Text testID="evidence-picker-message" accessibilityRole="alert" style={styles.notice}>
          {picker.message}
        </Text>
      ) : null}

      {file ? (
        <View testID="evidence-preview" style={styles.preview}>
          <Image
            source={{ uri: file.uri }}
            style={styles.previewImage}
            accessibilityLabel={`Vista previa de la fotografía ${file.name}`}
          />
          <Text style={styles.previewName}>{file.name}</Text>

          <Text style={styles.label}>Etapa de la evidencia</Text>
          <View style={styles.contexts} accessibilityRole="radiogroup">
            {MECHANIC_EVIDENCE_CONTEXTS.map((option) => {
              const selected = option.value === context;
              return (
                <Pressable
                  key={option.value}
                  testID={`evidence-context-${option.value}`}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected, disabled: busy }}
                  disabled={busy}
                  onPress={() => setContext(option.value)}
                  style={[styles.chip, selected && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Button
            testID="evidence-send"
            title="Enviar evidencia"
            loading={isSending}
            disabled={picker.isPicking}
            onPress={send}
          />
          <Button
            testID="evidence-remove"
            title="Quitar fotografía"
            variant="outline"
            disabled={busy}
            onPress={clear}
            style={styles.remove}
          />
        </View>
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
  actions: {
    gap: spacing.sm,
  },
  action: {
    minHeight: 44,
  },
  notice: {
    marginTop: spacing.md,
    color: colors.warning,
    fontSize: 14,
  },
  preview: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  previewImage: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSoft,
  },
  previewName: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  label: {
    marginTop: spacing.sm,
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  contexts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  chipText: {
    color: colors.text,
    fontSize: 13,
  },
  chipTextSelected: {
    fontWeight: '800',
  },
  remove: {
    minHeight: 44,
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
