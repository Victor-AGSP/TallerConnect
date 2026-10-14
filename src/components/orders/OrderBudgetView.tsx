import { useCallback, useMemo, useState } from 'react';

import { StyleSheet, Text, View } from 'react-native';

import {
  Button,
  Card,
  EmptyState,
  ErrorMessage,
  Input,
  Loading,
} from '@/components/common';
import { AppScreen } from '@/components/layout/AppScreen';
import { StatusPill, type StatusTone } from '@/components/ui/StatusPill';
import { useDataQuery } from '@/hooks/useDataQuery';
import { colors, spacing } from '@/constants/theme';
import type {
  Budget,
  BudgetDecisionInput,
  BudgetDecisionResult,
  BudgetDecisionValue,
  BudgetItem,
  BudgetOrderEffect,
  BudgetVersion,
  BudgetVersionStatus,
  MissingPart,
} from '@/models/budget.model';
import { DecisionApplicationPendingError } from '@/services/budgets.service';
import { formatDate } from '@/utils/formatters';

/** Operaciones de decisión: solo se entregan al cliente dueño de la orden. */
export interface BudgetDecisionActions {
  decide: (
    budgetId: string,
    versionNumber: number,
    input: BudgetDecisionInput,
  ) => Promise<BudgetDecisionResult>;
  retryApplication: (decisionId: string) => Promise<void>;
}

export interface OrderBudgetViewProps {
  eyebrow: string;

  /** Identificador de la orden recibido en la ruta. Puede llegar vacío. */
  orderId?: string;

  /** Debe ser estable entre renderizados porque dispara la carga. */
  loadBudget: (orderId: string) => Promise<Budget | null>;

  /** Solo para el cliente dueño de la orden. */
  decisionActions?: BudgetDecisionActions;
}

/** Resultado de una decisión ya aplicada, que se conserva tras recargar. */
interface DecisionOutcome {
  message: string;
  missingParts: MissingPart[];
}

const FALLBACK_ERROR = 'No fue posible cargar el presupuesto.';

const VERSION_STATUS: Record<BudgetVersionStatus, { label: string; tone: StatusTone }> = {
  borrador: { label: 'Borrador', tone: 'info' },
  enviada: { label: 'Esperando decisión', tone: 'warning' },
  aprobada: { label: 'Aprobado', tone: 'success' },
  rechazada: { label: 'Rechazado', tone: 'danger' },
};

const EFFECT_MESSAGES: Record<BudgetOrderEffect, string> = {
  esperando_aprobacion: 'La orden queda esperando la aprobación del presupuesto.',
  en_reparacion: 'Presupuesto aprobado. La orden pasa a reparación.',
  esperando_repuestos:
    'Presupuesto aprobado. La orden queda esperando repuestos.',
  cancelado: 'Presupuesto rechazado. El servicio de la orden fue cancelado.',
};

/** Formatea un importe decimal del MS3 como pesos chilenos. */
export function formatBudgetAmount(amount: string): string {
  const value = Number(amount);
  if (amount.trim() === '' || !Number.isFinite(value)) return amount;
  return `$${value.toLocaleString('es-CL', { maximumFractionDigits: 2 })}`;
}

function formatQuantity(quantity: string): string {
  const value = Number(quantity);
  if (quantity.trim() === '' || !Number.isFinite(value)) return quantity;
  return value.toLocaleString('es-CL', { maximumFractionDigits: 2 });
}

/**
 * Presupuesto de una orden de trabajo (MS3): versión más reciente visible,
 * ítems, importes y estado. El cliente puede además aprobar o rechazar la
 * versión enviada.
 */
export function OrderBudgetView({
  eyebrow,
  orderId,
  loadBudget,
  decisionActions,
}: OrderBudgetViewProps) {
  const query = useMemo(
    () => (orderId ? () => loadBudget(orderId) : null),
    [loadBudget, orderId],
  );

  const { data: budget, errorMessage, isLoading, isRefreshing, refresh } =
    useDataQuery(query, FALLBACK_ERROR);

  const [outcome, setOutcome] = useState<DecisionOutcome | null>(null);

  const handleDecided = useCallback(
    (result: DecisionOutcome) => {
      setOutcome(result);
      void refresh();
    },
    [refresh],
  );

  const version = budget ? budget.versions[budget.versions.length - 1] : undefined;

  return (
    <AppScreen
      eyebrow={eyebrow}
      title={orderId ? `Presupuesto de la orden ${orderId}` : 'Presupuesto'}
      subtitle="Detalle del presupuesto, sus ítems y su estado."
    >
      {!orderId ? (
        <EmptyState
          testID="order-budget-missing-id"
          title="Orden no encontrada"
          message="No se indicó de qué orden de trabajo se quiere ver el presupuesto."
        />
      ) : isLoading || (isRefreshing && !budget) ? (
        <Loading testID="order-budget-loading" message="Cargando presupuesto..." />
      ) : errorMessage ? (
        <ErrorMessage
          testID="order-budget-error"
          message={errorMessage}
          onRetry={refresh}
        />
      ) : !budget || !version ? (
        <EmptyState
          testID="order-budget-empty"
          title="Sin presupuesto"
          message="La orden todavía no tiene un presupuesto disponible."
          actionLabel="Actualizar"
          onAction={refresh}
        />
      ) : (
        <>
          <Button
            testID="order-budget-refresh"
            title="Actualizar"
            variant="outline"
            loading={isRefreshing}
            onPress={refresh}
            style={styles.refreshButton}
          />

          {outcome ? (
            <Card
              testID="order-budget-decision-result"
              accessibilityLiveRegion="polite"
            >
              <Text style={styles.resultText}>{outcome.message}</Text>
              {outcome.missingParts.length > 0 ? (
                <View testID="order-budget-missing-parts" style={styles.form}>
                  <Text style={styles.label}>REPUESTOS FALTANTES</Text>
                  {outcome.missingParts.map((part) => (
                    <Text key={part.partId} style={styles.muted}>
                      {part.name}: se requieren {formatQuantity(part.required)}, hay{' '}
                      {part.available}
                    </Text>
                  ))}
                </View>
              ) : null}
            </Card>
          ) : null}

          <Card testID={`order-budget-${budget.id}`}>
            <BudgetVersionDetail budget={budget} version={version} />

            {decisionActions &&
            version.status === 'enviada' &&
            !version.decision ? (
              <BudgetDecisionForm
                key={`${budget.id}-${version.number}`}
                budget={budget}
                version={version}
                actions={decisionActions}
                onDecided={handleDecided}
              />
            ) : null}
          </Card>
        </>
      )}
    </AppScreen>
  );
}

function BudgetVersionDetail({
  budget,
  version,
}: {
  budget: Budget;
  version: BudgetVersion;
}) {
  const status = VERSION_STATUS[version.status];
  const total = formatBudgetAmount(version.total);

  return (
    <View testID={`order-budget-version-${version.number}`}>
      <View style={styles.header}>
        <View
          accessible
          accessibilityLabel={`Total del presupuesto: ${total}`}
        >
          <Text style={styles.label}>TOTAL · VERSIÓN {version.number}</Text>
          <Text style={styles.amount}>{total}</Text>
        </View>

        <StatusPill
          label={status.label}
          tone={status.tone}
          accessibilityLabel={`Estado del presupuesto: ${status.label}`}
        />
      </View>

      {version.isModification ? (
        <Text style={styles.muted}>Modificación de un presupuesto anterior.</Text>
      ) : null}

      {budget.currentVersion != null && budget.currentVersion !== version.number ? (
        <Text style={styles.muted}>
          Versión aprobada vigente: {budget.currentVersion}
        </Text>
      ) : null}

      {version.items.length === 0 ? (
        <Text style={styles.muted}>Esta versión no tiene ítems.</Text>
      ) : (
        version.items.map((item) => <BudgetItemRow key={item.id} item={item} />)
      )}

      {version.decision ? (
        <Text testID="order-budget-decision" style={styles.decision}>
          {version.decision.decision === 'aprobado' ? 'Aprobado' : 'Rechazado'} el{' '}
          {formatDate(version.decision.decidedAt)}
          {version.decision.reason ? `. Motivo: ${version.decision.reason}` : ''}
        </Text>
      ) : null}
    </View>
  );
}

function BudgetItemRow({ item }: { item: BudgetItem }) {
  const kind = item.type === 'repuesto' ? 'Repuesto' : 'Mano de obra';
  const detail = `${formatQuantity(item.quantity)} × ${formatBudgetAmount(item.unitPrice)}`;
  const part =
    item.type === 'repuesto' && (item.partName || item.supplierName)
      ? [item.partName, item.supplierName].filter(Boolean).join(' · ')
      : null;
  const subtotal = formatBudgetAmount(item.subtotal);

  return (
    <View
      testID={`order-budget-item-${item.id}`}
      accessible
      accessibilityLabel={`${kind}: ${item.description}. ${detail}. ${
        part ? `${part}. ` : ''
      }Subtotal: ${subtotal}`}
      style={styles.item}
    >
      <View style={styles.itemText}>
        <Text style={styles.itemDescription}>{item.description}</Text>
        <Text style={styles.muted}>
          {kind} · {detail}
        </Text>
        {part ? <Text style={styles.muted}>{part}</Text> : null}
      </View>
      <Text style={styles.itemSubtotal}>{subtotal}</Text>
    </View>
  );
}

type FormState =
  | { kind: 'idle' }
  | { kind: 'confirming'; decision: BudgetDecisionValue }
  | { kind: 'submitting'; decision: BudgetDecisionValue }
  | { kind: 'pending'; decisionId: string; message: string; retrying: boolean };

function BudgetDecisionForm({
  budget,
  version,
  actions,
  onDecided,
}: {
  budget: Budget;
  version: BudgetVersion;
  actions: BudgetDecisionActions;
  onDecided: (outcome: DecisionOutcome) => void;
}) {
  const [reason, setReason] = useState('');
  const [state, setState] = useState<FormState>({ kind: 'idle' });
  const [error, setError] = useState<string | null>(null);

  // Rechazar antes de la primera aprobación cancela el servicio (contrato MS3).
  const rejectionCancels = budget.currentVersion == null;

  const startConfirmation = (decision: BudgetDecisionValue) => {
    if (decision === 'rechazado' && !reason.trim()) {
      setError('Indica el motivo del rechazo.');
      return;
    }
    setError(null);
    setState({ kind: 'confirming', decision });
  };

  const submit = async (decision: BudgetDecisionValue) => {
    setState({ kind: 'submitting', decision });
    setError(null);

    try {
      const result = await actions.decide(budget.id, version.number, {
        decision,
        reason: reason.trim() || undefined,
        confirmCancellation: decision === 'rechazado' && rejectionCancels,
      });

      onDecided({
        message: result.orderEffect
          ? EFFECT_MESSAGES[result.orderEffect]
          : 'Decisión registrada. El estado de la orden no cambia.',
        missingParts: result.missingParts,
      });
    } catch (caught: unknown) {
      if (caught instanceof DecisionApplicationPendingError) {
        setState({
          kind: 'pending',
          decisionId: caught.decisionId,
          message: caught.message,
          retrying: false,
        });
        return;
      }
      setState({ kind: 'idle' });
      setError(caught instanceof Error ? caught.message : 'No fue posible registrar tu decisión.');
    }
  };

  const retryApplication = async (decisionId: string, message: string) => {
    setState({ kind: 'pending', decisionId, message, retrying: true });
    setError(null);

    try {
      await actions.retryApplication(decisionId);
      onDecided({
        message: 'Tu decisión ya se aplicó en la orden.',
        missingParts: [],
      });
    } catch (caught: unknown) {
      setState({ kind: 'pending', decisionId, message, retrying: false });
      if (!(caught instanceof DecisionApplicationPendingError)) {
        setError(caught instanceof Error ? caught.message : 'No fue posible aplicar la decisión en la orden.');
      }
    }
  };

  if (state.kind === 'pending') {
    return (
      <View testID="order-budget-decision-pending" style={styles.form}>
        <Text style={styles.resultText}>{state.message}</Text>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <Button
          testID="order-budget-retry-application"
          title="Reintentar aplicación"
          variant="outline"
          loading={state.retrying}
          onPress={() => retryApplication(state.decisionId, state.message)}
        />
      </View>
    );
  }

  const submitting = state.kind === 'submitting';
  const pendingDecision =
    state.kind === 'confirming' || state.kind === 'submitting' ? state.decision : null;

  return (
    <View testID="order-budget-decision-form" style={styles.form}>
      <Input
        testID="order-budget-reason"
        label="Motivo (obligatorio para rechazar)"
        value={reason}
        onChangeText={setReason}
        editable={!submitting}
        maxLength={1000}
        multiline
      />

      {rejectionCancels ? (
        <Text style={styles.warning}>
          Si rechazas este presupuesto se cancelará el servicio de la orden.
        </Text>
      ) : null}

      {error ? (
        <Text testID="order-budget-decision-error" accessibilityRole="alert" style={styles.errorText}>
          {error}
        </Text>
      ) : null}

      {pendingDecision ? (
        <>
          <Text style={styles.resultText}>
            {pendingDecision === 'aprobado'
              ? `¿Confirmas que apruebas el presupuesto por ${formatBudgetAmount(version.total)}?`
              : rejectionCancels
                ? '¿Confirmas que rechazas el presupuesto y cancelas el servicio?'
                : '¿Confirmas que rechazas esta modificación del presupuesto?'}
          </Text>
          <Button
            testID="order-budget-confirm"
            title={pendingDecision === 'aprobado' ? 'Confirmar aprobación' : 'Confirmar rechazo'}
            variant={pendingDecision === 'aprobado' ? 'primary' : 'danger'}
            loading={submitting}
            onPress={() => submit(pendingDecision)}
          />
          <Button
            title="Volver"
            variant="outline"
            disabled={submitting}
            onPress={() => setState({ kind: 'idle' })}
          />
        </>
      ) : (
        <>
          <Button
            testID="order-budget-approve"
            title="Aprobar presupuesto"
            onPress={() => startConfirmation('aprobado')}
          />
          <Button
            testID="order-budget-reject"
            title="Rechazar presupuesto"
            variant="danger"
            onPress={() => startConfirmation('rechazado')}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  refreshButton: {
    alignSelf: 'flex-end',
    minHeight: 40,
    paddingHorizontal: spacing.md,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },

  label: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  amount: {
    marginTop: spacing.xs,
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
  },

  muted: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: 13,
  },

  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  itemText: {
    flex: 1,
  },

  itemDescription: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },

  itemSubtotal: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },

  decision: {
    marginTop: spacing.md,
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },

  form: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },

  warning: {
    color: colors.warning,
    fontSize: 13,
    fontWeight: '700',
  },

  errorText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700',
  },

  resultText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
});
