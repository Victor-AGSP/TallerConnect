import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';

import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/common';
import { StatusPill } from '@/components/ui/StatusPill';
import {
  AdminDashboardData,
  adminDashboardService,
  INITIAL_ADMIN_DASHBOARD_DATA,
} from '@/services/admin-dashboard.service';
import { useAuthStore } from '@/stores/authStore';

import {
  colors,
  radius,
  spacing,
} from '@/constants/theme';

export default function AdministradorScreen() {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const [dashboard, setDashboard] = useState<AdminDashboardData>(
    INITIAL_ADMIN_DASHBOARD_DATA
  );

  useEffect(() => {
    let isMounted = true;

    adminDashboardService
      .getDashboardData()
      .then((data) => {
        if (isMounted) {
          setDashboard(data);
        }
      })
      .catch(() => {
        // Mantiene snapshot inicial en caso de fallo de red
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={
          Platform.OS === 'ios'
            ? 'interactive'
            : 'on-drag'
        }
      >
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
            value={dashboard.stats.vehiclesInService}
            label="Vehículos en atención"
          />

          <Stat
            value={dashboard.stats.activeOrders}
            label="Órdenes activas"
          />

          <Stat
            value={dashboard.stats.activeMechanics}
            label="Mecánicos activos"
          />

          <Stat
            value={dashboard.stats.pendingApprovals}
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
              value={dashboard.statusSummary.diagnosis}
              tone="info"
            />

            <StatusRow
              label="En reparación"
              value={dashboard.statusSummary.inRepair}
              tone="warning"
            />

            <StatusRow
              label="Listas para entrega"
              value={dashboard.statusSummary.readyForDelivery}
              tone="success"
            />

            <StatusRow
              label="Esperando aprobación"
              value={dashboard.statusSummary.waitingApproval}
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
            {dashboard.activeOrderRows.map((row) => (
              <AdminOrder
                key={row.id}
                code={row.code}
                plate={row.plate}
                status={row.status}
              />
            ))}
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

          {dashboard.pendingApprovalRows.map((item) => (
            <Approval
              key={item.id}
              order={item.order}
              vehicle={item.vehicle}
              amount={item.amount}
            />
          ))}
        </View>

        {/* =====================================
            AVISOS Y NOTIFICACIONES
            ===================================== */}

        {dashboard.notifications.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Avisos del taller
            </Text>

            <Text style={styles.cardSubtitle}>
              Alertas operativas de órdenes, presupuestos y stock.
            </Text>

            {dashboard.notifications.slice(0, 3).map((notice) => (
              <View key={notice.id} style={styles.mechanicRow}>
                <View style={styles.mechanicInfo}>
                  <Text style={styles.mechanicName}>
                    {notice.title}
                  </Text>
                  <Text style={styles.mechanicDetail}>
                    {notice.message}
                  </Text>
                </View>

                <StatusPill
                  label={notice.read ? 'Leído' : 'Nuevo'}
                  tone={notice.priority === 'critical' ? 'danger' : 'warning'}
                />
              </View>
            ))}
          </View>
        ) : null}

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
              {dashboard.systemSummary.registeredVehicles}
            </Text>
          </View>

          <View style={styles.systemRow}>
            <Text style={styles.systemLabel}>
              Órdenes completadas
            </Text>

            <Text style={styles.systemValue}>
              {dashboard.systemSummary.completedOrders}
            </Text>
          </View>

          <View style={styles.systemRow}>
            <Text style={styles.systemLabel}>
              Repuestos bajo umbral
            </Text>

            <Text style={styles.systemValue}>
              {dashboard.systemSummary.lowStockParts}
            </Text>
          </View>

          <View style={styles.systemRow}>
            <Text style={styles.systemLabel}>
              Proveedores registrados
            </Text>

            <Text style={styles.systemValue}>
              {dashboard.systemSummary.registeredProviders}
            </Text>
          </View>
        </View>

        {/* =====================================
            NAVEGACIÓN Y CERRAR SESIÓN
            ===================================== */}

        <Button
          title="Ver repuestos y proveedores"
          onPress={() => router.push('/(admin)/inventario' as never)}
          style={styles.logoutButton}
        />

        <Button
          title="Ver mis vehículos"
          onPress={() => router.push('/(admin)/vehiculos' as never)}
          style={styles.logoutButton}
        />

        <Button
          title="Cerrar sesión"
          variant="outline"
          onPress={async () => {
            await logout();
            router.replace('/login');
          }}
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
    return colors.warning;
  }

  if (
    normalized.includes('ESPERA')
  ) {
    return colors.info;
  }

  if (
    normalized.includes('REPARACIÓN')
  ) {
    return colors.success;
  }

  if (
    normalized.includes('ENTREGA')
  ) {
    return colors.info;
  }

  return colors.textSecondary;
}

/* ==========================================
   TEMA
   ========================================== */

const localTheme = {
  background: colors.background,
  surface: colors.surface,
  surfaceSoft: colors.surfaceSoft,
  border: colors.border,

  primary: colors.primary,
  primaryDark: colors.primary,

  text: colors.text,
  textSecondary: colors.textSecondary,
  textMuted: colors.textSecondary,

  accent: colors.accent,
  info: colors.info,
  success: colors.success,
  warning: colors.warning,
  danger: colors.danger,
};

/* ==========================================
   ESTILOS
   ========================================== */

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: localTheme.background,
  },

  container: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },

  header: {
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },

  eyebrow: {
    color: colors.accent,
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
    borderColor: colors.border,
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
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,

    shadowColor: colors.primary,
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
    color: colors.warning,
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
    borderColor: colors.border,
  },
});
