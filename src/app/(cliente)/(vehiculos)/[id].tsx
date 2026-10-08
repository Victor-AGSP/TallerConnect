import { useLocalSearchParams } from 'expo-router';

import { VehicleDetailScreen } from '@/components/vehicles/VehicleDetailScreen';

export default function ClienteVehiculoDetailScreen() {
  const { id } = useLocalSearchParams<{
    id: string;
  }>();

  return (
    <VehicleDetailScreen
      role="cliente"
      vehicleId={id}
    />
  );
}