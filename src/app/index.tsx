import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { Loading } from '@/components/common';
import { getAuthRouteForRole } from '@/utils/auth-routing';

export default function IndexScreen() {
  const { isAuthenticated, isLoading, role } = useAuthStore();

  if (isLoading) {
    return <Loading />;
  }

  return (
    <Redirect href={getAuthRouteForRole(isAuthenticated ? role : null)} />
  );
}
