import { Stack, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { RoleGuard } from '@/components/auth/RoleGuard';
import type { UserRole } from '@/constants/roles';
import { colors } from '@/constants/theme';

const homeScreens = {
  cliente: 'cliente',
  mecanico: 'mecanico',
  administrador: 'administrador',
} as const;

const homeRoutes = {
  cliente: '/(cliente)/cliente',
  mecanico: '/(mecanico)/mecanico',
  administrador: '/(admin)/administrador',
} as const;

interface RoleStackProps {
  role: UserRole;
}

export function RoleStack({ role }: RoleStackProps) {
  const router = useRouter();

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(homeRoutes[role] as never);
    }
  };

  return (
    <RoleGuard role={role}>
      <Stack
        screenOptions={{
          headerShown: true,
          headerTitle: '',
          headerTintColor: colors.primary,
          headerStyle: {
            backgroundColor: colors.surface,
          },
          headerShadowVisible: false,
          animation: 'slide_from_right',
          headerLeft: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Volver a la pantalla anterior"
              accessibilityHint="Regresa a la pantalla anterior o al panel principal"
              onPress={goBack}
              hitSlop={8}
              style={styles.backButton}
            >
              <Text style={styles.backText}>
                {'‹ Volver'}
              </Text>
            </Pressable>
          ),
        }}
      >
        <Stack.Screen
          name={homeScreens[role]}
          options={{ headerShown: false }}
        />
      </Stack>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  backButton: {
    minWidth: 90,
    minHeight: 44,
    justifyContent: 'center',
  },
  backText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
});
