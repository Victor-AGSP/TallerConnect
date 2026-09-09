import { useState } from 'react';
import { useRouter } from 'expo-router';

import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
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

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [passwordVisible, setPasswordVisible] = useState(false);

  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const handleLogin = () => {
    // Temporal mientras no esté conectado el backend.
    router.replace('/cliente');
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ==============================
            DECORACIÓN DE FONDO VIBRANTE
            ============================== */}

        <View pointerEvents="none" style={styles.decorations}>
          {/* Esferas de luz principales */}
          <View style={styles.orbInfoLarge} />
          <View style={styles.orbAccentLarge} />
          
          {/* Cristales geométricos (Cuadrados rotados) */}
          <View style={styles.crystalAccent} />
          <View style={styles.crystalPrimary} />

          {/* Anillos notorios */}
          <View style={styles.ringStrong1} />
          <View style={styles.ringStrong2} />

          {/* Destellos / Puntos brillantes */}
          <View style={styles.glowDot1} />
          <View style={styles.glowDot2} />
          <View style={styles.glowDot3} />
        </View>

        {/* ==============================
            ENCABEZADO
            ============================== */}

        <View style={styles.header}>
          <View style={styles.logoWrapper}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>
                TC
              </Text>
            </View>
          </View>

          <Text style={styles.brand}>
            TallerConnect
          </Text>

          <Text style={styles.description}>
            Gestión del servicio técnico vehicular
          </Text>

          <Text style={styles.description}>
            desde tu teléfono.
          </Text>
        </View>

        {/* ==============================
            TARJETA DE LOGIN
            ============================== */}

        <View style={styles.card}>
          <Text style={styles.title}>
            Bienvenido
          </Text>

          <Text style={styles.subtitle}>
            Ingresa tus credenciales para acceder al sistema.
          </Text>

          <View style={styles.form}>
            {/* CORREO */}

            <View>
              <Text style={styles.label}>
                Correo electrónico
              </Text>

              <View
                style={[
                  styles.inputWrapper,
                  emailFocused && styles.inputFocused,
                ]}
              >
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  placeholder="usuario@correo.cl"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                />
              </View>
            </View>

            {/* CONTRASEÑA */}

            <View>
              <Text style={styles.label}>
                Contraseña
              </Text>

              <View
                style={[
                  styles.inputWrapper,
                  passwordFocused && styles.inputFocused,
                ]}
              >
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!passwordVisible}
                  style={styles.input}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                />

                <Pressable
                  onPress={() =>
                    setPasswordVisible(
                      (previous) => !previous
                    )
                  }
                  hitSlop={10}
                  style={styles.showButton}
                >
                  <Text style={styles.showButtonText}>
                    {passwordVisible ? 'OCULTAR' : 'VER'}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* BOTÓN */}

            <AppButton
              title="Iniciar sesión"
              onPress={handleLogin}
              style={styles.loginButton}
            />
          </View>

          {/* ==============================
              INFORMACIÓN INFERIOR
              ============================== */}

          <View style={styles.bottomInfo}>
            <View style={styles.statusDot} />

            <Text style={styles.bottomText}>
              Acceso al sistema TallerConnect
            </Text>
          </View>
        </View>

        {/* ==============================
            FOOTER
            ============================== */}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            TallerConnect · Aplicación móvil
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },

  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
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

  // Esferas de color intenso con opacidad media para no perderse
  orbInfoLarge: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: colors.info, // Azul vibrante
    top: -100,
    right: -80,
    opacity: 0.15,
  },

  orbAccentLarge: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: colors.accent, // Naranja fuerte
    bottom: -80,
    left: -70,
    opacity: 0.18,
  },

  // Formas de cristal (Rombos)
  crystalAccent: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 20,
    backgroundColor: colors.warning,
    top: 180,
    left: -35,
    opacity: 0.25,
    transform: [{ rotate: '45deg' }],
  },

  crystalPrimary: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    bottom: 150,
    right: -45,
    opacity: 0.2,
    transform: [{ rotate: '45deg' }],
  },

  // Anillos notorios (bordes más gruesos y colores sólidos con transparencia)
  ringStrong1: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 6,
    borderColor: colors.accent,
    bottom: 60,
    right: -30,
    opacity: 0.25,
  },

  ringStrong2: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: colors.info,
    top: 70,
    left: 20,
    opacity: 0.3,
  },

  // Puntos/Destellos con sombra para que resalten
  glowDot1: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.accent,
    top: 310,
    left: 50,
    opacity: 0.7,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 3,
  },

  glowDot2: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.info,
    bottom: 250,
    right: 50,
    opacity: 0.8,
    shadowColor: colors.info,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 3,
  },

  glowDot3: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.warning,
    top: 120,
    right: 70,
    opacity: 0.6,
  },

  /* ===================================
     HEADER
     =================================== */

  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },

  logoWrapper: {
    width: 82,
    height: 82,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    marginBottom: spacing.md,
  },

  logo: {
    width: 64,
    height: 64,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.surface,
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.18,
    shadowRadius: 9,
    elevation: 4,
  },

  logoText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },

  brand: {
    color: colors.primary,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.8,
  },

  description: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },

  /* ===================================
     CARD
     =================================== */

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,

    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },

  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
  },

  subtitle: {
    color: colors.textSecondary,
    marginTop: 5,
    fontSize: 12,
    lineHeight: 19,
  },

  /* ===================================
     FORMULARIO
     =================================== */

  form: {
    marginTop: spacing.xl,
    gap: spacing.lg,
  },

  label: {
    color: colors.text,
    marginBottom: 7,
    fontSize: 11,
    fontWeight: '800',
  },

  inputWrapper: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',

    backgroundColor: colors.surfaceSoft,

    borderWidth: 1,
    borderColor: colors.border,

    borderRadius: radius.md,

    paddingHorizontal: spacing.md,
  },

  inputFocused: {
    backgroundColor: colors.surface,
    borderColor: colors.accent,
  },

  input: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    paddingVertical: 0,
  },

  showButton: {
    marginLeft: spacing.sm,
    paddingVertical: spacing.sm,
  },

  showButtonText: {
    color: colors.accent,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.3,
  },

  loginButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
  },

  /* ===================================
     INFORMACIÓN
     =================================== */

  bottomInfo: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.accent,
    marginRight: spacing.sm,
  },

  bottomText: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },

  /* ===================================
     FOOTER
     =================================== */

  footer: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },

  footerText: {
    color: colors.textMuted,
    fontSize: 10,
  },
});