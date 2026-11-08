import { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { Button, Card, EmptyState, ErrorMessage, Loading } from '@/components/common';
import type { UserRole } from '@/constants/roles';
import { colors, radius, spacing } from '@/constants/theme';
import { useDataQuery } from '@/hooks/useDataQuery';
import type { Evidence } from '@/models/evidence.model';
import { evidenceService, type EvidenceDownloadUrl } from '@/services/evidence.service';
import { formatDate } from '@/utils/formatters';

const CONTEXT_LABELS: Record<string, string> = {
  diagnostico: 'Diagnóstico',
  presupuesto: 'Presupuesto',
  reparacion: 'Reparación',
  resultado_final: 'Resultado final',
};

function formatSize(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface OrderEvidenceListProps {
  /** Orden de la ruta; la lista se reinicia (`key`) al cambiar de orden. */
  orderId: string;
  /** Rol de la sección de la app desde la que se consulta. */
  role: UserRole;
}

/**
 * Evidencias de la orden según el alcance que aplica MS4 al solicitante. La
 * autorización la decide el servidor; aquí solo se complementa: el cliente
 * nunca ve evidencias marcadas como no visibles aunque llegaran en la
 * respuesta, y los datos internos (visibilidad, estado) solo se muestran al
 * personal del taller.
 *
 * La lista se consulta bajo demanda y las fotografías se muestran con URL
 * prefirmadas de corta duración, sin caché en disco ni en memoria.
 */
export function OrderEvidenceList({ orderId, role }: OrderEvidenceListProps) {
  const [requested, setRequested] = useState(false);
  const query = useMemo(
    () => (requested ? () => evidenceService.listEvidence(orderId) : null),
    [orderId, requested],
  );
  const { data, errorMessage, isLoading, isRefreshing, refresh } = useDataQuery(
    query,
    'No fue posible cargar las evidencias.',
  );

  const isStaff = role !== 'cliente';
  const evidence = useMemo(
    () => (data ?? []).filter((item) => isStaff || item.visibleToClient),
    [data, isStaff],
  );

  return (
    <Card
      testID="order-evidence-list"
      title="Evidencias de la orden"
      subtitle={`Fotografías registradas para la orden ${orderId}.`}
    >
      {!requested ? (
        <Button
          testID="order-evidence-show"
          title="Ver evidencias"
          variant="outline"
          onPress={() => setRequested(true)}
        />
      ) : isLoading || (isRefreshing && !data) ? (
        <Loading testID="order-evidence-loading" message="Cargando evidencias..." />
      ) : errorMessage ? (
        <ErrorMessage
          testID="order-evidence-error"
          message={errorMessage}
          onRetry={refresh}
        />
      ) : (
        <>
          <Button
            testID="order-evidence-refresh"
            title="Actualizar evidencias"
            variant="outline"
            loading={isRefreshing}
            onPress={refresh}
            style={styles.refresh}
          />
          {evidence.length === 0 ? (
            <EmptyState
              testID="order-evidence-empty"
              title="Sin evidencias"
              message="Esta orden aún no tiene evidencias disponibles."
            />
          ) : (
            evidence.map((item) => (
              <EvidenceItem key={item.id} evidence={item} showInternal={isStaff} />
            ))
          )}
        </>
      )}
    </Card>
  );
}

type PhotoState =
  | { status: 'hidden' }
  | { status: 'loading' }
  | { status: 'shown'; link: EvidenceDownloadUrl }
  | { status: 'error'; message: string };

function EvidenceItem({ evidence, showInternal }: { evidence: Evidence; showInternal: boolean }) {
  const [photo, setPhoto] = useState<PhotoState>({ status: 'hidden' });
  // Última URL obtenida: se reutiliza solo mientras no caduque.
  const linkRef = useRef<EvidenceDownloadUrl | null>(null);
  const loadingRef = useRef(false);
  const retriedExpiredRef = useRef(false);

  const isPhoto = evidence.contentType.toLowerCase().startsWith('image/');

  const show = useCallback(
    async (forceNew = false) => {
      if (loadingRef.current) return;
      const cached = linkRef.current;
      if (!forceNew && cached && Date.now() < cached.expiresAt) {
        setPhoto({ status: 'shown', link: cached });
        return;
      }

      loadingRef.current = true;
      setPhoto({ status: 'loading' });
      try {
        const link = await evidenceService.getDownloadUrl(evidence.id);
        linkRef.current = link;
        setPhoto({ status: 'shown', link });
      } catch (error: unknown) {
        linkRef.current = null;
        setPhoto({
          status: 'error',
          message: error instanceof Error ? error.message : 'No fue posible obtener la fotografía.',
        });
      } finally {
        loadingRef.current = false;
      }
    },
    [evidence.id],
  );

  const onImageError = useCallback(() => {
    const link = linkRef.current;
    // Una URL caducada se renueva una sola vez; otro fallo se informa.
    if (link && Date.now() >= link.expiresAt && !retriedExpiredRef.current) {
      retriedExpiredRef.current = true;
      void show(true);
      return;
    }
    linkRef.current = null;
    setPhoto({ status: 'error', message: 'No se pudo mostrar la fotografía.' });
  }, [show]);

  const retry = useCallback(() => {
    retriedExpiredRef.current = false;
    void show(true);
  }, [show]);

  const meta = [
    CONTEXT_LABELS[evidence.context] ?? evidence.context,
    formatDate(evidence.createdAt),
    formatSize(evidence.sizeBytes),
  ].join(' · ');

  return (
    <View testID={`order-evidence-${evidence.id}`} style={styles.item}>
      <Text style={styles.name}>{evidence.originalName || 'Evidencia sin nombre'}</Text>
      <Text style={styles.meta}>{meta}</Text>
      {showInternal ? (
        <Text style={styles.meta}>
          {`Visible para el cliente: ${evidence.visibleToClient ? 'Sí' : 'No'} · Estado: ${evidence.status}`}
        </Text>
      ) : null}

      {!isPhoto ? (
        <Text style={styles.notice}>
          Este archivo no es una fotografía y no se muestra en la aplicación.
        </Text>
      ) : photo.status === 'hidden' ? (
        <Button
          testID={`order-evidence-view-${evidence.id}`}
          title="Ver fotografía"
          variant="outline"
          onPress={() => void show()}
          style={styles.action}
        />
      ) : photo.status === 'loading' ? (
        <Loading testID={`order-evidence-photo-loading-${evidence.id}`} message="Cargando fotografía..." />
      ) : photo.status === 'error' ? (
        <ErrorMessage
          testID={`order-evidence-photo-error-${evidence.id}`}
          message={photo.message}
          onRetry={retry}
          style={styles.action}
        />
      ) : (
        <>
          <Image
            testID={`order-evidence-photo-${evidence.id}`}
            source={{ uri: photo.link.url }}
            // Evidencias privadas: sin caché en disco ni en memoria.
            cachePolicy="none"
            contentFit="contain"
            onError={onImageError}
            style={styles.photo}
            accessibilityLabel={`Fotografía ${evidence.originalName}`}
          />
          <Button
            testID={`order-evidence-hide-${evidence.id}`}
            title="Ocultar fotografía"
            variant="outline"
            onPress={() => setPhoto({ status: 'hidden' })}
            style={styles.action}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  refresh: {
    alignSelf: 'flex-end',
    minHeight: 40,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  item: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.xs,
  },
  name: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  meta: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  notice: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  action: {
    minHeight: 44,
    marginTop: spacing.sm,
  },
  photo: {
    width: '100%',
    aspectRatio: 4 / 3,
    marginTop: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSoft,
  },
});
