import { useLocalSearchParams } from 'expo-router';

import { OrderDetailScreen } from '@/components/orders/OrderDetailScreen';

export default function MecanicoOrdenDetailScreen() {
  const { id } = useLocalSearchParams<{
    id: string;
  }>();

  return (
    <OrderDetailScreen
      role="mecanico"
      orderId={id}
    />
  );
}