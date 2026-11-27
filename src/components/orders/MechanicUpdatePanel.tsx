import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  Button,
  Card,
  EmptyState,
  ErrorMessage,
  Input,
  Loading,
} from '@/components/common';
import { EvidencePhotoPicker } from '@/components/evidence/EvidencePhotoPicker';
import { EvidenceUploadStatus } from '@/components/evidence/EvidenceUploadStatus';
import { ORDER_STATUS, getOrderStatusLabel } from '@/constants/orderStatus';
import { colors, radius, spacing } from '@/constants/theme';
import { useDataQuery } from '@/hooks/useDataQuery';
import { useEvidencePicker } from '@/hooks/useEvidencePicker';
import { useEvidenceUpload } from '@/hooks/useEvidenceUpload';
import type { Evidence, EvidenceContext } from '@/models/evidence.model';
import type { OrderLogEntry, OrderLogType } from '@/models/order-log.model';
import type { WorkOrder } from '@/models/order.model';
import { orderLogService } from '@/services/order-log.service';
import {
  mechanicUpdateSchema,
  type MechanicUpdateFormValues,
} from '@/schemas/mechanic-update.schema';
import { formatDate } from '@/utils/formatters';

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
  | { status: 'partial'; entry: OrderLogEntry };

export interface MechanicUpdatePanelProps {
  order: WorkOrder;
}

export function MechanicUpdatePanel({ order }: MechanicUpdatePanelProps) {
  const orderId = order.id;
  const allowsPhoto = acceptsEvidence(order.status);

  const picker = useEvidencePicker(orderId);
  const uploader = useEvidenceUpload(orderId);

  const [context, setContext] = useState<EvidenceContext>('reparacion');
  const [submit, setSubmit] = useState<SubmitState>({ status: 'idle' });
  const [showLog, setShowLog] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<MechanicUpdateFormValues>({
    resolver: zodResolver(mechanicUpdateSchema),
    defaultValues: {
      type: 'observacion',
      description: '',
    },
    mode: 'onBlur',
  });

 

  const inFlightRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadLog = useMemo(
    () => (showLog ? () => orderLogService.getOrderLog(orderId) : null),
    [orderId, showLog],
  );

  const log = useDataQuery(
    loadLog,
    'No fue posible cargar los avances de la orden.',
  );

  const { refresh: refreshLog } = log;
  const { file, clear: clearPhoto } = picker;
  const { upload: uploadEvidence, retry: retryEvidence } = uploader;

  const settlePhoto = useCallback(
    (entry: OrderLogEntry, evidence: Evidence | null) => {
      if (!isMountedRef.current) return;

      if (evidence) {
        clearPhoto();
        setSubmit({ status: 'done', entry, evidence });
      } else {
        setSubmit({ status: 'partial', entry });
      }
    },
    [clearPhoto],
  );

  const uploadPhoto = useCallback(
    async (entry: OrderLogEntry) => {
      if (!file) {
        setSubmit({ status: 'done', entry, evidence: null });
        return;
      }

      setSubmit({ status: 'uploading', entry });
      settlePhoto(entry, await uploadEvidence(file, context));
    },
    [context, file, settlePhoto, uploadEvidence],
  );

  const executeRegister = useCallback(
    async (values: MechanicUpdateFormValues) => {
      if (inFlightRef.current) return;

      inFlightRef.current = true;
      setSubmit({ status: 'saving' });

      try {
        let entry: OrderLogEntry;

        try {
          entry = await orderLogService.addOrderLogEntry(orderId, {
            type: values.type,
            description: values.description.trim(),
          });
        } catch (error: unknown) {
          if (!isMountedRef.current) return;

          setSubmit({
            status: 'error',
            message:
              error instanceof Error
                ? error.message
                : 'No fue posible registrar el avance.',
          });
          return;
        }

        if (!isMountedRef.current) return;

        reset({
          type: values.type,
          description: '',
        });

        if (showLog) {
          void refreshLog();
        } else {
          setShowLog(true);
        }

        await uploadPhoto(entry);
      } finally {
        inFlightRef.current = false;
      }
    },
    [orderId, reset, refreshLog, showLog, uploadPhoto],
  );

  const confirmRegister = useCallback(
    (values: MechanicUpdateFormValues) => {
      if (inFlightRef.current) return;

      const description = values.description.trim();

      Alert.alert(
        'Confirmar registro',
        `¿Quieres registrar esta ${values.type === 'observacion' ? 'observación' : 'acción'} en la orden ${orderId}?\n\n"${description}"`,
        [
          {
            text: 'Volver',
            style: 'cancel',
          },
          {
            text: 'Confirmar',
            onPress: () => {
              void executeRegister(values);
            },
          },
        ],
      );
    },
    [executeRegister, orderId],
  );

  const retryPhoto = useCallback(async () => {
    if (inFlightRef.current || submit.status !== 'partial') return;

    inFlightRef.current = true;
    const { entry } = submit;

    try {
      setSubmit({ status: 'uploading', entry });
      settlePhoto(entry, await retryEvidence());
    } finally {
      inFlightRef.current = false;
    }
  }, [retryEvidence, settlePhoto, submit]);

  const finishWithoutPhoto = useCallback(() => {
    if (submit.status !== 'partial') return;

    clearPhoto();
    uploader.reset();
    setSubmit({
      status: 'done',
      entry: submit.entry,
      evidence: null,
    });
  }, [clearPhoto, submit, uploader]);

  const photoFailure =
    uploader.state.status === 'failed' ? uploader.state : null;

  const isPartial = submit.status === 'partial';
  const isWorking =
    submit.status === 'saving' || submit.status === 'uploading';
  const formLocked = isWorking || isPartial;

  return (
    <Card
      testID="order-update-panel"
      title="Avances del mecánico"
      subtitle={`Orden ${orderId} · ${getOrderStatusLabel(order.status)}`}
    >
      <Text style={styles.label}>Tipo de avance</Text>

      <Controller
        control={control}
        name="type"
        render={({ field: { value, onChange } }) => (
          <View style={styles.chips} accessibilityRole="radiogroup">
            {LOG_TYPES.map((option) => {
              const selected = option.value === value;

              return (
                <Pressable
                  key={option.value}
                  testID={`order-update-type-${option.value}`}
                  accessibilityRole="radio"
                  accessibilityState={{
                    checked: selected,
                    disabled: formLocked,
                  }}
                  disabled={formLocked}
                  onPress={() => onChange(option.value)}
                  style={[
                    styles.chip,
                    selected && styles.chipSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selected && styles.chipTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      />

      <Controller
        control={control}
        name="description"
        render={({ field: { value, onChange, onBlur } }) => (
          <Input
            testID="order-update-description"
            label="Descripción"
            placeholder="Qué observaste o qué hiciste en el vehículo"
            multiline
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            editable={!formLocked}
            error={errors.description?.message}
          />
        )}
      />

      {allowsPhoto ? (
        <>
          <Text style={styles.label}>Fotografía (opcional)</Text>
          <EvidencePhotoPicker
            picker={picker}
            context={context}
            onContextChange={setContext}
            disabled={formLocked}
            testIDPrefix="order-update-photo"
          />
        </>
      ) : (
        <Text
          testID="order-update-photo-closed"
          style={styles.notice}
        >
          {`La orden está ${getOrderStatusLabel(order.status).toLowerCase()}: ya no admite fotografías.`}
        </Text>
      )}

      {!isPartial ? (
        <Button
          testID="order-update-submit"
          title={
            submit.status === 'uploading'
              ? 'Enviando fotografía...'
              : 'Registrar avance'
          }
          loading={isWorking}
          disabled={picker.isPicking || isWorking}
onPress={() => {
  void handleSubmit(confirmRegister)();
}}
          style={styles.submit}
        />
      ) : null}

      {submit.status === 'uploading' ? (
        <EvidenceUploadStatus
          state={uploader.state}
          onRetry={retryPhoto}
          onCancel={uploader.cancel}
          canRetryCurrent={false}
          testIDPrefix="order-update-photo-upload"
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
        <View
          testID="order-update-partial"
          accessibilityRole="alert"
          style={styles.partial}
        >
          <Text style={styles.partialTitle}>
            Avance registrado sin fotografía
          </Text>
          <Text style={styles.partialText}>
            {`El avance quedó registrado (${formatDate(submit.entry.createdAt)}), pero la fotografía no se envió: ${photoFailure?.message ?? ''}`}
          </Text>

          {photoFailure?.canRetry ? (
            <Button
              testID="order-update-retry-photo"
              title="Reintentar envío de la fotografía"
              onPress={retryPhoto}
              style={styles.submit}
            />
          ) : null}

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
        <View
          testID="order-update-success"
          accessibilityRole="alert"
          style={styles.success}
        >
          <Text style={styles.successTitle}>
            {submit.evidence
              ? 'Avance y fotografía registrados'
              : 'Avance registrado'}
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
        <Loading
          testID="order-log-loading"
          message="Cargando avances..."
        />
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
            <View
              key={entry.id}
              testID={`order-log-entry-${entry.id}`}
              style={styles.entry}
            >
              <Text style={styles.entryMeta}>
                {`${TYPE_LABELS[entry.type]} · ${formatDate(entry.createdAt)} · usuario ${entry.authorUserId}`}
              </Text>
              <Text style={styles.entryText}>
                {entry.description}
              </Text>
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