import { useState } from 'react';

import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button, Card, Input } from '@/components/common';

import { radius, spacing } from '@/constants/theme';

import {
  loginSchema,
  LoginFormData,
} from '@/schemas/auth.schema';

import { login } from '@/services/auth.service';

import { useAuthStore } from '@/stores/authStore';

export default function LoginScreen() {
  const router = useRouter();

  const setAuth = useAuthStore(
    (state) => state.setAuth
  );

  const [generalError, setGeneralError] =
    useState<string | undefined>();

  const [isLoading, setIsLoading] =
    useState(false);

  const [passwordVisible, setPasswordVisible] =
    useState(false);

  /**
   * React Hook Form administra:
   *
   * - valores de los campos
   * - errores
   * - validación
   * - estado del formulario
   *
   * Zod se encarga de validar mediante zodResolver.
   */
  const {
    control,
    handleSubmit,
    clearErrors,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
    mode: 'onSubmit',
  });

  /**
   * Procesa el inicio de sesión solamente cuando
   * React Hook Form + Zod consideran válido el formulario.
   */
  const handleLogin = async (
    credentials: LoginFormData
  ) => {
    setGeneralError(undefined);
    setIsLoading(true);

    try {
      /**
       * La pantalla no necesita saber si estamos usando:
       *
       * - autenticación demo
       * - backend real
       *
       * Esa responsabilidad pertenece a auth.service.
       */
      const response = await login(credentials);

      /**
       * Guardamos la sesión.
       */
      await setAuth(
        response.user,
        response.token
      );

      /**
       * Redirección según el rol.
       */
      switch (response.user.role) {
        case 'cliente':
          router.replace('/cliente');
          break;

        case 'mecanico':
          router.replace('/mecanico');
          break;

        case 'administrador':
          router.replace('/administrador');
          break;

        default:
          setGeneralError(
            'El usuario no tiene un rol válido.'
          );
      }
    } catch (error) {
      console.error(
        'Error durante el inicio de sesión:',
        error
      );

      if (error instanceof Error) {
        setGeneralError(error.message);
      } else {
        setGeneralError(
          'No se pudo iniciar sesión. Inténtalo nuevamente.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Se ejecuta cuando React Hook Form detecta
   * errores de validación.
   */
  const handleValidationError = () => {
    setGeneralError(undefined);
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : undefined
      }
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* =========================================
            DECORACIÓN DE FONDO
            ========================================= */}

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

        {/* =========================================
            ENCABEZADO
            ========================================= */}

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

        {/* =========================================
            TARJETA LOGIN
            ========================================= */}

        <Card style={styles.card}>
          <Text style={styles.title}>
            Bienvenido
          </Text>

          <Text style={styles.subtitle}>
            Ingresa tus credenciales para acceder al
            sistema.
          </Text>

          <View style={styles.form}>
            {/* =====================================
                CORREO
                ===================================== */}

            <Controller
              control={control}
              name="email"
              render={({
                field: {
                  onChange,
                  onBlur,
                  value,
                },
                fieldState: { error },
              }) => (
                <Input
                  label="Correo electrónico"
                  value={value}
                  onChangeText={(text) => {
                    onChange(text);

                    if (generalError) {
                      setGeneralError(undefined);
                    }

                    if (errors.email) {
                      clearErrors('email');
                    }
                  }}
                  onBlur={onBlur}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  placeholder="usuario@correo.cl"
                  placeholderTextColor={
                    localTheme.textMuted
                  }
                  labelStyle={styles.label}
                  style={styles.input}
                  focusedStyle={
                    styles.inputFocused
                  }
                  error={error?.message}
                  editable={!isLoading}
                />
              )}
            />

            {/* =====================================
                CONTRASEÑA
                ===================================== */}

            <View style={styles.passwordField}>
              <Controller
                control={control}
                name="password"
                render={({
                  field: {
                    onChange,
                    onBlur,
                    value,
                  },
                  fieldState: { error },
                }) => (
                  <Input
                    label="Contraseña"
                    value={value}
                    onChangeText={(text) => {
                      onChange(text);

                      if (generalError) {
                        setGeneralError(undefined);
                      }

                      if (errors.password) {
                        clearErrors('password');
                      }
                    }}
                    onBlur={onBlur}
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="••••••••"
                    placeholderTextColor={
                      localTheme.textMuted
                    }
                    secureTextEntry={
                      !passwordVisible
                    }
                    labelStyle={styles.label}
                    style={styles.input}
                    focusedStyle={
                      styles.inputFocused
                    }
                    error={error?.message}
                    editable={!isLoading}
                  />
                )}
              />

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  passwordVisible
                    ? 'Ocultar contraseña'
                    : 'Mostrar contraseña'
                }
                accessibilityState={{
                  disabled: isLoading,
                }}
                disabled={isLoading}
                onPress={() =>
                  setPasswordVisible(
                    (previous) =>
                      !previous
                  )
                }
                hitSlop={10}
                style={styles.showButton}
              >
                <Text
                  style={
                    styles.showButtonText
                  }
                >
                  {passwordVisible
                    ? 'OCULTAR'
                    : 'VER'}
                </Text>
              </Pressable>
            </View>

            {/* =====================================
                ERROR GENERAL
                ===================================== */}

            {generalError ? (
              <View
                style={
                  styles.errorContainer
                }
              >
                <View
                  style={styles.errorDot}
                />

                <Text
                  accessibilityRole="alert"
                  style={
                    styles.errorText
                  }
                >
                  {generalError}
                </Text>
              </View>
            ) : null}

            {/* =====================================
                BOTÓN
                ===================================== */}

            <Button
              title={
                isLoading
                  ? 'Iniciando sesión...'
                  : 'Iniciar sesión'
              }
              onPress={handleSubmit(
                handleLogin,
                handleValidationError
              )}
              loading={isLoading}
              disabled={isLoading}
              style={styles.loginButton}
            />
          </View>

          {/* =====================================
              INFORMACIÓN INFERIOR
              ===================================== */}

          <View style={styles.bottomInfo}>
            <View style={styles.statusDot} />

            <Text style={styles.bottomText}>
              Acceso al sistema TallerConnect
            </Text>
          </View>
        </Card>

        {/* =========================================
            CUENTAS DEMO
            ========================================= */}

        <View style={styles.demoInfo}>
          <Text style={styles.demoTitle}>
            Usuarios de prueba
          </Text>

          <Text style={styles.demoText}>
            cliente@demo.local
          </Text>

          <Text style={styles.demoText}>
            mecanico@demo.local
          </Text>

          <Text style={styles.demoText}>
            admin@demo.local
          </Text>

          <Text style={styles.demoPassword}>
            Contraseña: 123456
          </Text>
        </View>

        {/* =========================================
            FOOTER
            ========================================= */}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            TallerConnect · Aplicación móvil
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* =========================================================
   TEMA LOCAL DEL LOGIN
   ========================================================= */

const localTheme = {
  background: '#070707',
  surface: '#121212',
  surfaceSoft: '#1A1A1A',
  border: '#2A2A2A',

  primary: '#740b0b',
  primaryDark: '#8A0009',

  text: '#FFFFFF',
  textSecondary: '#A0A0A0',
  textMuted: '#666666',

  error: '#D94A4A',
};

/* =========================================================
   ESTILOS
   ========================================================= */

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor:
      localTheme.background,
  },

  container: {
    flexGrow: 1,
    justifyContent: 'center',

    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },

  /* =====================================
     DECORACIÓN
     ===================================== */

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

    backgroundColor:
      localTheme.primary,

    top: -100,
    right: -80,

    opacity: 0.12,
  },

  orbDarkRed: {
    position: 'absolute',

    width: 240,
    height: 240,

    borderRadius: 120,

    backgroundColor:
      localTheme.primaryDark,

    bottom: -80,
    left: -70,

    opacity: 0.25,
  },

  crystalRed: {
    position: 'absolute',

    width: 90,
    height: 90,

    borderRadius: 20,

    backgroundColor:
      localTheme.primary,

    top: 180,
    left: -35,

    opacity: 0.15,

    transform: [
      {
        rotate: '45deg',
      },
    ],
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

    transform: [
      {
        rotate: '45deg',
      },
    ],
  },

  ringStrong1: {
    position: 'absolute',

    width: 130,
    height: 130,

    borderRadius: 65,

    borderWidth: 4,
    borderColor:
      localTheme.primary,

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

    backgroundColor:
      localTheme.primary,

    top: 310,
    left: 50,

    opacity: 0.9,

    shadowColor:
      localTheme.primary,

    shadowOffset: {
      width: 0,
      height: 0,
    },

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

    backgroundColor:
      localTheme.primary,

    top: 120,
    right: 70,

    opacity: 0.8,
  },

  /* =====================================
     HEADER
     ===================================== */

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

    backgroundColor:
      localTheme.surface,

    borderWidth: 1,

    borderColor:
      localTheme.border,

    marginBottom: spacing.md,
  },

  logo: {
    width: 64,
    height: 64,

    borderRadius: 21,

    backgroundColor:
      localTheme.primary,

    alignItems: 'center',
    justifyContent: 'center',

    shadowColor:
      localTheme.primary,

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
    color:
      localTheme.textSecondary,

    fontSize: 12,

    lineHeight: 17,

    textAlign: 'center',
  },

  /* =====================================
     CARD
     ===================================== */

  card: {
    backgroundColor:
      localTheme.surface,

    borderRadius: radius.lg,

    borderWidth: 1,

    borderColor:
      localTheme.border,

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
    color:
      localTheme.textSecondary,

    marginTop: 5,

    fontSize: 12,

    lineHeight: 19,
  },

  /* =====================================
     FORMULARIO
     ===================================== */

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

  inputFocused: {
    backgroundColor:
      localTheme.surface,

    borderColor:
      localTheme.primary,
  },

  input: {
    flex: 1,

    minHeight: 52,

    backgroundColor:
      localTheme.surfaceSoft,

    borderColor:
      localTheme.border,

    borderRadius: radius.md,

    color: localTheme.text,

    fontSize: 14,

    paddingHorizontal: spacing.md,

    paddingVertical: 0,
  },

  passwordField: {
    position: 'relative',
  },

  showButton: {
    position: 'absolute',

    top: 28,
    right: spacing.md,

    paddingVertical: spacing.sm,
  },

  showButtonText: {
    color:
      localTheme.primary,

    fontSize: 9,

    fontWeight: '900',

    letterSpacing: 0.3,
  },

  /* =====================================
     ERROR
     ===================================== */

  errorContainer: {
    flexDirection: 'row',

    alignItems: 'center',

    gap: spacing.sm,

    paddingHorizontal: spacing.md,

    paddingVertical: spacing.sm,

    borderRadius: radius.md,

    backgroundColor: '#241010',

    borderWidth: 1,

    borderColor: '#4A1D1D',
  },

  errorDot: {
    width: 7,
    height: 7,

    borderRadius: 4,

    backgroundColor:
      localTheme.error,
  },

  errorText: {
    flex: 1,

    color:
      '#F0A0A0',

    fontSize: 12,

    lineHeight: 17,
  },

  /* =====================================
     BOTÓN
     ===================================== */

  loginButton: {
    marginTop: spacing.sm,

    backgroundColor:
      localTheme.primary,

    borderRadius: radius.md,
  },

  /* =====================================
     INFORMACIÓN
     ===================================== */

  bottomInfo: {
    marginTop: spacing.xl,

    paddingTop: spacing.lg,

    borderTopWidth: 1,

    borderTopColor:
      localTheme.border,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'center',
  },

  statusDot: {
    width: 7,
    height: 7,

    borderRadius: 4,

    backgroundColor:
      localTheme.primary,

    marginRight: spacing.sm,
  },

  bottomText: {
    color:
      localTheme.textMuted,

    fontSize: 10,

    fontWeight: '600',
  },

  /* =====================================
     DEMO
     ===================================== */

  demoInfo: {
    marginTop: spacing.lg,

    alignItems: 'center',

    paddingHorizontal: spacing.md,
  },

  demoTitle: {
    color:
      localTheme.textSecondary,

    fontSize: 11,

    fontWeight: '800',

    marginBottom: spacing.xs,
  },

  demoText: {
    color:
      localTheme.textMuted,

    fontSize: 10,

    lineHeight: 16,
  },

  demoPassword: {
    color:
      localTheme.textMuted,

    fontSize: 10,

    marginTop: spacing.xs,
  },

  /* =====================================
     FOOTER
     ===================================== */

  footer: {
    marginTop: spacing.lg,

    alignItems: 'center',
  },

  footerText: {
    color:
      localTheme.textMuted,

    fontSize: 10,
  },
});

