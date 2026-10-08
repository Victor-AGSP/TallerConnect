import { useLocalSearchParams } from 'expo-router';

import { VehicleDetailScreen } from '@/components/vehicles/VehicleDetailScreen';

export default function AdministradorVehiculoDetailScreen() {
  const { id } = useLocalSearchParams<{
    id: string;
  }>();

  return (
    <VehicleDetailScreen
      role="administrador"
      vehicleId={id}
    />
  );
}