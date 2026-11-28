import type { ProviderDetailResponseDto, ProviderPageResponseDto } from '@/dto/provider.dto';

/**
 * Respuestas reales de GET /api/proveedores y GET /api/proveedores/{proveedor_id} obtenidas
 * con la cuenta de prueba del rol administrador.
 * Anonimización: los identificadores se reemplazaron por valores ficticios con la misma
 * correspondencia que `parts.gateway.ts` (repuestos 6xx, proveedores 9xx) y el contacto por un
 * correo ficticio. Nombres, tipo de distribuidor, stock y umbrales se mantienen tal como los
 * entregó la API.
 */
export const providersPageGatewayResponse: ProviderPageResponseDto = {
  total: 1,
  desde: 0,
  limite: 50,
  proveedores: [
    {
      proveedor_id: 901,
      nombre: 'Repuestos Central UCT',
      contacto: 'ventas@proveedor.example',
      tipo_distribuidor: 'oficial',
      cantidad_repuestos: 1,
    },
  ],
};

export const providerDetailGatewayResponse: ProviderDetailResponseDto = {
  proveedor_id: 901,
  nombre: 'Repuestos Central UCT',
  contacto: 'ventas@proveedor.example',
  tipo_distribuidor: 'oficial',
  cantidad_repuestos: 1,
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