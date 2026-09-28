import { Stack } from 'expo-router';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function MecanicoLayout() {
  return (
    <ProtectedRoute allowedRole="mecanico">
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
    </ProtectedRoute>
  );
}
