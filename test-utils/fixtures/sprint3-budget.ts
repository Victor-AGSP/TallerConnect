import type { BudgetDetailResponseDto } from '@/dto/budget.dto';

/** Fixture local de contrato MS3. No es una respuesta de producción. */
export const budgetDetail: BudgetDetailResponseDto = {
  presupuesto_id: 5, orden_id: 31, creado_en: '2026-11-14T10:00:00Z',
  cantidad_versiones: 1, ultima_version: 1, estado_ultima_version: 'enviada',
  total_ultima_version: '125000.00', version_vigente: null,
  versiones: [{
    numero: 1, estado: 'enviada', es_modificacion: false, creado_por_id: 99,
    creado_en: '2026-11-14T10:00:00Z', enviado_en: '2026-11-14T11:00:00Z',
    bloqueada_en: '2026-11-14T11:00:00Z', total: '125000.00', decision: null,
    items: [{ item_id: 11, tipo: 'mano_de_obra', descripcion: 'Trabajo QA local',
      cantidad: '1', precio_unitario: '125000.00', subtotal: '125000.00', repuesto_id: null }],
  }],
};

export function budgetPage(detail = budgetDetail) {
  const { versiones: _versions, ...summary } = detail;
  return { total: 1, desde: 0, limite: 20, presupuestos: [summary] };
}
