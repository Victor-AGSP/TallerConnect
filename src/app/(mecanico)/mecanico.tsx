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

export default function MecanicoScreen() {
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
            Área de trabajo
          </Text>

          <Text style={styles.title}>
            Mis órdenes
          </Text>

          <Text style={styles.subtitle}>
            Revisa tus órdenes asignadas y registra
            las acciones correspondientes al servicio.
          </Text>
        </View>

        {/* =====================================
            RESUMEN
            ===================================== */}

        <View style={styles.stats}>
          <Stat
            value="5"
            label="Órdenes asignadas"
          />

          <Stat
            value="1"
            label="En reparación"
          />

          <Stat
            value="2"
            label="En diagnóstico"
          />

          <Stat
            value="2"
            label="Pendientes"
          />
        </View>

        {/* =====================================
            ORDEN ACTUAL
            ===================================== */}

        <View style={styles.card}>
          <View style={styles.orderHeader}>
            <View style={styles.orderHeaderText}>
              <Text style={styles.cardEyebrow}>
                Orden actual
              </Text>

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

            <Detail
              label="Cliente"
              value="Cliente de demostración"
            />
          </View>

          <View style={styles.actionGrid}>
            <ActionBox
              code="01"
              title="Actualizar estado"
            />

            <ActionBox
              code="02"
              title="Registrar información"
            />

            <ActionBox
              code="03"
              title="Revisar repuestos"
            />

            <ActionBox
              code="04"
              title="Agregar evidencia"
            />
          </View>
        </View>

        {/* =====================================
            PROGRESO
            ===================================== */}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Progreso de la orden
          </Text>

          <Text style={styles.cardSubtitle}>
            Seguimiento de las etapas del trabajo.
          </Text>

          <ProgressItem
            title="Recepción"
            detail="Completado"
            completed
          />

          <ProgressItem
            title="Diagnóstico"
            detail="Completado"
            completed
          />

          <ProgressItem
            title="Reparación"
            detail="En curso"
            active
          />

          <ProgressItem
            title="Control final"
            detail="Pendiente"
          />

          <ProgressItem
            title="Entrega"
            detail="Pendiente"
          />
        </View>

        {/* =====================================
            ÓRDENES PENDIENTES
            ===================================== */}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Otras órdenes
          </Text>

          <Text style={styles.cardSubtitle}>
            Órdenes actualmente asociadas al mecánico.
          </Text>

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

            <MiniOrder
              code="OT-00127"
              vehicle="AB-CD-12"
              status="Reparación"
            />

            <MiniOrder
              code="OT-00128"
              vehicle="XY-ZW-90"
              status="Finalizado"
            />
          </View>
        </View>

        {/* =====================================
            INFORMACIÓN DEL MECÁNICO
            ===================================== */}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Mi actividad
          </Text>

          <Text style={styles.cardSubtitle}>
            Resumen de actividad de demostración.
          </Text>

          <View style={styles.activityRow}>
            <Text style={styles.activityLabel}>
              Órdenes completadas
            </Text>

            <Text style={styles.activityValue}>
              12
            </Text>
          </View>

          <View style={styles.activityRow}>
            <Text style={styles.activityLabel}>
              Evidencias registradas
            </Text>

            <Text style={styles.activityValue}>
              24
            </Text>
          </View>

          <View style={styles.activityRow}>
            <Text style={styles.activityLabel}>
              Repuestos utilizados
            </Text>

            <Text style={styles.activityValue}>
              18
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

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>
        {label}
      </Text>

      <Text style={styles.detailValue}>
        {value}
      </Text>
    </View>
  );
}

function ActionBox({
  code,
  title,
}: {
  code: string;
  title: string;
}) {
  return (
    <View style={styles.actionBox}>
      <Text style={styles.actionCode}>
        {code}
      </Text>

      <Text style={styles.actionTitle}>
        {title}
      </Text>
    </View>
  );
}

function ProgressItem({
  title,
  detail,
  completed = false,
  active = false,
}: {
  title: string;
  detail: string;
  completed?: boolean;
  active?: boolean;
}) {
  return (
    <View style={styles.progressRow}>
      <View
        style={[
          styles.progressDot,
          completed &&
            styles.progressCompleted,
          active &&
            styles.progressActive,
        ]}
      />

      <View style={styles.progressText}>
        <Text style={styles.progressTitle}>
          {title}
        </Text>

        <Text style={styles.progressDetail}>
          {detail}
        </Text>
      </View>
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
  const statusColor =
    getStatusColor(status);

  return (
    <View style={styles.miniOrder}>
      <View style={styles.miniOrderLeft}>
        <Text style={styles.miniOrderNumber}>
          {code}
        </Text>

        <Text style={styles.miniOrderVehicle}>
          {vehicle}
        </Text>
      </View>

      <View style={styles.miniOrderRight}>
        <View
          style={[
            styles.statusDot,
            {
              backgroundColor:
                statusColor,
            },
          ]}
        />

        <Text
          style={[
            styles.miniOrderStatus,
            {
              color: statusColor,
            },
          ]}
        >
          {status.toUpperCase()}
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

  switch (normalized) {
    case 'DIAGNÓSTICO':
      return '#F5A623';

    case 'ESPERA':
      return '#5AC8FA';

    case 'REPARACIÓN':
      return '#34C759';

    case 'FINALIZADO':
      return '#AF52DE';

    default:
      return '#A0A0A0';
  }
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
    minHeight: 105,
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

  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },

  orderHeaderText: {
    flex: 1,
  },

  cardEyebrow: {
    color: '#C94A4A',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 5,
  },

  orderNumber: {
    color: localTheme.text,
    fontSize: 22,
    fontWeight: '900',
  },

  vehicle: {
    marginTop: 4,
    color: localTheme.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },

  separator: {
    height: 1,
    backgroundColor: localTheme.border,
    marginVertical: spacing.lg,
  },

  details: {
    gap: spacing.md,
  },

  detail: {
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: localTheme.border,
  },

  detailLabel: {
    color: localTheme.textMuted,
    fontSize: 10,
    textTransform: 'uppercase',
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  detailValue: {
    color: localTheme.text,
    marginTop: 4,
    fontSize: 14,
    fontWeight: '700',
  },

  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },

  actionBox: {
    width: '48%',
    minHeight: 90,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: localTheme.surfaceSoft,
    borderWidth: 1,
    borderColor: localTheme.border,
    justifyContent: 'space-between',
  },

  actionCode: {
    color: '#C94A4A',
    fontSize: 14,
    fontWeight: '900',
  },

  actionTitle: {
    color: localTheme.text,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
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

  progressRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: localTheme.border,
  },

  progressDot: {
    width: 12,
    height: 12,
    marginTop: 4,
    borderRadius: 6,
    backgroundColor: localTheme.border,
  },

  progressCompleted: {
    backgroundColor: '#34C759',
  },

  progressActive: {
    backgroundColor: localTheme.primary,
  },

  progressText: {
    flex: 1,
  },

  progressTitle: {
    color: localTheme.text,
    fontSize: 14,
    fontWeight: '800',
  },

  progressDetail: {
    color: localTheme.textSecondary,
    fontSize: 12,
    marginTop: 3,
  },

  list: {
    gap: 0,
  },

  miniOrder: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: localTheme.border,
  },

  miniOrderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  miniOrderNumber: {
    color: localTheme.text,
    fontSize: 15,
    fontWeight: '900',
  },

  miniOrderVehicle: {
    color: localTheme.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },

  miniOrderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  miniOrderStatus: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.3,
  },

  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: localTheme.border,
  },

  activityLabel: {
    color: localTheme.textSecondary,
    fontSize: 13,
  },

  activityValue: {
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