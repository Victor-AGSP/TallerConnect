
import { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppScreen } from '@/components/layout/AppScreen';
import { Button, Card, Input } from '@/components/common';
import { colors, radius, spacing } from '@/constants/theme';

type InventoryTab = 'parts' | 'providers';

type Part = {
  id: string;
  name: string;
  providerId: string;
  providerName: string;
  stock: number;
  minimumStock: number;
  price: number;
};

type Provider = {
  id: string;
  name: string;
  contact: string;
  phone: string;
  parts: string[];
};

const demoParts: Part[] = [
  {
    id: 'REP-001',
    name: 'Filtro de aceite',
    providerId: 'PROV-001',
    providerName: 'Repuestos del Sur',
    stock: 18,
    minimumStock: 5,
    price: 15000,
  },
  {
    id: 'REP-002',
    name: 'Aceite de motor 5W-30',
    providerId: 'PROV-002',
    providerName: 'Lubricantes Chile',
    stock: 3,
    minimumStock: 8,
    price: 8500,
  },
  {
    id: 'REP-003',
    name: 'Pastillas de freno',
    providerId: 'PROV-001',
    providerName: 'Repuestos del Sur',
    stock: 2,
    minimumStock: 4,
    price: 32000,
  },
  {
    id: 'REP-004',
    name: 'Bujías',
    providerId: 'PROV-003',
    providerName: 'AutoPartes Central',
    stock: 24,
    minimumStock: 6,
    price: 6500,
  },
  {
    id: 'REP-005',
    name: 'Filtro de aire',
    providerId: 'PROV-002',
    providerName: 'Lubricantes Chile',
    stock: 0,
    minimumStock: 5,
    price: 12000,
  },
];

const demoProviders: Provider[] = [
  {
    id: 'PROV-001',
    name: 'Repuestos del Sur',
    contact: 'ventas@repuestosdelsur.cl',
    phone: '+56 9 5555 0101',
    parts: ['REP-001', 'REP-003'],
  },
  {
    id: 'PROV-002',
    name: 'Lubricantes Chile',
    contact: 'contacto@lubricantes.cl',
    phone: '+56 9 5555 0102',
    parts: ['REP-002', 'REP-005'],
  },
  {
    id: 'PROV-003',
    name: 'AutoPartes Central',
    contact: 'ventas@autopartes.cl',
    phone: '+56 9 5555 0103',
    parts: ['REP-004'],
  },
];

const formatCLP = (amount: number) =>
  amount.toLocaleString('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  });

export function InventoryScreen() {
  const [activeTab, setActiveTab] = useState<InventoryTab>('parts');
  const [search, setSearch] = useState('');
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(
    null,
  );

  const normalizedSearch = search.trim().toLocaleLowerCase('es-CL');

  const filteredParts = useMemo(
    () =>
      demoParts.filter((part) =>
        [
          part.id,
          part.name,
          part.providerName,
        ].some((value) =>
          value.toLocaleLowerCase('es-CL').includes(normalizedSearch),
        ),
      ),
    [normalizedSearch],
  );

  const filteredProviders = useMemo(
    () =>
      demoProviders.filter((provider) =>
        [
          provider.id,
          provider.name,
          provider.contact,
          provider.phone,
        ].some((value) =>
          value.toLocaleLowerCase('es-CL').includes(normalizedSearch),
        ),
      ),
    [normalizedSearch],
  );

  const lowStockCount = demoParts.filter(
    (part) => part.stock <= part.minimumStock,
  ).length;

  const outOfStockCount = demoParts.filter(
    (part) => part.stock === 0,
  ).length;

  const selectedProvider = demoProviders.find(
    (provider) => provider.id === selectedProviderId,
  );

  function changeTab(tab: InventoryTab) {
    setActiveTab(tab);
    setSearch('');
    setSelectedProviderId(null);
  }

  return (
    <AppScreen
      eyebrow="Gestión del taller"
      title="Inventario"
      subtitle="Consulta los repuestos disponibles y la información de sus proveedores."
    >
      <View style={styles.tabs}>
        <View style={styles.tabButton}>
          <Button
            title="Repuestos"
            variant={activeTab === 'parts' ? 'primary' : 'outline'}
            onPress={() => changeTab('parts')}
          />
        </View>

        <View style={styles.tabButton}>
          <Button
            title="Proveedores"
            variant={activeTab === 'providers' ? 'primary' : 'outline'}
            onPress={() => changeTab('providers')}
          />
        </View>
      </View>

      <View style={styles.metrics}>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{demoParts.length}</Text>
          <Text style={styles.metricLabel}>Repuestos</Text>
        </View>

        <View style={styles.metric}>
          <Text style={styles.metricValue}>{demoProviders.length}</Text>
          <Text style={styles.metricLabel}>Proveedores</Text>
        </View>

        <View style={styles.metric}>
          <Text style={[styles.metricValue, styles.warningText]}>
            {lowStockCount}
          </Text>
          <Text style={styles.metricLabel}>Stock bajo</Text>
        </View>
      </View>

      {outOfStockCount > 0 ? (
        <View style={styles.alert}>
          <Text style={styles.alertTitle}>Atención: hay repuestos agotados</Text>
          <Text style={styles.alertText}>
            {outOfStockCount} repuesto(s) tienen stock igual a cero.
            Revisa el inventario antes de asignarlos a una orden.
          </Text>
        </View>
      ) : null}

      <Input
        label={activeTab === 'parts' ? 'Buscar repuesto' : 'Buscar proveedor'}
        value={search}
        onChangeText={setSearch}
        placeholder={
          activeTab === 'parts'
            ? 'Nombre, código o proveedor'
            : 'Nombre, correo o teléfono'
        }
        returnKeyType="search"
        autoCapitalize="none"
      />

      {activeTab === 'parts' ? (
        <View style={styles.results}>
          <Text style={styles.sectionTitle}>Catálogo de repuestos</Text>

          {filteredParts.length === 0 ? (
            <Card>
              <Text style={styles.emptyTitle}>No se encontraron repuestos</Text>
              <Text style={styles.muted}>
                Prueba con otro nombre, código o proveedor.
              </Text>
            </Card>
          ) : (
            filteredParts.map((part) => (
              <Card key={part.id} style={styles.resultCard}>
                <View style={styles.cardHeading}>
                  <View style={styles.cardHeadingText}>
                    <Text style={styles.partName}>{part.name}</Text>
                    <Text style={styles.muted}>{part.id}</Text>
                  </View>

                  <StockBadge
                    stock={part.stock}
                    minimumStock={part.minimumStock}
                  />
                </View>

                <View style={styles.separator} />

                <InfoRow label="Proveedor" value={part.providerName} />
                <InfoRow label="Stock disponible" value={`${part.stock} unidades`} />
                <InfoRow
                  label="Stock mínimo"
                  value={`${part.minimumStock} unidades`}
                />

                <View style={styles.priceRow}>
                  <Text style={styles.muted}>Precio referencial</Text>
                  <Text style={styles.price}>{formatCLP(part.price)}</Text>
                </View>
              </Card>
            ))
          )}
        </View>
      ) : (
        <View style={styles.results}>
          {selectedProvider ? (
            <>
              <Button
                title="Volver a proveedores"
                variant="outline"
                onPress={() => setSelectedProviderId(null)}
              />

              <Card>
                <Text style={styles.providerName}>{selectedProvider.name}</Text>
                <Text style={styles.muted}>{selectedProvider.id}</Text>

                <View style={styles.separator} />

                <InfoRow label="Contacto" value={selectedProvider.contact} />
                <InfoRow label="Teléfono" value={selectedProvider.phone} />
                <InfoRow
                  label="Repuestos asociados"
                  value={`${selectedProvider.parts.length}`}
                />
              </Card>

              <Text style={styles.sectionTitle}>Repuestos del proveedor</Text>

              {demoParts
                .filter((part) =>
                  selectedProvider.parts.includes(part.id),
                )
                .map((part) => (
                  <Card key={part.id} style={styles.resultCard}>
                    <Text style={styles.partName}>{part.name}</Text>
                    <Text style={styles.muted}>{part.id}</Text>
                    <View style={styles.priceRow}>
                      <Text style={styles.muted}>
                        Stock: {part.stock} unidades
                      </Text>
                      <Text style={styles.price}>{formatCLP(part.price)}</Text>
                    </View>
                  </Card>
                ))}
            </>
          ) : filteredProviders.length === 0 ? (
            <Card>
              <Text style={styles.emptyTitle}>No se encontraron proveedores</Text>
              <Text style={styles.muted}>
                Prueba con otro nombre, correo o teléfono.
              </Text>
            </Card>
          ) : (
            filteredProviders.map((provider) => (
              <Card key={provider.id} style={styles.resultCard}>
                <Text style={styles.providerName}>{provider.name}</Text>
                <Text style={styles.muted}>{provider.id}</Text>

                <View style={styles.separator} />

                <InfoRow label="Correo" value={provider.contact} />
                <InfoRow label="Teléfono" value={provider.phone} />
                <InfoRow
                  label="Repuestos asociados"
                  value={`${provider.parts.length}`}
                />

                <Button
                  title="Ver detalle del proveedor"
                  variant="outline"
                  onPress={() => setSelectedProviderId(provider.id)}
                  style={styles.detailButton}
                />
              </Card>
            ))
          )}
        </View>
      )}

      <Text style={styles.demoNote}>
        Datos simulados para desarrollo. Los cambios de stock y la información
        de proveedores todavía no se guardan en el servidor.
      </Text>
    </AppScreen>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function StockBadge({
  stock,
  minimumStock,
}: {
  stock: number;
  minimumStock: number;
}) {
  const exhausted = stock === 0;
  const low = stock > 0 && stock <= minimumStock;

  return (
    <View
      style={[
        styles.stockBadge,
        exhausted && styles.stockExhausted,
        low && styles.stockLow,
        !exhausted && !low && styles.stockAvailable,
      ]}
    >
      <Text
        style={[
          styles.stockText,
          exhausted && styles.stockExhaustedText,
          low && styles.stockLowText,
          !exhausted && !low && styles.stockAvailableText,
        ]}
      >
        {exhausted ? 'Agotado' : low ? 'Stock bajo' : 'Disponible'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tabButton: {
    flex: 1,
  },
  metrics: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metric: {
    flex: 1,
    minWidth: 0,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricValue: {
    color: colors.primary,
    fontSize: 23,
    fontWeight: '900',
  },
  metricLabel: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
  },
  warningText: {
    color: colors.warning,
  },
  alert: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.warningSoft,
    borderWidth: 1,
    borderColor: colors.warning,
    gap: spacing.xs,
  },
  alertTitle: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 14,
  },
  alertText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  results: {
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '900',
  },
  resultCard: {
    gap: spacing.sm,
  },
  cardHeading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cardHeadingText: {
    flex: 1,
    gap: spacing.xs,
  },
  partName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    flexShrink: 1,
  },
  providerName: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '900',
  },
  muted: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  infoLabel: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 13,
  },
  infoValue: {
    flex: 1.2,
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  price: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '900',
  },
  stockBadge: {
    maxWidth: 105,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  stockText: {
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  stockAvailable: {
    backgroundColor: colors.successSoft,
  },
  stockAvailableText: {
    color: colors.success,
  },
  stockLow: {
    backgroundColor: colors.warningSoft,
  },
  stockLowText: {
    color: colors.warning,
  },
  stockExhausted: {
    backgroundColor: colors.dangerSoft,
  },
  stockExhaustedText: {
    color: colors.danger,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  detailButton: {
    marginTop: spacing.sm,
  },
  demoNote: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.sm,
  },
});
