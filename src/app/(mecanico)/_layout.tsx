import { Stack } from 'expo-router';

import { RoleGuard } from '@/components/auth/RoleGuard';

export default function MecanicoLayout() {
  return (
    <RoleGuard role="mecanico">
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
    </RoleGuard>
  );
}