import { useLocalSearchParams } from 'expo-router';

import { VehicleDetailScreen } from '@/components/vehicles/VehicleDetailScreen';

export default function MecanicoVehicleDetailScreen() {
const { id } = useLocalSearchParams<{ id: string }>();

return ( <VehicleDetailScreen
   role="mecanico"
   vehicleId={id}
 />
);
}
