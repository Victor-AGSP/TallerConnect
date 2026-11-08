import { useCallback } from 'react';
import { useLocalSearchParams } from 'expo-router';

import { SupplierDetailView } from '@/components/parts/SupplierDetailView';
import { partsService } from '@/services/parts.service';

/**
 * Detalle de un proveedor con sus repuestos.
 * Consulta GET /api/proveedores/{id} (MS3) mediante PartsService.
 */
export default function ProveedorScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();

  const loadSupplier = useCallback(
    (supplierId: string) => partsService.getSupplierById(supplierId),
    [],
  );

  return (
    <SupplierDetailView
      eyebrow="Administración"
      supplierId={id}
      loadSupplier={loadSupplier}
    />
  );
}
