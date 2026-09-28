import { Stack } from 'expo-router';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function ClienteLayout() {
  return (
    <ProtectedRoute allowedRole="cliente">
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
    </ProtectedRoute>
  );
}
