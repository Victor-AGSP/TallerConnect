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

import { radius, spacing } from '@/constants/theme';

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
            DECORACIÓN DE FONDO (NEGRO Y ROJO)
            ============================== */}

        <View pointerEvents="none" style={styles.decorations}>
          {/* Esferas de luz principales */}
          <View style={styles.orbRedLarge} />
          <View style={styles.orbDarkRed} />
          
          {/* Cristales geométricos (Cuadrados rotados) */}
          <View style={styles.crystalRed} />
          <View style={styles.crystalGrey} />

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
                  placeholderTextColor="#666666"
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
                  placeholderTextColor="#666666"
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

// Variables de color locales para el nuevo tema Black & Red
const localTheme = {
  background: '#070707', // Negro profundo
  surface: '#121212', // Gris muy oscuro para la tarjeta
  surfaceSoft: '#1A1A1A', // Fondo de los inputs
  border: '#2A2A2A', // Bordes sutiles
primary: '#740b0b', // Rojo vibrante
  primaryDark: '#8A0009', // Rojo oscuro
  text: '#FFFFFF', // Blanco puro
  textSecondary: '#A0A0A0', // Gris claro
  textMuted: '#666666', // Gris oscuro
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: localTheme.background,
  },

  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
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
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: localTheme.primary,
    top: -100,
    right: -80,
    opacity: 0.12, 
  },

  orbDarkRed: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: localTheme.primaryDark,
    bottom: -80,
    left: -70,
    opacity: 0.25,
  },

  crystalRed: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 20,
    backgroundColor: localTheme.primary,
    top: 180,
    left: -35,
    opacity: 0.15,
    transform: [{ rotate: '45deg' }],
  },

  crystalGrey: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 24,
    backgroundColor: '#333333',
    bottom: 150,
    right: -45,
    opacity: 0.2,
    transform: [{ rotate: '45deg' }],
  },

  ringStrong1: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 4,
    borderColor: localTheme.primary,
    bottom: 60,
    right: -30,
    opacity: 0.25,
  },

  ringStrong2: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#444444',
    top: 70,
    left: 20,
    opacity: 0.3,
  },

  glowDot1: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: localTheme.primary,
    top: 310,
    left: 50,
    opacity: 0.9,
    shadowColor: localTheme.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },

  glowDot2: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#666666',
    bottom: 250,
    right: 50,
    opacity: 0.5,
  },

  glowDot3: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: localTheme.primary,
    top: 120,
    right: 70,
    opacity: 0.8,
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
    backgroundColor: localTheme.surface, 
    borderWidth: 1,
    borderColor: localTheme.border,
    marginBottom: spacing.md,
  },

  logo: {
    width: 64,
    height: 64,
    borderRadius: 21,
    backgroundColor: localTheme.primary, // Logo en rojo
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: localTheme.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },

  logoText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },

  brand: {
    color: localTheme.text,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.8,
  },

  description: {
    color: localTheme.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },

  /* ===================================
     CARD
     =================================== */

  card: {
    backgroundColor: localTheme.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: localTheme.border,
    padding: spacing.xl,

    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
  },

  title: {
    color: localTheme.text,
    fontSize: 22,
    fontWeight: '900',
  },

  subtitle: {
    color: localTheme.textSecondary,
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
    color: localTheme.text,
    marginBottom: 7,
    fontSize: 11,
    fontWeight: '800',
  },

  inputWrapper: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',

    backgroundColor: localTheme.surfaceSoft,

    borderWidth: 1,
    borderColor: localTheme.border,
    borderRadius: radius.md,

    paddingHorizontal: spacing.md,
  },

  inputFocused: {
    backgroundColor: localTheme.surface,
    borderColor: localTheme.primary, // Borde rojo al seleccionar
  },

  input: {
    flex: 1,
    color: localTheme.text,
    fontSize: 14,
    paddingVertical: 0,
  },

  showButton: {
    marginLeft: spacing.sm,
    paddingVertical: spacing.sm,
  },

  showButtonText: {
    color: localTheme.primary,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.3,
  },

  loginButton: {
    marginTop: spacing.sm,
    backgroundColor: localTheme.primary, // Botón de acción principal rojo
    borderRadius: radius.md,
  },

  /* ===================================
     INFORMACIÓN
     =================================== */

  bottomInfo: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: localTheme.border,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: localTheme.primary,
    marginRight: spacing.sm,
  },

  bottomText: {
    color: localTheme.textMuted,
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
    color: localTheme.textMuted,
    fontSize: 10,
  },
});