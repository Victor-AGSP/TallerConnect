import { useRouter } from 'expo-router';

import {
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { StatusPill } from '@/components/ui/StatusPill';

import {
  radius,
  spacing,
} from '@/constants/theme';

export default function AdministradorScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* =====================================
            DECORACIÓN
            ===================================== */}

        <View
          pointerEvents="none"
          style={styles.decorations}
        >
          <View style={styles.orbRedLarge} />
          <View style={styles.orbDarkRed} />

          <View style={styles.crystalRed} />
          <View style={styles.crystalGrey} />

          <View style={styles.ringStrong1} />
          <View style={styles.ringStrong2} />

          <View style={styles.glowDot1} />
          <View style={styles.glowDot2} />
          <View style={styles.glowDot3} />
        </View>

        {/* =====================================
            ENCABEZADO
            ===================================== */}

        <View style={styles.header}>
          <Text style={styles.eyebrow}>
            Administración
          </Text>

          <Text style={styles.title}>
            Panel del taller
          </Text>

          <Text style={styles.subtitle}>
            Vista general de vehículos, órdenes y
            actividad operativa del taller.
          </Text>
        </View>

        {/* =====================================
            MÉTRICAS
            ===================================== */}

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

        {/* =====================================
            ESTADO DE LAS ÓRDENES
            ===================================== */}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Estado de las órdenes
          </Text>

          <Text style={styles.cardSubtitle}>
            Resumen operativo de demostración.
          </Text>

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

            <StatusRow
              label="Esperando aprobación"
              value="3"
              tone="danger"
            />
          </View>
        </View>

        {/* =====================================
            VEHÍCULOS EN ATENCIÓN
            ===================================== */}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Vehículos en atención
          </Text>

          <Text style={styles.cardSubtitle}>
            Operaciones actuales del taller.
          </Text>

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

            <AdminOrder
              code="OT-00127"
              plate="XY-ZW-90"
              status="Listo para entrega"
            />
          </View>
        </View>

        {/* =====================================
            MECÁNICOS
            ===================================== */}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Mecánicos
          </Text>

          <Text style={styles.cardSubtitle}>
            Resumen de la actividad del equipo.
          </Text>

          <Mechanic
            name="Mecánico de demostración"
            orders="3 órdenes asignadas"
            status="Activo"
          />

          <Mechanic
            name="Segundo mecánico"
            orders="2 órdenes asignadas"
            status="Activo"
          />

          <Mechanic
            name="Tercer mecánico"
            orders="Sin órdenes asignadas"
            status="Disponible"
          />
        </View>

        {/* =====================================
            APROBACIONES
            ===================================== */}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Pendientes de aprobación
          </Text>

          <Text style={styles.cardSubtitle}>
            Elementos que requieren revisión
            administrativa.
          </Text>

          <Approval
            order="OT-00126"
            vehicle="IJ-KL-56"
            amount="$185.000"
          />

          <Approval
            order="OT-00129"
            vehicle="MN-OP-78"
            amount="$240.000"
          />

          <Approval
            order="OT-00130"
            vehicle="QR-ST-12"
            amount="$95.000"
          />
        </View>

        {/* =====================================
            ACTIVIDAD
            ===================================== */}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Resumen del sistema
          </Text>

          <View style={styles.systemRow}>
            <Text style={styles.systemLabel}>
              Vehículos registrados
            </Text>

            <Text style={styles.systemValue}>
              32
            </Text>
          </View>

          <View style={styles.systemRow}>
            <Text style={styles.systemLabel}>
              Órdenes completadas
            </Text>

            <Text style={styles.systemValue}>
              87
            </Text>
          </View>

          <View style={styles.systemRow}>
            <Text style={styles.systemLabel}>
              Mecánicos registrados
            </Text>

            <Text style={styles.systemValue}>
              6
            </Text>
          </View>

          <View style={styles.systemRow}>
            <Text style={styles.systemLabel}>
              Clientes registrados
            </Text>

            <Text style={styles.systemValue}>
              41
            </Text>
          </View>
        </View>

        {/* =====================================
            CERRAR SESIÓN
            ===================================== */}

        <AppButton
          title="Cerrar sesión"
          variant="outline"
          onPress={() => router.replace('/login')}
          style={styles.logoutButton}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ==========================================
   COMPONENTES
   ========================================== */

function Stat({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>
        {value}
      </Text>

      <Text style={styles.statLabel}>
        {label}
      </Text>
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
  tone:
    | 'success'
    | 'warning'
    | 'info'
    | 'danger';
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
  const color =
    getStatusColor(status);

  return (
    <View style={styles.orderRow}>
      <View style={styles.orderLeft}>
        <Text style={styles.orderCode}>
          {code}
        </Text>

        <Text style={styles.orderPlate}>
          {plate}
        </Text>
      </View>

      <View style={styles.orderStatus}>
        <View
          style={[
            styles.statusDot,
            {
              backgroundColor: color,
            },
          ]}
        />

        <Text
          style={[
            styles.orderStatusText,
            {
              color,
            },
          ]}
        >
          {status.toUpperCase()}
        </Text>
      </View>
    </View>
  );
}

function Mechanic({
  name,
  orders,
  status,
}: {
  name: string;
  orders: string;
  status: string;
}) {
  return (
    <View style={styles.mechanicRow}>
      <View style={styles.mechanicInfo}>
        <Text style={styles.mechanicName}>
          {name}
        </Text>

        <Text style={styles.mechanicDetail}>
          {orders}
        </Text>
      </View>

      <StatusPill
        label={status}
        tone="success"
      />
    </View>
  );
}

function Approval({
  order,
  vehicle,
  amount,
}: {
  order: string;
  vehicle: string;
  amount: string;
}) {
  return (
    <View style={styles.approvalRow}>
      <View>
        <Text style={styles.approvalOrder}>
          {order}
        </Text>

        <Text style={styles.approvalVehicle}>
          {vehicle}
        </Text>
      </View>

      <View style={styles.approvalRight}>
        <Text style={styles.approvalAmount}>
          {amount}
        </Text>

        <Text style={styles.approvalPending}>
          Pendiente
        </Text>
      </View>
    </View>
  );
}

function getStatusColor(
  status: string
) {
  const normalized =
    status.toUpperCase();

  if (
    normalized.includes('DIAGNÓSTICO')
  ) {
    return '#F5A623';
  }

  if (
    normalized.includes('ESPERA')
  ) {
    return '#5AC8FA';
  }

  if (
    normalized.includes('REPARACIÓN')
  ) {
    return '#34C759';
  }

  if (
    normalized.includes('ENTREGA')
  ) {
    return '#AF52DE';
  }

  return '#A0A0A0';
}

/* ==========================================
   TEMA
   ========================================== */

const localTheme = {
  background: '#070707',
  surface: '#121212',
  surfaceSoft: '#1A1A1A',
  border: '#2A2A2A',

  primary: '#740b0b',
  primaryDark: '#4a0707',

  text: '#FFFFFF',
  textSecondary: '#A0A0A0',
  textMuted: '#666666',
};

/* ==========================================
   ESTILOS
   ========================================== */

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: localTheme.background,
    paddingTop:
      Platform.OS === 'android' ? 40 : 0,
  },

  container: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },

  decorations: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
  },

  orbRedLarge: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: localTheme.primary,
    top: -50,
    right: -100,
    opacity: 0.15,
  },

  orbDarkRed: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: localTheme.primaryDark,
    top: 400,
    left: -80,
    opacity: 0.25,
  },

  crystalRed: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: localTheme.primary,
    top: 150,
    left: -20,
    opacity: 0.15,
    transform: [
      {
        rotate: '45deg',
      },
    ],
  },

  crystalGrey: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 20,
    backgroundColor: '#333333',
    bottom: 200,
    right: -40,
    opacity: 0.2,
    transform: [
      {
        rotate: '45deg',
      },
    ],
  },

  ringStrong1: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: localTheme.primary,
    top: 600,
    right: -40,
    opacity: 0.25,
  },

  ringStrong2: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#444444',
    top: 50,
    left: 40,
    opacity: 0.3,
  },

  glowDot1: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: localTheme.primary,
    top: 280,
    left: 60,
    opacity: 0.9,
    shadowColor: localTheme.primary,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 4,
  },

  glowDot2: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#666666',
    bottom: 100,
    right: 70,
    opacity: 0.5,
  },

  glowDot3: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: localTheme.primary,
    top: 100,
    right: 50,
    opacity: 0.8,
  },

  header: {
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },

  eyebrow: {
    color: '#C94A4A',
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },

  title: {
    color: localTheme.text,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 8,
  },

  subtitle: {
    color: localTheme.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },

  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },

  stat: {
    width: '48%',
    minHeight: 112,
    borderRadius: radius.lg,
    backgroundColor: localTheme.surfaceSoft,
    borderWidth: 1,
    borderColor: localTheme.border,
    padding: spacing.lg,
    justifyContent: 'center',
  },

  statValue: {
    color: localTheme.text,
    fontSize: 28,
    fontWeight: '900',
  },

  statLabel: {
    color: localTheme.textSecondary,
    marginTop: 5,
    fontSize: 12,
    lineHeight: 17,
  },

  card: {
    backgroundColor: localTheme.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: localTheme.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,

    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },

  cardTitle: {
    color: localTheme.text,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
  },

  cardSubtitle: {
    color: localTheme.textSecondary,
    fontSize: 13,
    marginBottom: spacing.lg,
  },

  statusList: {
    gap: spacing.md,
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: localTheme.border,
  },

  statusLabel: {
    color: localTheme.text,
    fontWeight: '700',
    fontSize: 14,
  },

  orders: {
    gap: 0,
  },

  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: localTheme.border,
  },

  orderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },

  orderCode: {
    color: localTheme.text,
    fontSize: 15,
    fontWeight: '900',
  },

  orderPlate: {
    color: localTheme.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },

  orderStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  orderStatusText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.2,
  },

  mechanicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: localTheme.border,
  },

  mechanicInfo: {
    flex: 1,
  },

  mechanicName: {
    color: localTheme.text,
    fontSize: 14,
    fontWeight: '800',
  },

  mechanicDetail: {
    color: localTheme.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },

  approvalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: localTheme.border,
  },

  approvalOrder: {
    color: localTheme.text,
    fontSize: 14,
    fontWeight: '900',
  },

  approvalVehicle: {
    color: localTheme.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },

  approvalRight: {
    alignItems: 'flex-end',
  },

  approvalAmount: {
    color: localTheme.text,
    fontSize: 14,
    fontWeight: '900',
  },

  approvalPending: {
    color: '#F5A623',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 4,
  },

  systemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: localTheme.border,
  },

  systemLabel: {
    color: localTheme.textSecondary,
    fontSize: 13,
  },

  systemValue: {
    color: localTheme.text,
    fontSize: 18,
    fontWeight: '900',
  },

  logoutButton: {
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    borderColor: localTheme.border,
  },
});