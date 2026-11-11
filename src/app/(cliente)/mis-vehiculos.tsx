import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import { VehicleListView } from '@/components/vehicles/VehicleListView';
import { vehiclesService } from '@/services/vehicles.service';

/**
 * Listado de vehículos del cliente autenticado.
 * Consulta GET /api/vehiculos mediante VehiclesService.getMyVehicles.
 * El backend determina el alcance del cliente a partir del token.
 */
export default function MisVehiculosScreen() {
  const router = useRouter();
  const loadVehicles = useCallback(
    () => vehiclesService.getMyVehicles(),
    [],
  );

  return (
    <VehicleListView
      eyebrow="Portal del cliente"
      title="Mis vehículos"
      subtitle="Vehículos registrados a tu nombre en el taller."
      emptyMessage="Todavía no tienes vehículos registrados en el taller."
      onOpenVehicle={(id) => router.push(`/(cliente)/vehiculos/${id}`)}
      loadVehicles={loadVehicles}
    />
  );
}
