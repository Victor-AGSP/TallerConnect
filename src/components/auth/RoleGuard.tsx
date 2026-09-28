import {
  Redirect,
} from 'expo-router';

import {
  PropsWithChildren,
} from 'react';

import {
  StyleSheet,
  View,
} from 'react-native';

import { Loading } from '@/components/common/Loading';

import {
  UserRole,
} from '@/constants/roles';

import {
  getRouteByRole,
} from '@/constants/routes';

import {
  colors,
} from '@/constants/theme';

import {
  useAuthStore,
} from '@/stores/authStore';

interface RoleGuardProps
  extends PropsWithChildren {
  role: UserRole;
}

export function RoleGuard({
  role,
  children,
}: RoleGuardProps) {
  const {
    user,
    isAuthenticated,
    isHydrated,
  } = useAuthStore();

  if (!isHydrated) {
    return (
      <View style={styles.container}>
        <Loading
          message="Verificando sesión..."
        />
      </View>
    );
  }

  if (
    !isAuthenticated ||
    !user
  ) {
    return (
      <Redirect href="/login" />
    );
  }

  if (user.role !== role) {
    return (
      <Redirect
        href={getRouteByRole(user.role)}
      />
    );
  }

  return children;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});