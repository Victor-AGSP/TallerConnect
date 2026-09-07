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
  radius,
  spacing,
} from '@/constants/theme';

export default function AdministradorScreen() {
  const router = useRouter();

  return (
    <AppScreen
      eyebrow="Administración"
      title="Resumen operativo"
      subtitle="Información relevante para seguimiento del funcionamiento del taller."
    >
      <View style={styles.stats}>
        <Stat
          value="12"
          label="Vehículos en atención"
        />

        <Stat
          value="8"
          label="Órdenes activas"
        />

        <Stat
          value="4"
          label="Mecánicos activos"
        />

        <Stat
          value="3"
          label="Esperando aprobación"
        />
      </View>

      <InfoCard
        title="Estado de las órdenes"
        subtitle="Resumen de operaciones disponibles desde la API."
      >
        <View style={styles.statusList}>
          <StatusRow
            label="Diagnóstico"
            value="2"
            tone="info"
          />

          <StatusRow
            label="En reparación"
            value="4"
            tone="warning"
          />

          <StatusRow
            label="Listas para entrega"
            value="2"
            tone="success"
          />
        </View>
      </InfoCard>

      <InfoCard
        title="Vehículos en atención"
        subtitle="Consulta rápida de las operaciones actuales."
      >
        <View style={styles.orders}>
          <AdminOrder
            code="OT-00124"
            plate="AB-CD-12"
            status="En reparación"
          />

          <AdminOrder
            code="OT-00125"
            plate="EF-GH-34"
            status="Diagnóstico"
          />

          <AdminOrder
            code="OT-00126"
            plate="IJ-KL-56"
            status="Espera presupuesto"
          />
        </View>
      </InfoCard>

      <InfoCard
        title="Mecánicos"
        subtitle="Información resumida relacionada con la operación."
      >
        <View style={styles.employee}>
          <View>
            <Text style={styles.employeeName}>
              Mecánico de demostración
            </Text>

            <Text style={styles.employeeDetail}>
              3 órdenes asignadas
            </Text>
          </View>

          <StatusPill
            label="Activo"
            tone="success"
          />
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

function Stat({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function StatusRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'success' | 'warning' | 'info';
}) {
  return (
    <View style={styles.statusRow}>
      <Text style={styles.statusLabel}>
        {label}
      </Text>

      <StatusPill
        label={value}
        tone={tone}
      />
    </View>
  );
}

function AdminOrder({
  code,
  plate,
  status,
}: {
  code: string;
  plate: string;
  status: string;
}) {
  return (
    <View style={styles.order}>
      <View>
        <Text style={styles.orderCode}>
          {code}
        </Text>

        <Text style={styles.orderPlate}>
          {plate}
        </Text>
      </View>

      <Text style={styles.orderState}>
        {status}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },

  stat: {
    width: '48%',
    minHeight: 112,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    padding: spacing.lg,
    justifyContent: 'center',
  },

  statValue: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
  },

  statLabel: {
    color: '#D9E2EC',
    marginTop: 5,
    fontSize: 12,
    lineHeight: 17,
  },

  statusList: {
    gap: spacing.md,
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  statusLabel: {
    color: colors.text,
    fontWeight: '700',
  },

  orders: {
    gap: spacing.md,
  },

  order: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  orderCode: {
    color: colors.text,
    fontWeight: '900',
  },

  orderPlate: {
    color: colors.textSecondary,
    marginTop: 3,
    fontSize: 12,
  },

  orderState: {
    color: colors.accent,
    fontWeight: '800',
    fontSize: 12,
    maxWidth: 120,
    textAlign: 'right',
  },

  employee: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },

  employeeName: {
    color: colors.text,
    fontWeight: '800',
  },

  employeeDetail: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
});