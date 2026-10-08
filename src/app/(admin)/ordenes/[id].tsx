import { useLocalSearchParams } from 'expo-router';

import { OrderDetailScreen } from '@/components/orders/OrderDetailScreen';

export default function AdministradorOrdenDetailScreen() {
  const { id } = useLocalSearchParams<{
    id: string;
  }>();

  return (
    <OrderDetailScreen
      role="administrador"
      orderId={id}
    />
  );
}