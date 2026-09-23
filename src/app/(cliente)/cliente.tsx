import { useRouter } from 'expo-router';

import {
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button, Card } from '@/components/common';
import { StatusPill } from '@/components/ui/StatusPill';

import {
  radius,
  spacing,
} from '@/constants/theme';

export default function ClienteScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* =====================================
            DECORACIÓN DE FONDO
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
            Portal del cliente
          </Text>

          <Text style={styles.title}>
            Mi taller
          </Text>

          <Text style={styles.subtitle}>
            Consulta el estado de tu vehículo,
            órdenes de trabajo y la información
            asociada al servicio.
          </Text>
        </View>

        {/* =====================================
            VEHÍCULO EN SERVICIO
            ===================================== */}

        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>
                Vehículo en servicio
              </Text>

              <Text style={styles.cardSubtitle}>
                Información de demostración
              </Text>
            </View>

            <StatusPill
              label="En reparación"
              tone="success"
            />
          </View>

          <View style={styles.vehicleBox}>
            <View>
              <Text style={styles.smallLabel}>
                PATENTE
              </Text>

              <Text style={styles.vehiclePlate}>
                AB-CD-12
              </Text>
            </View>

            <View style={styles.vehicleInfo}>
              <Text style={styles.smallLabel}>
                SERVICIO
              </Text>

              <Text style={styles.vehicleService}>
                Mantención preventiva
              </Text>
            </View>
          </View>
        </Card>

        {/* =====================================
            SEGUIMIENTO
            ===================================== */}

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>
            Seguimiento de la orden
          </Text>

          <Text style={styles.cardSubtitle}>
            Estado actual del servicio.
          </Text>

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
        </Card>

        {/* =====================================
            RESUMEN
            ===================================== */}

        <View style={styles.grid}>
          <Metric
            value="$125.000"
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

        {/* =====================================
            PRESUPUESTO
            ===================================== */}

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>
            Presupuesto
          </Text>

          <Text style={styles.cardSubtitle}>
            Información proporcionada por el taller.
          </Text>

          <View style={styles.budgetRow}>
            <View>
              <Text style={styles.smallLabel}>
                TOTAL ESTIMADO
              </Text>

              <Text style={styles.amount}>
                $125.000
              </Text>
            </View>

            <StatusPill
              label="Aprobado"
              tone="success"
            />
          </View>
        </Card>

        {/* =====================================
            EVIDENCIA MULTIMEDIA
            ===================================== */}

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>
            Evidencia multimedia
          </Text>

          <Text style={styles.cardSubtitle}>
            Fotografías y videos asociados al
            servicio aparecerán aquí.
          </Text>

          <View style={styles.mediaPlaceholder}>
            <View style={styles.mediaIconCircle}>
              <Text style={styles.mediaIcon}>
                ▧
              </Text>
            </View>

            <Text style={styles.mediaTitle}>
              4 archivos disponibles
            </Text>

            <Text style={styles.mediaDescription}>
              Evidencias asociadas a la orden.
            </Text>
          </View>
        </Card>

        {/* =====================================
            INFORMACIÓN DE LA ORDEN
            ===================================== */}

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>
            Orden de trabajo
          </Text>

          <View style={styles.orderInfo}>
            <InfoRow
              label="Número"
              value="OT-00124"
            />

            <InfoRow
              label="Estado"
              value="En reparación"
            />

            <InfoRow
              label="Prioridad"
              value="Normal"
            />

            <InfoRow
              label="Técnico"
              value="Mecánico asignado"
            />
          </View>
        </Card>

        {/* =====================================
            CERRAR SESIÓN
            ===================================== */}

        <Button
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

function TimelineItem({
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

function Metric({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>
        {value}
      </Text>

      <Text style={styles.metricLabel}>
        {label}
      </Text>
    </View>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>
        {label}
      </Text>

      <Text style={styles.infoValue}>
        {value}
      </Text>
    </View>
  );
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

  success: '#34C759',
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

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },

  cardHeaderText: {
    flex: 1,
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

  vehicleBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: localTheme.border,
  },

  vehicleInfo: {
    flex: 1,
  },

  smallLabel: {
    color: localTheme.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  vehiclePlate: {
    marginTop: 5,
    color: localTheme.text,
    fontSize: 22,
    fontWeight: '900',
  },

  vehicleService: {
    marginTop: 5,
    color: localTheme.text,
    fontSize: 14,
    fontWeight: '700',
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
    backgroundColor: localTheme.border,
  },

  timelineCompleted: {
    backgroundColor: localTheme.success,
  },

  timelineActive: {
    backgroundColor: localTheme.primary,
    borderWidth: 2,
    borderColor: localTheme.surfaceSoft,
  },

  timelineText: {
    flex: 1,
  },

  timelineTitle: {
    color: localTheme.text,
    fontWeight: '800',
  },

  timelineDetail: {
    marginTop: 2,
    color: localTheme.textSecondary,
    fontSize: 13,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },

  metric: {
    width: '48%',
    minHeight: 92,
    backgroundColor: localTheme.surfaceSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: localTheme.border,
    padding: spacing.lg,
    justifyContent: 'center',
  },

  metricValue: {
    color: localTheme.text,
    fontSize: 21,
    fontWeight: '900',
  },

  metricLabel: {
    color: localTheme.textSecondary,
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
  },

  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },

  amount: {
    marginTop: 5,
    color: localTheme.text,
    fontSize: 25,
    fontWeight: '900',
  },

  mediaPlaceholder: {
    minHeight: 120,
    marginTop: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: localTheme.surfaceSoft,
    borderWidth: 1,
    borderColor: localTheme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  mediaIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#240606',
    alignItems: 'center',
    justifyContent: 'center',
  },

  mediaIcon: {
    color: '#C94A4A',
    fontSize: 24,
  },

  mediaTitle: {
    marginTop: spacing.sm,
    color: localTheme.text,
    fontSize: 14,
    fontWeight: '800',
  },

  mediaDescription: {
    marginTop: 3,
    color: localTheme.textSecondary,
    fontSize: 12,
  },

  orderInfo: {
    marginTop: spacing.sm,
    gap: 0,
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: localTheme.border,
  },

  infoLabel: {
    color: localTheme.textSecondary,
    fontSize: 13,
  },

  infoValue: {
    color: localTheme.text,
    fontSize: 13,
    fontWeight: '800',
  },

  logoutButton: {
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    borderColor: localTheme.border,
  },
});