import { useState } from 'react';
import { useRouter } from 'expo-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';

import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, ErrorMessage, Input } from '@/components/common';

import {
  colors,
  radius,
  spacing,
} from '@/constants/theme';

import {
  loginSchema,
  type LoginFormData,
} from '@/schemas/auth.schema';

import { useAuthStore } from '@/stores/authStore';
import { StorageError } from '@/utils/storage';

export default function LoginScreen() {
  const router = useRouter();

  const login = useAuthStore(
    (state) => state.login
  );

  const isLoading = useAuthStore(
    (state) => state.isLoading
  );

  const sessionIssue = useAuthStore(
    (state) => state.sessionIssue
  );

  const hydrateSession = useAuthStore(
    (state) => state.hydrateSession
  );

  const logout = useAuthStore(
    (state) => state.logout
  );

  const [passwordVisible, setPasswordVisible] =
    useState(false);

  const [loginError, setLoginError] =
    useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleLogin = handleSubmit(
    async (credentials) => {
      setLoginError(null);

      try {
        await login(credentials);

        router.replace('/');
      } catch (error) {
        setLoginError(
          error instanceof StorageError
            ? error.message
            : error instanceof Error
              ? error.message
              : 'No se pudo iniciar sesión. Verifica tus credenciales e inténtalo nuevamente.'
        );
      }
    }
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : 'height'
        }
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === 'ios'
              ? 'interactive'
              : 'on-drag'
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View
              accessible
              accessibilityRole="image"
              accessibilityLabel="Logo de TallerConnect"
              style={styles.logoWrapper}
            >
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

          <Card style={styles.card}>
            <Text style={styles.title}>
              Bienvenido
            </Text>

            <Text style={styles.subtitle}>
              Ingresa tus credenciales para acceder
              al sistema.
            </Text>

            <View style={styles.form}>
              <Controller
                control={control}
                name="email"
                render={({
                  field: {
                    onBlur,
                    onChange,
                    value,
                  },
                }) => (
                  <Input
                    label="Correo electrónico"
                    value={value}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    autoComplete="email"
                    returnKeyType="next"
                    placeholder="usuario@correo.cl"
                    placeholderTextColor={
                      colors.textSecondary
                    }
                    labelStyle={styles.label}
                    style={styles.input}
                    focusedStyle={
                      styles.inputFocused
                    }
                    error={errors.email?.message}
                    testID="login-email"
                  />
                )}
              />

              <View style={styles.passwordField}>
                <Controller
                  control={control}
                  name="password"
                  render={({
                    field: {
                      onBlur,
                      onChange,
                      value,
                    },
                  }) => (
                    <Input
                      label="Contraseña"
                      value={value}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      autoCapitalize="none"
                      autoCorrect={false}
                      secureTextEntry={
                        !passwordVisible
                      }
                      textContentType="password"
                      autoComplete="password"
                      returnKeyType="done"
                      placeholder="••••••••"
                      placeholderTextColor={
                        colors.textSecondary
                      }
                      labelStyle={styles.label}
                      style={[
                        styles.input,
                        styles.passwordInput,
                      ]}
                      focusedStyle={
                        styles.inputFocused
                      }
                      error={
                        errors.password?.message
                      }
                      testID="login-password"
                      onSubmitEditing={() =>
                        void handleLogin()
                      }
                    />
                  )}
                />

                <Pressable
  testID="login-password-toggle"
  accessibilityRole="button"
  accessibilityLabel={
    passwordVisible
      ? 'Ocultar contraseña'
      : 'Mostrar contraseña'
  }
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

              {loginError ? (
                <ErrorMessage
                  message={loginError}
                />
              ) : null}

              {sessionIssue ? (
                <ErrorMessage
                  message={sessionIssue.message}
                  onRetry={() =>
                    void (
                      sessionIssue.kind === 'restore'
                        ? hydrateSession()
                        : logout()
                    )
                  }
                />
              ) : null}

              <Button
                title="Iniciar sesión"
                onPress={() =>
                  void handleLogin()
                }
                loading={isLoading}
                accessibilityLabel="Iniciar sesión"
                style={styles.loginButton}
                testID="login-submit"
              />
            </View>

            <View style={styles.bottomInfo}>
              <View
                accessible={false}
                style={styles.statusDot}
              />

              <Text style={styles.bottomText}>
                Acceso seguro al sistema
                TallerConnect
              </Text>
            </View>
          </Card>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              TallerConnect · Aplicación móvil
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

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

  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },

  logoWrapper: {
    width: 82,
    height: 82,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },

  logo: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoText: {
    color: colors.surface,
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

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,

    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },

  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
  },

  subtitle: {
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontSize: 13,
    lineHeight: 19,
  },

  form: {
    marginTop: spacing.xl,
    gap: spacing.lg,
  },

  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },

  input: {
    minHeight: 52,
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: radius.md,
    color: colors.text,
    fontSize: 16,
  },

  passwordInput: {
    paddingRight: 78,
  },

  inputFocused: {
    borderColor: colors.accent,
  },

  passwordField: {
    position: 'relative',
  },

  showButton: {
    position: 'absolute',
    top: 34,
    right: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },

  showButtonText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.3,
  },

  loginButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
  },

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
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
    marginRight: spacing.sm,
  },

  bottomText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },

  footer: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },

  footerText: {
    color: colors.textSecondary,
    fontSize: 10,
  },
});