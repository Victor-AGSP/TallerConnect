import { ORDER_STATUS, ORDER_STATUS_BY_CODE } from '@/constants/orderStatus';
import { STATUS_TO_CODE, mapOrderStatusUpdateRequest } from '@/mappers/order.mapper';

/** Códigos del catálogo oficial de `estado_codigo` publicado en `/ms2/openapi.json`. */
const CODIGOS_CONTRATO = [1, 2, 3, 4, 5, 6, 7, 8];

/** Estados de la app que no tienen código en MS2. */
const ESTADOS_SIN_CODIGO = [
  ORDER_STATUS.PAUSADO_POR_PRESUPUESTO_RECHAZADO,
  ORDER_STATUS.CONTROL_CALIDAD,
];

describe('Equivalencia entre estados de MS2 y WorkOrderStatus', () => {
  it('la app reconoce exactamente los códigos del catálogo del contrato', () => {
    expect(Object.keys(ORDER_STATUS_BY_CODE).map(Number)).toEqual(CODIGOS_CONTRATO);
  });

  it('solo los estados propios de la app quedan sin código', () => {
    const sinCodigo = Object.values(ORDER_STATUS).filter(
      (estado) => STATUS_TO_CODE[estado] === undefined,
    );

    expect(sinCodigo).toEqual(ESTADOS_SIN_CODIGO);
  });

  it.each(ESTADOS_SIN_CODIGO)('no se puede enviar %s como estado_destino', (estado) => {
    expect(() => mapOrderStatusUpdateRequest({ targetStatus: estado })).toThrow(
      `Estado no soportado por MS2: ${estado}`,
    );
  });
});