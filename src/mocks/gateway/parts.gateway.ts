import type { PartPageResponseDto } from '@/dto/part.dto';

/**
 * Respuesta real de GET /api/repuestos obtenida con la cuenta de prueba del rol administrador.
 * Anonimización: los identificadores se reemplazaron por valores ficticios que mantienen las
 * relaciones entre registros (repuestos 6xx, proveedores 9xx). Nombres, stock y umbrales se
 * mantienen tal como los entregó la API.
 */
export const partsPageGatewayResponse: PartPageResponseDto = {
  total: 1,
  desde: 0,
  limite: 50,
  umbral_general: 3,
  repuestos: [
    {
      repuesto_id: 601,
      nombre: 'Filtro de aceite Toyota',
      proveedor_id: 901,
      proveedor_nombre: 'Repuestos Central UCT',
      proveedor_tipo_distribuidor: 'oficial',
      stock: 2,
      umbral_particular: null,
      umbral_efectivo: 3,
      bajo_umbral: true,
    },
  ],
};