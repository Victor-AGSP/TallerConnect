import { useCallback, useEffect, useState } from 'react';

import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  EmptyState,
  ErrorMessage,
  Loading,
  Card,
} from '@/components/common';

import { AppScreen } from '@/components/layout/AppScreen';

import { colors, radius, spacing } from '@/constants/theme';

import type { UserRole } from '@/constants/roles';

import type { Vehicle } from '@/models/vehicle.model';

import { vehiclesService } from '@/services/vehicles.service';

interface VehicleListScreenProps {
  role: UserRole;
}

function getVehiclesByRole(
  role: UserRole
): Promise<Vehicle[]> {
  switch (role) {
    case 'cliente':
      return vehiclesService.getMyVehicles();

    case 'mecanico':
      return vehiclesService.getAssignedVehicles();

    case 'administrador':
      return vehiclesService.getVehicles();

    default:
      return Promise.resolve([]);
  }
}

function getRoleSubtitle(role: UserRole): string {
  switch (role) {
    case 'cliente':
      return 'Vehículos asociados a tu cuenta.';

    case 'mecanico':
      return 'Vehículos relacionados con tus órdenes asignadas.';

    case 'administrador':
      return 'Vehículos registrados en el taller.';

    default:
      return 'Vehículos disponibles.';
  }
}

export function VehicleListScreen({
  role,
}: VehicleListScreenProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    null
  );

  const loadVehicles = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await getVehiclesByRole(role);
      setVehicles(result);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'No fue posible cargar los vehículos.';

      setVehicles([]);
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }, [role]);

  useEffect(() => {
    void loadVehicles();
  }, [loadVehicles]);

  return (
    <AppScreen
      eyebrow="Vehículos"
      title="Mis vehículos"
      subtitle={getRoleSubtitle(role)}
    >
      {isLoading ? (
        <Loading
          message="Cargando vehículos..."
          testID="vehicles-loading"
        />
      ) : errorMessage ? (
        <ErrorMessage
          title="No se pudieron cargar los vehículos"
          message={errorMessage}
          onRetry={() => {
            void loadVehicles();
          }}
          retryLabel="Reintentar"
          testID="vehicles-error"
        />
      ) : vehicles.length === 0 ? (
        <EmptyState
          title="No hay vehículos"
          message="No encontramos vehículos disponibles para tu cuenta en este momento."
          testID="vehicles-empty"
        />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          testID="vehicles-list"
        >
          {vehicles.map((vehicle) => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
            />
          ))}
        </ScrollView>
      )}
    </AppScreen>
  );
}

interface VehicleCardProps {
  vehicle: Vehicle;
}

function VehicleCard({
  vehicle,
}: VehicleCardProps) {
  return (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.vehicleIdentity}>
          <Text style={styles.plateLabel}>
            PATENTE
          </Text>

          <Text style={styles.plate}>
            {vehicle.plate}
          </Text>
        </View>

        <View style={styles.vehicleBadge}>
          <Text style={styles.vehicleBadgeText}>
            VEHÍCULO
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.infoGrid}>
        <InfoItem
          label="Marca"
          value={vehicle.brand || 'Sin información'}
        />

        <InfoItem
          label="Modelo"
          value={vehicle.model || 'Sin información'}
        />

        <InfoItem
          label="Año"
          value={
            vehicle.year !== null
              ? String(vehicle.year)
              : 'Sin información'
          }
        />

        <InfoItem
          label="Kilometraje"
          value={
            vehicle.mileage !== null
              ? `${vehicle.mileage.toLocaleString('es-CL')} km`
              : 'Sin información'
          }
        />
      </View>
    </Card>
  );
}

interface InfoItemProps {
  label: string;
  value: string;
}

function InfoItem({
  label,
  value,
}: InfoItemProps) {
  return (
    <View style={styles.infoItem}>
      <Text style={styles.infoLabel}>
        {label}
      </Text>

      <Text
        style={styles.infoValue}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },

  card: {
    borderRadius: radius.lg,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },

  vehicleIdentity: {
    flex: 1,
  },

  plateLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },

  plate: {
    marginTop: spacing.xs,
    color: colors.primary,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  vehicleBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primarySoft,
  },

  vehicleBadgeText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  divider: {
    height: 1,
    marginVertical: spacing.md,
    backgroundColor: colors.border,
  },

  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing.md,
  },

  infoItem: {
    width: '50%',
    paddingRight: spacing.sm,
  },

  infoLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  infoValue: {
    marginTop: spacing.xs,
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
});