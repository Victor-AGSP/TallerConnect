import { formatBudgetAmount } from '@/components/orders/OrderBudgetView';
import type { BudgetDetailResponseDto } from '@/dto/budget.dto';
import { INVALID_BUDGET_RESPONSE, mapBudgetDetailResponse } from '@/mappers/budget.mapper';
import { mapBudgetDetailResponse as mapManagedBudgetDetailResponse } from '@/mappers/budget-management.mapper';
import { invalidBudgetAmounts, validBudgetAmounts } from '@/mocks/payloads/budget-amount.payload';
import { budgetDetailPayloads } from '@/mocks/payloads/budget.payload';

const base = budgetDetailPayloads.enviado;
const [version] = base.versiones;
const [item] = version.items;

/** Presupuesto con el mismo importe en la cantidad, el precio, el subtotal y ambos totales. */
function conImporte(importe: string): BudgetDetailResponseDto {
  return {
    ...base,
    total_ultima_version: importe,
    versiones: [
      {
        ...version,
        total: importe,
        items: [{ ...item, cantidad: importe, precio_unitario: importe, subtotal: importe }],
      },
    ],
  };
}

/** Presupuesto válido con un único campo cambiado. */
const conCampo: Record<string, (importe: string) => BudgetDetailResponseDto> = {
  cantidad: (importe) => ({
    ...base,
    versiones: [{ ...version, items: [{ ...item, cantidad: importe }] }],
  }),
  precio_unitario: (importe) => ({
    ...base,
    versiones: [{ ...version, items: [{ ...item, precio_unitario: importe }] }],
  }),
  subtotal: (importe) => ({
    ...base,
    versiones: [{ ...version, items: [{ ...item, subtotal: importe }] }],
  }),
  total: (importe) => ({ ...base, versiones: [{ ...version, total: importe }] }),
  total_ultima_version: (importe) => ({ ...base, total_ultima_version: importe }),
};

const campos = Object.keys(conCampo);

describe('Importes del presupuesto de la orden (budget.mapper)', () => {
  // Modelo que usa la pantalla de presupuesto de la orden: conserva los importes como texto.
  it.each(validBudgetAmounts)('conserva "$texto" sin modificarlo', ({ texto }) => {
    const budget = mapBudgetDetailResponse(conImporte(texto));
    const [versionMapeada] = budget.versions;
    const [itemMapeado] = versionMapeada.items;

    expect([
      itemMapeado.quantity,
      itemMapeado.unitPrice,
      itemMapeado.subtotal,
      versionMapeada.total,
      budget.latestTotal,
    ]).toEqual([texto, texto, texto, texto, texto]);
  });

  it.each(invalidBudgetAmounts)('rechaza el importe "%s"', (texto) => {
    expect(() => mapBudgetDetailResponse(conImporte(texto))).toThrow(INVALID_BUDGET_RESPONSE);
  });

  it.each(campos)('valida el formato decimal de %s', (campo) => {
    expect(() => mapBudgetDetailResponse(conCampo[campo]('1e3'))).toThrow(INVALID_BUDGET_RESPONSE);
  });
});

describe('Importes de la gestión de presupuestos (budget-management.mapper)', () => {
  // Modelo ManagedBudget: convierte los importes a número.
  it.each(validBudgetAmounts)('convierte "$texto" en $numero', ({ texto, numero }) => {
    const budget = mapManagedBudgetDetailResponse(conImporte(texto));
    const [versionMapeada] = budget.versions;
    const [itemMapeado] = versionMapeada.items;

    expect([
      itemMapeado.quantity,
      itemMapeado.unitPrice,
      itemMapeado.subtotal,
      versionMapeada.total,
      budget.latestVersionTotal,
    ]).toEqual([numero, numero, numero, numero, numero]);
  });

  it.each(invalidBudgetAmounts)('rechaza el importe "%s"', (texto) => {
    expect(() => mapManagedBudgetDetailResponse(conImporte(texto))).toThrow('Valor decimal inválido');
  });

  it.each(campos)('valida el formato decimal de %s', (campo) => {
    expect(() => mapManagedBudgetDetailResponse(conCampo[campo]('1e3'))).toThrow(
      `Valor decimal inválido en ${campo}:`
    );
  });
});

describe('Presentación de importes con formatBudgetAmount', () => {
  // El redondeo a dos decimales ocurre solo al mostrar el importe; el modelo conserva el texto.
  // 1.005 detecta un redondeo binario incorrecto: (1.005).toFixed(2) devuelve "1.00".
  it.each([
    ['15000.50', '$15.000,5'],
    ['15000.00', '$15.000'],
    ['1234567.89', '$1.234.567,89'],
    ['0.123456789', '$0,12'],
    ['1.005', '$1,01'],
    ['15000.505', '$15.000,51'],
  ])('"%s" se muestra como "%s"', (texto, esperado) => {
    expect(formatBudgetAmount(texto)).toBe(esperado);
  });
});
