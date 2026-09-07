import { useRouter } from 'expo-router';

import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppScreen } from '@/components/layout/AppScreen';
import { AppButton } from '@/components/ui/AppButton';
import { InfoCard } from '@/components/ui/InfoCard';
import { StatusPill } from '@/components/ui/StatusPill';

import {
  colors,
  spacing,
} from '@/constants/theme';

export default function ClienteScreen() {
  const router = useRouter();

  return (
    <AppScreen
      eyebrow="Portal del cliente"
      title="Hola, Cliente"
      subtitle="Consulta el estado de tu vehículo y los antecedentes asociados al servicio."
    >
      <InfoCard
        title="Vehículo en servicio"
        subtitle="Vehículo de demostración · Patente AB-CD-12"
      >
        <View style={styles.row}>
          <View>
            <Text style={styles.smallLabel}>
              Estado actual
            </Text>

            <Text style={styles.vehicle}>
              Servicio técnico
            </Text>
          </View>

          <StatusPill
            label="En reparación"
            tone="warning"
          />
        </View>
      </InfoCard>

      <InfoCard title="Seguimiento de la orden">
        <View style={styles.timeline}>
          <TimelineItem
            title="Vehículo recibido"
            detail="Registro completado"
            completed
          />

          <TimelineItem
            title="Diagnóstico"
            detail="Revisión finalizada"
            completed
          />

          <TimelineItem
            title="Reparación"
            detail="Trabajo actualmente en curso"
            active
          />

          <TimelineItem
            title="Entrega"
            detail="Pendiente"
          />
        </View>
      </InfoCard>

      <View style={styles.grid}>
        <Metric
          value=".000"
          label="Presupuesto"
        />

        <Metric
          value="3"
          label="Repuestos"
        />

        <Metric
          value="4"
          label="Evidencias"
        />

        <Metric
          value="1"
          label="Orden activa"
        />
      </View>

      <InfoCard
        title="Presupuesto"
        subtitle="Consulta la información proporcionada por el taller."
      >
        <View style={styles.row}>
          <Text style={styles.amount}>.000</Text>
          <StatusPill
            label="Aprobado"
            tone="success"
          />
        </View>
      </InfoCard>

      <InfoCard
        title="Evidencia multimedia"
        subtitle="Fotografías y videos asociados a la revisión o reparación aparecerán aquí."
      >
        <View style={styles.mediaPlaceholder}>
          <Text style={styles.mediaIcon}>▧</Text>
          <Text style={styles.mediaText}>
            4 archivos disponibles
          </Text>
        </View>
      </InfoCard>

      <AppButton
        title="Cerrar sesión"
        variant="outline"
        onPress={() => router.replace('/login')}
      />
    </AppScreen>
  );
}

interface TimelineItemProps {
  title: string;
  detail: string;
  completed?: boolean;
  active?: boolean;
}

function TimelineItem({
  title,
  detail,
  completed,
  active,
}: TimelineItemProps) {
  return (
    <View style={styles.timelineRow}>
      <View
        style={[
          styles.timelineDot,
          completed && styles.timelineCompleted,
          active && styles.timelineActive,
        ]}
      />

      <View style={styles.timelineText}>
        <Text style={styles.timelineTitle}>
          {title}
        </Text>

        <Text style={styles.timelineDetail}>
          {detail}
        </Text>
      </View>
    </View>
  );
}

interface MetricProps {
  value: string;
  label: string;
}

function Metric({
  value,
  label,
}: MetricProps) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },

  smallLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },

  vehicle: {
    marginTop: 4,
    color: colors.text,
    fontWeight: '800',
    fontSize: 16,
  },

  timeline: {
    gap: spacing.lg,
  },

  timelineRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },

  timelineDot: {
    width: 12,
    height: 12,
    marginTop: 4,
    borderRadius: 6,
    backgroundColor: colors.border,
  },

  timelineCompleted: {
    backgroundColor: colors.success,
  },

  timelineActive: {
    backgroundColor: colors.accent,
  },

  timelineText: {
    flex: 1,
  },

  timelineTitle: {
    color: colors.text,
    fontWeight: '800',
  },

  timelineDetail: {
    marginTop: 2,
    color: colors.textSecondary,
    fontSize: 13,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },

  metric: {
    width: '48%',
    minHeight: 92,
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: spacing.lg,
    justifyContent: 'center',
  },

  metricValue: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '900',
  },

  metricLabel: {
    color: '#D7E0EA',
    marginTop: 4,
    fontSize: 12,
  },

  amount: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
  },

  mediaPlaceholder: {
    minHeight: 90,
    borderRadius: 14,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  mediaIcon: {
    color: colors.accent,
    fontSize: 28,
  },

  mediaText: {
    marginTop: 5,
    color: colors.textSecondary,
    fontSize: 13,
  },
});