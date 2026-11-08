import type { UserRole as Role } from '@/constants/roles';

export type NotificationCategory =
  | 'order_status'
  | 'budget_approval'
  | 'low_stock'
  | 'evidence_uploaded'
  | 'system';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'critical';

export type NotificationContractStatus =
  | 'available'
  | 'unavailable_fallback'
  | 'mock';

export interface WorkshopNotification {
  id: string;
  title: string;
  message: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  read: boolean;
  createdAt: string;
  targetRole: Role | 'all';
  orderId: string | null;
  vehicleId: string | null;
  budgetId: string | null;
  partId: string | null;
}
