import { useCallback } from 'react';

import { VehicleListView } from '@/components/vehicles/VehicleListView';
import { vehiclesService } from '@/services/vehicles.service';

/**
 * Listado de vehículos asignados al mecánico autenticado.
 * Consulta GET /api/vehiculos/asignados mediante VehiclesService.
 */
export default function VehiculosAsignadosScreen() {
  const loadVehicles = useCallback(
    () => vehiclesService.getAssignedVehicles(),
    [],
  );

  return (
    <VehicleListView
      eyebrow="Área de trabajo"
      title="Vehículos asignados"
      subtitle="Vehículos sobre los que tienes trabajo asignado."
      emptyMessage="No tienes vehículos asignados en este momento."
      loadVehicles={loadVehicles}
    />
  );
}
