import React, { useEffect } from 'react';

import {
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native';

import { Redirect } from 'expo-router';

import { colors } from '@/constants/theme';

import { getRouteByRole } from '@/constants/routes';

import { useAuthStore } from '@/stores/authStore';

export default function IndexScreen() {
  const {
    isAuthenticated,
    role,
    isHydrated,
    restoreSession,
  } = useAuthStore();

  /**
   * Recupera la sesión almacenada al iniciar
   * la aplicación.
   */
  useEffect(() => {
    if (!isHydrated) {
      restoreSession();
    }
  }, [isHydrated, restoreSession]);

  /**
   * Mientras se recupera la sesión,
   * mostramos un indicador de carga.
   */
  if (!isHydrated) {
    return (
      <View style={styles.container}>
        <ActivityIndicator
          size="large"
          color={colors.primary}
        />
      </View>
    );
  }

  /**
   * Si no existe una sesión válida,
   * enviamos al usuario al Login.
   */
  if (!isAuthenticated || !role) {
    return <Redirect href="/login" />;
  }

  /**
   * Obtenemos la ruta correspondiente
   * al rol autenticado.
   */
  const route = getRouteByRole(role);

  return <Redirect href={route} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});