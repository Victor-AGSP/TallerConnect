import { useCallback } from 'react';

import { VehicleListView } from '@/components/vehicles/VehicleListView';
import { vehiclesService } from '@/services/vehicles.service';

/**
 * Catálogo completo de vehículos registrados en el taller.
 * Consulta GET /api/vehiculos mediante VehiclesService.
 */
export default function VehiculosScreen() {
  const loadVehicles = useCallback(() => vehiclesService.getVehicles(), []);

  return (
    <VehicleListView
      eyebrow="Administración"
      title="Vehículos registrados"
      subtitle="Catálogo completo de vehículos del taller."
      emptyMessage="Todavía no hay vehículos registrados en el sistema."
      loadVehicles={loadVehicles}
    />
  );
}
