import { useCallback } from 'react';

import { SparePartListView } from '@/components/parts/SparePartListView';
import { partsService } from '@/services/parts.service';

/**
 * Inventario de repuestos del taller.
 * Consulta GET /api/repuestos (MS3) mediante PartsService.
 */
export default function RepuestosScreen() {
  const loadSpareParts = useCallback(() => partsService.getSpareParts(), []);
  const loadMoreSpareParts = useCallback(
    (offset: number) => partsService.getSpareParts({ offset }),
    [],
  );

  return (
    <SparePartListView
      eyebrow="Administración"
      loadSpareParts={loadSpareParts}
      loadMoreSpareParts={loadMoreSpareParts}
    />
  );
}
