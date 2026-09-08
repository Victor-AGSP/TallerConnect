import { useRouter } from 'expo-router';

import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppButton } from '@/components/ui/AppButton';

import {
  colors,
  radius,
  spacing,
} from '@/constants/theme';

export default function LoginScreen() {
  const router = useRouter();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.root}
    >
      <View style={styles.top}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>TC</Text>
        </View>

        <Text style={styles.brand}>TallerConnect</Text>

        <Text style={styles.description}>
          Gestión del servicio técnico vehicular desde tu teléfono.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Bienvenido</Text>

        <Text style={styles.subtitle}>
          Ingresa tus credenciales para acceder al sistema.
        </Text>

        <View style={styles.form}>
          <View>
            <Text style={styles.label}>Correo electrónico</Text>

            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="usuario@correo.cl"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
          </View>

          <View>
            <Text style={styles.label}>Contraseña</Text>

            <TextInput
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              style={styles.input}
            />
          </View>

          <AppButton
            title="Iniciar sesión"
            onPress={() => router.push('/cliente')}
          />
        </View>

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>MOCKUP</Text>
          <View style={styles.divider} />
        </View>

        <Text style={styles.demoText}>
          Para esta demostración puedes entrar directamente a cada perfil.
        </Text>

        <View style={styles.demoButtons}>
          <AppButton
            title="Ver como cliente"
            variant="outline"
            onPress={() => router.push('/cliente')}
          />

          <AppButton
            title="Ver como mecánico"
            variant="outline"
            onPress={() => router.push('/mecanico')}
          />

          <AppButton
            title="Ver como administrador"
            variant="outline"
            onPress={() => router.push('/administrador')}
          />
        </View>
      </View>

      <Text style={styles.footer}>
        TallerConnect · Aplicación móvil
      </Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },

  top: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },

  logo: {
    width: 68,
    height: 68,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    marginBottom: spacing.md,
  },

  logoText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },

  brand: {
    fontSize: 30,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: -0.8,
  },

  description: {
    marginTop: 6,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 330,
    lineHeight: 20,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },

  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
  },

  subtitle: {
    marginTop: 5,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  form: {
    marginTop: spacing.xl,
    gap: spacing.lg,
  },

  label: {
    marginBottom: 7,
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },

  input: {
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: spacing.lg,
    color: colors.text,
    fontSize: 15,
  },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.xl,
  },

  divider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },

  dividerText: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },

  demoText: {
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    fontSize: 13,
  },

  demoButtons: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },

  footer: {
    marginTop: spacing.xl,
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 12,
  },
});