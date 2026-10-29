import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  Button,
  Card,
  EmptyState,
  ErrorMessage,
  Input,
  Loading,
} from '@/components/common';
import { EvidencePhotoPicker } from '@/components/evidence/EvidencePhotoPicker';
import { ORDER_STATUS, getOrderStatusLabel } from '@/constants/orderStatus';
import { colors, radius, spacing } from '@/constants/theme';
import { useDataQuery } from '@/hooks/useDataQuery';
import { useEvidencePicker } from '@/hooks/useEvidencePicker';
import type { Evidence, EvidenceContext } from '@/models/evidence.model';
import type { OrderLogEntry, OrderLogType } from '@/models/order-log.model';
import type { WorkOrder } from '@/models/order.model';
import { evidenceService } from '@/services/evidence.service';
import { orderLogService } from '@/services/order-log.service';
import { formatDate } from '@/utils/formatters';

/** MS4 rechaza evidencias de órdenes entregadas o canceladas (409). */
const EVIDENCE_CLOSED_STATUSES: readonly string[] = [
  ORDER_STATUS.ENTREGADO,
  ORDER_STATUS.CANCELADO,
];

export function acceptsEvidence(status: string): boolean {
  return !EVIDENCE_CLOSED_STATUSES.includes(status);
}

const LOG_TYPES: { value: OrderLogType; label: string }[] = [
  { value: 'observacion', label: 'Observación' },
  { value: 'accion', label: 'Acción' },
];

const TYPE_LABELS: Record<OrderLogType, string> = {
  observacion: 'Observación',
  accion: 'Acción',
};

type SubmitState =
  | { status: 'idle' }
  | { status: 'saving' }
  | { status: 'uploading'; entry: OrderLogEntry }
  | { status: 'done'; entry: OrderLogEntry; evidence: Evidence | null }
  | { status: 'error'; message: string }
  /** El avance quedó registrado pero la fotografía no se envió. */
  | { status: 'partial'; entry: OrderLogEntry; message: string };

export interface MechanicUpdatePanelProps {
  order: WorkOrder;
}

/**
 * Avances del mecánico sobre la orden: bitácora de MS2 (observación o acción)
 * con una fotografía opcional que se sube a MS4.
 *
 * MS2 y MS4 no comparten identificadores: la fotografía queda asociada a la
 * orden y a su etapa, no a la entrada de bitácora. Por eso el avance se
 * registra primero y la fotografía después; si la fotografía falla, el avance
 * no se vuelve a enviar y solo se reintenta la carga.
 */
export function MechanicUpdatePanel({ order }: MechanicUpdatePanelProps) {
  const orderId = order.id;
  const allowsPhoto = acceptsEvidence(order.status);

  const picker = useEvidencePicker(orderId);
  const [type, setType] = useState<OrderLogType>('observacion');
  const [description, setDescription] = useState('');
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [context, setContext] = useState<EvidenceContext>('reparacion');
  const [submit, setSubmit] = useState<SubmitState>({ status: 'idle' });

  const inFlightRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // La bitácora se consulta bajo demanda: abrir la orden no genera más solicitudes.
  const [showLog, setShowLog] = useState(false);
  const loadLog = useMemo(
    () => (showLog ? () => orderLogService.getOrderLog(orderId) : null),
    [orderId, showLog],
  );
  const log = useDataQuery(loadLog, 'No fue posible cargar los avances de la orden.');
  const { refresh: refreshLog } = log;

  const { file, clear: clearPhoto } = picker;

  const uploadPhoto = useCallback(
    async (entry: OrderLogEntry) => {
      if (!file) {
        setSubmit({ status: 'done', entry, evidence: null });
        return;
      }
      setSubmit({ status: 'uploading', entry });
      try {
        const evidence = await evidenceService.uploadEvidence({ orderId, file, context });
        if (!isMountedRef.current) return;
        clearPhoto();
        setSubmit({ status: 'done', entry, evidence });
      } catch (error: unknown) {
        if (!isMountedRef.current) return;
        setSubmit({
          status: 'partial',
          entry,
          message:
            error instanceof Error ? error.message : 'No fue posible subir la fotografía.',
        });
      }
    },
    [clearPhoto, context, file, orderId],
  );

  const register = useCallback(async () => {
    // Bloqueo síncrono contra la doble pulsación.
    if (inFlightRef.current) return;

    const text = description.trim();
    if (!text) {
      setDescriptionError('Describe el avance realizado.');
      return;
    }
    setDescriptionError(null);

    inFlightRef.current = true;
    setSubmit({ status: 'saving' });
    try {
      let entry: OrderLogEntry;
      try {
        entry = await orderLogService.addOrderLogEntry(orderId, { type, description: text });
      } catch (error: unknown) {
        if (!isMountedRef.current) return;
        setSubmit({
          status: 'error',
          message: error instanceof Error ? error.message : 'No fue posible registrar el avance.',
        });
        return;
      }
      if (!isMountedRef.current) return;

      // El avance ya existe en el servidor: el texto no se vuelve a enviar.
      setDescription('');
      if (showLog) {
        void refreshLog();
      } else {
        setShowLog(true);
      }
      await uploadPhoto(entry);
    } finally {
      inFlightRef.current = false;
    }
  }, [description, orderId, refreshLog, showLog, type, uploadPhoto]);

  const retryPhoto = useCallback(async () => {
    if (inFlightRef.current || submit.status !== 'partial') return;
    inFlightRef.current = true;
    try {
      await uploadPhoto(submit.entry);
    } finally {
      inFlightRef.current = false;
    }
  }, [submit, uploadPhoto]);

  const finishWithoutPhoto = useCallback(() => {
    if (submit.status !== 'partial') return;
    clearPhoto();
    setSubmit({ status: 'done', entry: submit.entry, evidence: null });
  }, [clearPhoto, submit]);

  const isPartial = submit.status === 'partial';
  const isWorking = submit.status === 'saving' || submit.status === 'uploading';
  const formLocked = isWorking || isPartial;

  return (
    <Card
      testID="order-update-panel"
      title="Avances del mecánico"
      subtitle={`Orden ${orderId} · ${getOrderStatusLabel(order.status)}`}
    >
      <Text style={styles.label}>Tipo de avance</Text>
      <View style={styles.chips} accessibilityRole="radiogroup">
        {LOG_TYPES.map((option) => {
          const selected = option.value === type;
          return (
            <Pressable
              key={option.value}
              testID={`order-update-type-${option.value}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected, disabled: formLocked }}
              disabled={formLocked}
              onPress={() => setType(option.value)}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Input
        testID="order-update-description"
        label="Descripción"
        placeholder="Qué observaste o qué hiciste en el vehículo"
        multiline
        value={description}
        onChangeText={setDescription}
        editable={!formLocked}
        error={descriptionError ?? undefined}
      />

      {allowsPhoto ? (
        <>
          <Text style={styles.label}>Fotografía (opcional)</Text>
          <EvidencePhotoPicker
            picker={picker}
            context={context}
            onContextChange={setContext}
            disabled={isWorking || isPartial}
            testIDPrefix="order-update-photo"
          />
        </>
      ) : (
        <Text testID="order-update-photo-closed" style={styles.notice}>
          {`La orden está ${getOrderStatusLabel(order.status).toLowerCase()}: ya no admite fotografías.`}
        </Text>
      )}

      {!isPartial ? (
        <Button
          testID="order-update-submit"
          title={submit.status === 'uploading' ? 'Enviando fotografía...' : 'Registrar avance'}
          loading={isWorking}
          disabled={picker.isPicking}
          onPress={register}
          style={styles.submit}
        />
      ) : null}

      {submit.status === 'error' ? (
        <ErrorMessage
          testID="order-update-error"
          title="No se registró el avance"
          message={submit.message}
          style={styles.feedback}
        />
      ) : null}

      {submit.status === 'partial' ? (
        <View testID="order-update-partial" accessibilityRole="alert" style={styles.partial}>
          <Text style={styles.partialTitle}>Avance registrado sin fotografía</Text>
          <Text style={styles.partialText}>
            {`El avance quedó registrado (${formatDate(submit.entry.createdAt)}), pero la fotografía no se envió: ${submit.message}`}
          </Text>
          <Button
            testID="order-update-retry-photo"
            title="Reintentar envío de la fotografía"
            onPress={retryPhoto}
            style={styles.submit}
          />
          <Button
            testID="order-update-skip-photo"
            title="Continuar sin fotografía"
            variant="outline"
            onPress={finishWithoutPhoto}
            style={styles.submit}
          />
        </View>
      ) : null}

      {submit.status === 'done' ? (
        <View testID="order-update-success" accessibilityRole="alert" style={styles.success}>
          <Text style={styles.successTitle}>
            {submit.evidence ? 'Avance y fotografía registrados' : 'Avance registrado'}
          </Text>
          <Text style={styles.successText}>
            {`${TYPE_LABELS[submit.entry.type]} · ${formatDate(submit.entry.createdAt)}`}
          </Text>
        </View>
      ) : null}

      <Text accessibilityRole="header" style={styles.historyTitle}>
        Avances registrados
      </Text>
      {!showLog ? (
        <Button
          testID="order-log-show"
          title="Ver avances registrados"
          variant="outline"
          onPress={() => setShowLog(true)}
        />
      ) : log.isLoading ? (
        <Loading testID="order-log-loading" message="Cargando avances..." />
      ) : log.errorMessage ? (
        <ErrorMessage
          testID="order-log-error"
          message={log.errorMessage}
          onRetry={log.refresh}
        />
      ) : !log.data || log.data.length === 0 ? (
        <EmptyState
          testID="order-log-empty"
          title="Sin avances"
          message="Aún no hay avances registrados en esta orden."
        />
      ) : (
        <View testID="order-log-list">
          {log.data.map((entry) => (
            <View key={entry.id} testID={`order-log-entry-${entry.id}`} style={styles.entry}>
              <Text style={styles.entryMeta}>
                {`${TYPE_LABELS[entry.type]} · ${formatDate(entry.createdAt)} · usuario ${entry.authorUserId}`}
              </Text>
              <Text style={styles.entryText}>{entry.description}</Text>
              {entry.parts.length > 0 ? (
                <Text style={styles.entryParts}>
                  {`Repuestos: ${entry.parts.map((p) => `${p.name} (${p.quantity})`).join(', ')}`}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  label: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
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
  notice: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    fontSize: 14,
  },
  submit: {
    marginTop: spacing.md,
  },
  feedback: {
    marginTop: spacing.md,
  },
  partial: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.warningSoft,
  },
  partialTitle: {
    color: colors.warning,
    fontWeight: '800',
  },
  partialText: {
    marginTop: spacing.xs,
    color: colors.text,
    fontSize: 13,
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
  historyTitle: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  entry: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  entryMeta: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  entryText: {
    marginTop: spacing.xs,
    color: colors.text,
    fontSize: 14,
  },
  entryParts: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: 12,
  },
});
