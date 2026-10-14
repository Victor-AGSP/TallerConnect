import { useCallback } from 'react';
import { useRouter } from 'expo-router';

import { SupplierListView } from '@/components/parts/SupplierListView';
import { partsService } from '@/services/parts.service';

/**
 * Proveedores de repuestos del taller.
 * Consulta GET /api/proveedores (MS3) mediante PartsService.
 */
export default function ProveedoresScreen() {
  const router = useRouter();

  const loadSuppliers = useCallback(() => partsService.getSuppliers(), []);

  const openSupplier = useCallback(
    (supplierId: string) => router.push(`/proveedores/${supplierId}`),
    [router],
  );

  return (
    <SupplierListView
      eyebrow="Administración"
      loadSuppliers={loadSuppliers}
      onSelectSupplier={openSupplier}
    />
  );
}
