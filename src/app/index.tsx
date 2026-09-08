import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

export default function IndexScreen() {
  const { isAuthenticated, role } = useAuthStore();

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