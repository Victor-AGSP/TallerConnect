import { useLocalSearchParams } from 'expo-router';

import { OrderDetailScreen } from '@/components/orders/OrderDetailScreen';

export default function ClienteOrdenDetailScreen() {
  const { id } = useLocalSearchParams<{
    id: string;
  }>();

  return (
    <OrderDetailScreen
      role="cliente"
      orderId={id}
    />
  );
}