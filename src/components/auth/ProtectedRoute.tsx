import type { PropsWithChildren } from 'react';
import type { UserRole } from '@/constants/roles';
import { RoleGuard } from './RoleGuard';

// Keep the older component API while both route trees share the current guard.
export function ProtectedRoute({
  allowedRole,
  children,
}: PropsWithChildren<{ allowedRole: UserRole }>) {
  return <RoleGuard role={allowedRole}>{children}</RoleGuard>;
}
