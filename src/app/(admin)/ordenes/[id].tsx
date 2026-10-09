import { useLocalSearchParams } from 'expo-router';

import { OrderDetailScreen } from '@/components/orders/OrderDetailScreen';

export default function AdminOrderDetailRoute() {
  const { id } = useLocalSearchParams<{
    id: string | string[];
  }>();

  const orderId = Array.isArray(id) ? id[0] : id;

  return (
    <OrderDetailScreen orderId={orderId} />
  );
}