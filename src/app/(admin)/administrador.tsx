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
        {/* ==============================
            DECORACIÓN DE FONDO (DARK & RED)
            ============================== */}
        <View pointerEvents="none" style={styles.decorations}>
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

        {/* ==============================
            ENCABEZADO
            ============================== */}
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Administración</Text>
          <Text style={styles.title}>Resumen operativo</Text>
          <Text style={styles.subtitle}>
            Información relevante para seguimiento del funcionamiento del taller.
          </Text>
        </View>

        {/* ==============================
            MÉTRICAS (STATS)
            ============================== */}
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

        {/* ==============================
            TARJETA 1: ESTADO DE LAS ÓRDENES
            ============================== */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Estado de las órdenes</Text>
          <Text style={styles.cardSubtitle}>
            Resumen de operaciones disponibles desde la API.
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
          </View>
        </View>

        {/* ==============================
            TARJETA 2: VEHÍCULOS EN ATENCIÓN
            ============================== */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Vehículos en atención</Text>
          <Text style={styles.cardSubtitle}>
            Consulta rápida de las operaciones actuales.
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
          </View>
        </View>

        {/* ==============================
            TARJETA 3: MECÁNICOS
            ============================== */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Mecánicos</Text>
          <Text style={styles.cardSubtitle}>
            Información resumida relacionada con la operación.
          </Text>

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
        </View>

        {/* ==============================
            BOTÓN CERRAR SESIÓN
            ============================== */}
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

// ==========================================
// COMPONENTES SECUNDARIOS
// ==========================================

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

// Función auxiliar para colores dinámicos (Idéntica a Mecánico)
const getStatusColor = (status: string) => {
  const normalizedStatus = status.toUpperCase();
  if (normalizedStatus.includes('DIAGNÓSTICO')) return '#F5A623'; // Naranja
  if (normalizedStatus.includes('ESPERA')) return '#5AC8FA'; // Azul claro
  if (normalizedStatus.includes('REPARACIÓN')) return '#34C759'; // Verde
  if (normalizedStatus.includes('ENTREGA')) return '#AF52DE'; // Morado
  return '#A0A0A0'; // Gris por defecto
};

function AdminOrder({
  code,
  plate,
  status,
}: {
  code: string;
  plate: string;
  status: string;
}) {
  const statusColor = getStatusColor(status);

  return (
    <View style={styles.miniOrder}>
      <View style={styles.miniOrderLeft}>
        <Text style={styles.miniOrderNumber}>{code}</Text>
        <Text style={styles.miniOrderVehicle}>{plate}</Text>
      </View>
      
      <View style={styles.miniOrderRight}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <Text style={[styles.miniOrderStatus, { color: statusColor }]}>
          {status.toUpperCase()}
        </Text>
      </View>
    </View>
  );
}

// ==========================================
// TEMA LOCAL (DARK & RED)
// ==========================================
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

// ==========================================
// ESTILOS
// ==========================================
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: localTheme.background,
    paddingTop: Platform.OS === 'android' ? 40 : 0,
  },
  container: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },

  /* ===================================
     DECORACIÓN VIBRANTE
     =================================== */
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
    transform: [{ rotate: '45deg' }],
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
    transform: [{ rotate: '45deg' }],
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
    shadowOffset: { width: 0, height: 0 },
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

  /* ===================================
     ENCABEZADO
     =================================== */
  header: {
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  eyebrow: {
    color: localTheme.primary,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  title: {
    color: localTheme.text,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    color: localTheme.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },

  /* ===================================
     TARJETAS (Reemplazo de InfoCard)
     =================================== */
  card: {
    backgroundColor: localTheme.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: localTheme.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
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

  /* ===================================
     ESTILOS INTERNOS (Métricas)
     =================================== */
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

  /* ===================================
     ESTILOS INTERNOS (StatusRow)
     =================================== */
  statusList: {
    gap: spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: localTheme.border,
  },
  statusLabel: {
    color: localTheme.text,
    fontWeight: '700',
  },

  /* ===================================
     ESTILOS INTERNOS (AdminOrder adaptado)
     =================================== */
  orders: {
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
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.3,
  },

  /* ===================================
     ESTILOS INTERNOS (Employee)
     =================================== */
  employee: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  employeeName: {
    color: localTheme.text,
    fontWeight: '800',
  },
  employeeDetail: {
    color: localTheme.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },

  logoutButton: {
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    borderColor: localTheme.border,
  },
});