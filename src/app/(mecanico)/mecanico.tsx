import { useRouter } from 'expo-router';

import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  Platform,
} from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { StatusPill } from '@/components/ui/StatusPill';

import { radius, spacing } from '@/constants/theme';

export default function MecanicoScreen() {
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
          <Text style={styles.eyebrow}>Área de trabajo</Text>
          <Text style={styles.title}>Órdenes asignadas</Text>
          <Text style={styles.subtitle}>
            Consulta vehículos y registra las acciones permitidas durante el servicio.
          </Text>
        </View>

        {/* ==============================
            TARJETA 1: ORDEN ACTUAL
            ============================== */}
        <View style={styles.card}>
          <View style={styles.orderHeader}>
            <View style={styles.orderId}>
              <Text style={styles.orderNumber}>OT-00124</Text>
              <Text style={styles.vehicle}>Vehículo · AB-CD-12</Text>
            </View>

            <StatusPill label="En reparación" tone="warning" />
          </View>

          <View style={styles.separator} />

          <View style={styles.details}>
            <Detail label="Trabajo" value="Mantención preventiva" />
            <Detail label="Prioridad" value="Normal" />
            <Detail label="Repuestos" value="3 asociados" />
          </View>

          <View style={styles.actions}>
            <AppButton
              title="Ver detalle de la orden"
              onPress={() => {}}
              style={styles.primaryButton}
            />

            <AppButton
              title="Agregar evidencia"
              variant="outline"
              onPress={() => {}}
            />
          </View>
        </View>

        {/* ==============================
            TARJETA 2: ACCIONES RÁPIDAS
            ============================== */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Acciones rápidas</Text>
          <Text style={styles.cardSubtitle}>
            Las acciones disponibles dependerán de los permisos informados por el backend.
          </Text>

          <View style={styles.quickGrid}>
            <QuickAction title="Actualizar estado" code="01" />
            <QuickAction title="Registrar información" code="02" />
            <QuickAction title="Revisar repuestos" code="03" />
            <QuickAction title="Agregar evidencia" code="04" />
          </View>
        </View>

        {/* ==============================
            TARJETA 3: ÓRDENES PENDIENTES
            ============================== */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Órdenes pendientes</Text>
          <Text style={styles.cardSubtitle}>4 órdenes adicionales asignadas.</Text>

          <View style={styles.list}>
            <MiniOrder code="OT-00125" vehicle="EF-GH-34" status="Diagnóstico" />
            <MiniOrder code="OT-00126" vehicle="IJ-KL-56" status="Espera" />
            <MiniOrder code="OT-00127" vehicle="AB-CD-12" status="Reparación" />
            <MiniOrder code="OT-00128" vehicle="XY-ZW-90" status="Finalizado" />
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

// Subcomponentes adaptados al Dark Theme
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function QuickAction({ title, code }: { title: string; code: string }) {
  return (
    <View style={styles.quick}>
      <Text style={styles.quickCode}>{code}</Text>
      <Text style={styles.quickTitle}>{title}</Text>
    </View>
  );
}

// Función auxiliar para determinar el color del estado
const getStatusColor = (status: string) => {
  const normalizedStatus = status.toUpperCase();
  switch (normalizedStatus) {
    case 'DIAGNÓSTICO':
      return '#F5A623'; // Naranja (Amber)
    case 'ESPERA':
      return '#5AC8FA'; // Azul claro (Sky Blue)
    case 'REPARACIÓN':
      return '#34C759'; // Verde (Emerald)
    case 'FINALIZADO':
      return '#AF52DE'; // Morado (Purple - Añadido según la imagen)
    default:
      return '#A0A0A0'; // Gris por defecto
  }
};

function MiniOrder({ code, vehicle, status }: { code: string; vehicle: string; status: string }) {
  const statusColor = getStatusColor(status);
  
  return (
    <View style={styles.miniOrder}>
      <View style={styles.miniOrderLeft}>
        <Text style={styles.miniOrderNumber}>{code}</Text>
        <Text style={styles.miniOrderVehicle}>{vehicle}</Text>
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

// Variables del Dark & Red Theme (#740b0b)
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
     DECORACIÓN VIBRANTE (Dark & Red)
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
     TARJETAS
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
     CONTENIDO ORDEN
     =================================== */
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
    color: localTheme.text,
    fontSize: 20,
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
  detailLabel: {
    color: localTheme.textMuted,
    fontSize: 11,
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
  actions: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  primaryButton: {
    backgroundColor: localTheme.primary,
  },

  /* ===================================
     ACCIONES RÁPIDAS
     =================================== */
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  quick: {
    width: '48%',
    minHeight: 90,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: localTheme.surfaceSoft,
    borderWidth: 1,
    borderColor: localTheme.border,
    justifyContent: 'space-between',
  },
  quickCode: {
    color: localTheme.primary,
    fontSize: 14,
    fontWeight: '900',
  },
  quickTitle: {
    color: localTheme.text,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },

  /* ===================================
     LISTA DE ÓRDENES (Dinámica)
     =================================== */
  list: {
    gap: 0, // El padding se maneja internamente en miniOrder
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
    gap: spacing.sm, // Espacio entre el código y la patente
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
    gap: 6, // Espacio entre el punto y el texto
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
     OTROS
     =================================== */
  logoutButton: {
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    borderColor: localTheme.border,
  },
});