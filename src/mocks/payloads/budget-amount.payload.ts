/**
 * Importes con el formato que el MS3 usa en `ItemSalida`, `VersionDetalle` y
 * `PresupuestoResumen`: texto decimal no negativo. `numero` es el valor que debe resultar
 * al convertir el texto.
 */
export const validBudgetAmounts: { texto: string; numero: number }[] = [
  { texto: '15000.50', numero: 15000.5 },
  { texto: '15000.00', numero: 15000 },
  { texto: '0.1', numero: 0.1 },
  { texto: '1.5', numero: 1.5 },
  { texto: '0.123456789', numero: 0.123456789 },
  { texto: '1234567.89', numero: 1234567.89 },
  { texto: '12345678901234.56', numero: 12345678901234.56 },
];

/**
 * Importes fuera del formato del contrato. Deben rechazarse en lugar de convertirse:
 * `Number()` interpreta varios de ellos como un número distinto ("1e3" como 1000,
 * "0x10" como 16, " 12 " como 12).
 */
export const invalidBudgetAmounts: string[] = [
  '',
  'abc',
  'Infinity',
  '1e3',
  '15,000.00',
  ' 12 ',
  '-5',
  '0x10',
];
