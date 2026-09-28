import type { PropsWithChildren } from 'react';
import { Redirect } from 'expo-router';

import { Loading } from '@/components/common';
import type { UserRole } from '@/constants/roles';
import { useAuthStore } from '@/stores/authStore';
import { getAuthRouteForRole } from '@/utils/auth-routing';

type ProtectedRouteProps = PropsWithChildren<{
  allowedRole: UserRole;
}>;

export function ProtectedRoute({
  allowedRole,
  children,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, role } = useAuthStore();

  if (isLoading) {
    return <Loading />;
  }

  if (!isAuthenticated || !role) {
    return <Redirect href="/login" />;
  }

  if (role !== allowedRole) {
    return <Redirect href={getAuthRouteForRole(role)} />;
  }

  return children;
}
