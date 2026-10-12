import { useCallback, useEffect, useRef, useState } from 'react';

import { StyleSheet, Text, View } from 'react-native';

import {
  Card,
  EmptyState,
  ErrorMessage,
  Loading,
} from '@/components/common';
import { AppScreen } from '@/components/layout/AppScreen';
import { colors, spacing } from '@/constants/theme';
import type { Vehicle } from '@/models/vehicle.model';
import {
  formatMileage,
  formatPlate,
  formatVehicleYear,
} from '@/utils/formatters';

export interface VehicleListViewProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  emptyMessage: string;

  /**
   * Consulta al servicio de vehículos. Debe ser estable entre renderizados
   * (por ejemplo, memorizada con `useCallback`) porque dispara la carga.
   */
  loadVehicles: () => Promise<Vehicle[]>;
}

const FALLBACK_ERROR = 'No fue posible cargar los vehículos.';

/**
 * Listado de vehículos conectado a VehiclesService.
 *
 * Centraliza los tres estados de la consulta —carga, resultado vacío y
 * error— para las vistas de cliente, mecánico y administración, que solo
 * se diferencian en el endpoint consultado y en sus textos.
 */
export function VehicleListView({
  eyebrow,
  title,
  subtitle,
  emptyMessage,
  loadVehicles,
}: VehicleListViewProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isMountedRef = useRef(true);

  useEffect(
    () => () => {
      isMountedRef.current = false;
    },
    [],
  );

  const runQuery = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await loadVehicles();

      if (!isMountedRef.current) return;

      setVehicles(result);
    } catch (error: unknown) {
      if (!isMountedRef.current) return;

      setVehicles([]);
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : FALLBACK_ERROR,
      );
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [loadVehicles]);

  useEffect(() => {
    void runQuery();
  }, [runQuery]);

  return (
    <AppScreen eyebrow={eyebrow} title={title} subtitle={subtitle}>
      {isLoading ? (
        <Loading
          testID="vehicle-list-loading"
          message="Cargando vehículos..."
        />
      ) : errorMessage ? (
        <ErrorMessage
          testID="vehicle-list-error"
          message={errorMessage}
        />
      ) : vehicles.length === 0 ? (
        <EmptyState
          testID="vehicle-list-empty"
          title="Sin vehículos"
          message={emptyMessage}
        />
      ) : (
        vehicles.map((vehicle) => (
          <VehicleCard key={vehicle.id} vehicle={vehicle} />
        ))
      )}
    </AppScreen>
  );
}

function VehicleCard({ vehicle }: { vehicle: Vehicle }) {
  const plate = formatPlate(vehicle.plate);
  const year = formatVehicleYear(vehicle.year);
  const mileage = formatMileage(vehicle.mileage);
  const description = [vehicle.brand, vehicle.model]
    .filter(Boolean)
    .join(' ');

  return (
    <Card
      testID={`vehicle-card-${vehicle.id}`}
      accessible
      accessibilityLabel={`Vehículo ${plate}. ${
        description || 'Marca y modelo no registrados'
      }. Año: ${year}. Kilometraje: ${mileage}`}
    >
      <Text style={styles.plate}>{plate}</Text>

      {description ? (
        <Text style={styles.description}>{description}</Text>
      ) : null}

      <View style={styles.specs}>
        <Text style={styles.spec}>{year}</Text>
        <Text style={styles.specSeparator}>·</Text>
        <Text style={styles.spec}>{mileage}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  plate: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  description: {
    marginTop: spacing.xs,
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },

  specs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },

  spec: {
    color: colors.textSecondary,
    fontSize: 13,
  },

  specSeparator: {
    color: colors.border,
    fontSize: 13,
  },
});
