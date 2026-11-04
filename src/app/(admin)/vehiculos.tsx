import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import { VehicleListView } from '@/components/vehicles/VehicleListView';
import { vehiclesService } from '@/services/vehicles.service';

/**
 * Catálogo completo de vehículos registrados en el taller.
 * Consulta GET /api/vehiculos mediante VehiclesService.
 */
export default function VehiculosScreen() {
  const router = useRouter();
  const loadVehicles = useCallback(() => vehiclesService.getVehicles(), []);

  return (
    <VehicleListView
      eyebrow="Administración"
      title="Vehículos registrados"
      subtitle="Catálogo completo de vehículos del taller."
      emptyMessage="Todavía no hay vehículos registrados en el sistema."
      onOpenVehicle={(id) => router.push(`/(admin)/vehiculos/${id}`)}
      loadVehicles={loadVehicles}
    />
  );
}
