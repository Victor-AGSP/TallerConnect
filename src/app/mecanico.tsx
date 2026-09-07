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

export default function MecanicoScreen() {
  const router = useRouter();

  return (
    <AppScreen
      eyebrow="Área de trabajo"
      title="Órdenes asignadas"
      subtitle="Consulta vehículos y registra las acciones permitidas durante el servicio."
    >
      <InfoCard>
        <View style={styles.orderHeader}>
          <View style={styles.orderId}>
            <Text style={styles.orderNumber}>
              OT-00124
            </Text>

            <Text style={styles.vehicle}>
              Vehículo · AB-CD-12
            </Text>
          </View>

          <StatusPill
            label="En reparación"
            tone="warning"
          />
        </View>

        <View style={styles.separator} />

        <View style={styles.details}>
          <Detail
            label="Trabajo"
            value="Mantención preventiva"
          />

          <Detail
            label="Prioridad"
            value="Normal"
          />

          <Detail
            label="Repuestos"
            value="3 asociados"
          />
        </View>

        <View style={styles.actions}>
          <AppButton
            title="Ver detalle de la orden"
            onPress={() => {}}
          />

          <AppButton
            title="Agregar evidencia"
            variant="outline"
            onPress={() => {}}
          />
        </View>
      </InfoCard>

      <InfoCard
        title="Acciones rápidas"
        subtitle="Las acciones disponibles dependerán de los permisos informados por el backend."
      >
        <View style={styles.quickGrid}>
          <QuickAction
            title="Actualizar estado"
            code="01"
          />

          <QuickAction
            title="Registrar información"
            code="02"
          />

          <QuickAction
            title="Revisar repuestos"
            code="03"
          />

          <QuickAction
            title="Agregar evidencia"
            code="04"
          />
        </View>
      </InfoCard>

      <InfoCard
        title="Órdenes pendientes"
        subtitle="2 órdenes adicionales asignadas."
      >
        <View style={styles.list}>
          <MiniOrder
            code="OT-00125"
            vehicle="EF-GH-34"
            status="Diagnóstico"
          />

          <MiniOrder
            code="OT-00126"
            vehicle="IJ-KL-56"
            status="Espera"
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

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View>
      <Text style={styles.detailLabel}>
        {label}
      </Text>

      <Text style={styles.detailValue}>
        {value}
      </Text>
    </View>
  );
}

function QuickAction({
  title,
  code,
}: {
  title: string;
  code: string;
}) {
  return (
    <View style={styles.quick}>
      <Text style={styles.quickCode}>
        {code}
      </Text>

      <Text style={styles.quickTitle}>
        {title}
      </Text>
    </View>
  );
}

function MiniOrder({
  code,
  vehicle,
  status,
}: {
  code: string;
  vehicle: string;
  status: string;
}) {
  return (
    <View style={styles.miniOrder}>
      <View>
        <Text style={styles.orderNumber}>
          {code}
        </Text>

        <Text style={styles.vehicle}>
          {vehicle}
        </Text>
      </View>

      <Text style={styles.orderStatus}>
        {status}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },

  orderId: {
    flex: 1,
  },

  orderNumber: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },

  vehicle: {
    marginTop: 3,
    color: colors.textSecondary,
    fontSize: 13,
  },

  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },

  details: {
    gap: spacing.md,
  },

  detailLabel: {
    color: colors.textMuted,
    fontSize: 11,
    textTransform: 'uppercase',
    fontWeight: '800',
  },

  detailValue: {
    color: colors.text,
    marginTop: 3,
    fontWeight: '700',
  },

  actions: {
    marginTop: spacing.xl,
    gap: spacing.sm,
  },

  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },

  quick: {
    width: '48%',
    minHeight: 105,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.primarySoft,
    justifyContent: 'space-between',
  },

  quickCode: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '900',
  },

  quickTitle: {
    color: colors.primary,
    fontWeight: '800',
    lineHeight: 18,
  },

  list: {
    gap: spacing.md,
  },

  miniOrder: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  orderStatus: {
    color: colors.info,
    fontSize: 12,
    fontWeight: '800',
  },
});