import { Stack } from 'expo-router';
import { RoleGuard } from '@/components/auth/RoleGuard';

export default function AdminLayout() {
  return (
    <RoleGuard role="administrador">
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
    </RoleGuard>
  );
}
