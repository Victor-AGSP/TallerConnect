import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { colors } from '@/constants/theme';

export default function IndexScreen() {
  const { isAuthenticated, role, isHydrated, restoreSession } = useAuthStore();

  useEffect(() => {
    if (!isHydrated) {
      restoreSession();
    }
  }, [isHydrated, restoreSession]);

  // Mientras se recupera el estado de sesión desde SecureStore, mostrar indicador de carga
  if (!isHydrated) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Si no hay sesión válida recuperada, enviar al Login
  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  // Redirección inteligente según el rol del usuario autenticado
  switch (role) {
    case 'administrador':
      return <Redirect href="/administrador" />;
    case 'mecanico':
      return <Redirect href="/mecanico" />;
    case 'cliente':
      return <Redirect href="/cliente" />;
    default:
      return <Redirect href="/login" />;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});