import { useLocalSearchParams } from 'expo-router';

import { VehicleDetailScreen } from '@/components/vehicles/VehicleDetailScreen';

export default function MecanicoVehiculoDetailScreen() {
  const { id } = useLocalSearchParams<{
    id: string;
  }>();

  return (
    <VehicleDetailScreen
      role="mecanico"
      vehicleId={id}
    />
  );
}