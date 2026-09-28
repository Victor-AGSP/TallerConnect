import { Stack } from 'expo-router';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function AdminLayout() {
  return (
    <ProtectedRoute allowedRole="administrador">
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
    </ProtectedRoute>
  );
}
