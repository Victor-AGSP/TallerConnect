import type {
  BudgetDetailResponseDto,
  BudgetItemResponseDto,
  BudgetPageResponseDto,
} from '@/dto/budget.dto';
import type { PartResponseDto } from '@/dto/part.dto';
import { orderResponsePayloads } from './order.payload';
import { partResponsePayloads } from './part.payload';

type BudgetCase =
  | 'borrador'
  | 'enviado'
  | 'aprobadoConModificacion'
  | 'esperandoRepuestos'
  | 'rechazado';

/**
 * Datos del repuesto que un ítem de tipo `repuesto` toma de `partResponsePayloads`.
 */
function repuestoDe(
  part: PartResponseDto,
): Pick<BudgetItemResponseDto, 'repuesto_id' | 'repuesto_nombre' | 'proveedor_nombre'> {
  return {
    repuesto_id: part.repuesto_id,
    repuesto_nombre: part.nombre,
    proveedor_nombre: part.proveedor_nombre,
  };
}

/**
 * Presupuestos con la forma exacta de `PresupuestoDetalle` (GET /api/presupuestos/{presupuesto_id}).
 * Cada uno pertenece a una orden de `orderResponsePayloads` y su situación calza con el estado de esa orden.
 * Usan los ids de los usuarios de prueba de la API: cliente `1` y mecánico `2`.
 */
export const budgetDetailPayloads: Record<BudgetCase, BudgetDetailResponseDto> = {
  borrador: {
    presupuesto_id: 1,
    orden_id: orderResponsePayloads.esperando_diagnostico.orden_id,
    creado_en: '2026-03-03T15:00:00Z',
    cantidad_versiones: 1,
    ultima_version: 1,
    estado_ultima_version: 'borrador',
    total_ultima_version: '29000.00',
    version_vigente: null,
    versiones: [
      {
        numero: 1,
        estado: 'borrador',
        es_modificacion: false,
        creado_por_id: 2,
        creado_en: '2026-03-03T15:00:00Z',
        enviado_en: null,
        bloqueada_en: null,
        total: '29000.00',
        items: [
          {
            item_id: 1,
            tipo: 'mano_de_obra',
            descripcion: 'Diagnóstico del sistema de encendido',
            cantidad: '1',
            precio_unitario: '15000.00',
            subtotal: '15000.00',
            repuesto_id: null,
          },
          {
            item_id: 2,
            tipo: 'repuesto',
            descripcion: 'Bujías',
            cantidad: '4',
            precio_unitario: '3500.00',
            subtotal: '14000.00',
            ...repuestoDe(partResponsePayloads.bajoUmbral),
          },
        ],
        decision: null,
      },
    ],
  },
  enviado: {
    presupuesto_id: 2,
    orden_id: orderResponsePayloads.esperando_aprobacion_presupuesto.orden_id,
    creado_en: '2026-03-04T08:30:00Z',
    cantidad_versiones: 1,
    ultima_version: 1,
    estado_ultima_version: 'enviada',
    total_ultima_version: '20500.00',
    version_vigente: null,
    versiones: [
      {
        numero: 1,
        estado: 'enviada',
        es_modificacion: false,
        creado_por_id: 2,
        creado_en: '2026-03-04T08:30:00Z',
        enviado_en: '2026-03-04T09:00:00Z',
        bloqueada_en: '2026-03-04T09:00:00Z',
        total: '20500.00',
        items: [
          {
            item_id: 3,
            tipo: 'repuesto',
            descripcion: 'Filtro de aceite',
            cantidad: '1',
            precio_unitario: '8500.00',
            subtotal: '8500.00',
            ...repuestoDe(partResponsePayloads.conStock),
          },
          {
            item_id: 4,
            tipo: 'mano_de_obra',
            descripcion: 'Cambio de aceite y filtro',
            cantidad: '1',
            precio_unitario: '12000.00',
            subtotal: '12000.00',
            repuesto_id: null,
            repuesto_nombre: null,
            proveedor_nombre: null,
          },
        ],
        decision: null,
      },
    ],
  },
  aprobadoConModificacion: {
    presupuesto_id: 3,
    orden_id: orderResponsePayloads.en_reparacion.orden_id,
    creado_en: '2026-03-01T10:00:00Z',
    cantidad_versiones: 2,
    ultima_version: 2,
    estado_ultima_version: 'enviada',
    total_ultima_version: '104000.00',
    version_vigente: 1,
    versiones: [
      {
        numero: 1,
        estado: 'aprobada',
        es_modificacion: false,
        creado_por_id: 2,
        creado_en: '2026-03-01T10:00:00Z',
        enviado_en: '2026-03-01T11:00:00Z',
        bloqueada_en: '2026-03-01T11:00:00Z',
        total: '90000.00',
        items: [
          {
            item_id: 5,
            tipo: 'repuesto',
            descripcion: 'Correa de distribución',
            cantidad: '1',
            precio_unitario: '45000.00',
            subtotal: '45000.00',
            ...repuestoDe(partResponsePayloads.conUmbralParticular),
          },
          {
            item_id: 6,
            tipo: 'mano_de_obra',
            descripcion: 'Cambio de correa de distribución',
            cantidad: '2.5',
            precio_unitario: '18000.00',
            subtotal: '45000.00',
            repuesto_id: null,
          },
        ],
        decision: {
          decision_id: 1,
          decision: 'aprobado',
          cliente_usuario_id: 1,
          fecha_hora: '2026-03-01T15:00:00Z',
          motivo: null,
        },
      },
      {
        numero: 2,
        estado: 'enviada',
        es_modificacion: true,
        creado_por_id: 2,
        creado_en: '2026-03-05T10:00:00Z',
        enviado_en: '2026-03-05T11:00:00Z',
        bloqueada_en: '2026-03-05T11:00:00Z',
        total: '104000.00',
        items: [
          {
            item_id: 7,
            tipo: 'repuesto',
            descripcion: 'Correa de distribución',
            cantidad: '1',
            precio_unitario: '45000.00',
            subtotal: '45000.00',
            ...repuestoDe(partResponsePayloads.conUmbralParticular),
          },
          {
            item_id: 8,
            tipo: 'mano_de_obra',
            descripcion: 'Cambio de correa de distribución',
            cantidad: '2.5',
            precio_unitario: '18000.00',
            subtotal: '45000.00',
            repuesto_id: null,
          },
          {
            item_id: 9,
            tipo: 'repuesto',
            descripcion: 'Bujías',
            cantidad: '4',
            precio_unitario: '3500.00',
            subtotal: '14000.00',
            ...repuestoDe(partResponsePayloads.bajoUmbral),
          },
        ],
        decision: null,
      },
    ],
  },
  esperandoRepuestos: {
    presupuesto_id: 4,
    orden_id: orderResponsePayloads.esperando_repuestos.orden_id,
    creado_en: '2026-02-21T09:00:00Z',
    cantidad_versiones: 1,
    ultima_version: 1,
    estado_ultima_version: 'aprobada',
    total_ultima_version: '47000.00',
    version_vigente: 1,
    versiones: [
      {
        numero: 1,
        estado: 'aprobada',
        es_modificacion: false,
        creado_por_id: 2,
        creado_en: '2026-02-21T09:00:00Z',
        enviado_en: '2026-02-21T10:00:00Z',
        bloqueada_en: '2026-02-21T10:00:00Z',
        total: '47000.00',
        items: [
          {
            item_id: 10,
            tipo: 'repuesto',
            descripcion: 'Pastillas de freno delanteras',
            cantidad: '1',
            precio_unitario: '32000.00',
            subtotal: '32000.00',
            ...repuestoDe(partResponsePayloads.sinStock),
          },
          {
            item_id: 11,
            tipo: 'mano_de_obra',
            descripcion: 'Cambio de pastillas de freno',
            cantidad: '1',
            precio_unitario: '15000.00',
            subtotal: '15000.00',
            repuesto_id: null,
          },
        ],
        decision: {
          decision_id: 2,
          decision: 'aprobado',
          cliente_usuario_id: 1,
          fecha_hora: '2026-02-21T12:00:00Z',
          motivo: null,
        },
      },
    ],
  },
  rechazado: {
    presupuesto_id: 5,
    orden_id: orderResponsePayloads.cancelado.orden_id,
    creado_en: '2026-01-22T10:30:00Z',
    cantidad_versiones: 1,
    ultima_version: 1,
    estado_ultima_version: 'rechazada',
    total_ultima_version: '350000.00',
    version_vigente: null,
    versiones: [
      {
        numero: 1,
        estado: 'rechazada',
        es_modificacion: false,
        creado_por_id: 2,
        creado_en: '2026-01-22T10:30:00Z',
        enviado_en: '2026-01-22T11:00:00Z',
        bloqueada_en: '2026-01-22T11:00:00Z',
        total: '350000.00',
        items: [
          {
            item_id: 12,
            tipo: 'mano_de_obra',
            descripcion: 'Reparación de caja de cambios',
            cantidad: '1',
            precio_unitario: '350000.00',
            subtotal: '350000.00',
            repuesto_id: null,
          },
        ],
        decision: {
          decision_id: 3,
          decision: 'rechazado',
          cliente_usuario_id: 1,
          fecha_hora: '2026-01-22T13:40:00Z',
          motivo: 'El costo supera el presupuesto disponible del cliente.',
        },
      },
    ],
  },
};

/**
 * Página de presupuestos con la forma de `PaginaPresupuestos` (GET /api/presupuestos).
 */
export const budgetPagePayload: BudgetPageResponseDto = {
  total: 5,
  desde: 0,
  limite: 50,
  presupuestos: Object.values(budgetDetailPayloads).map(({ versiones: _versiones, ...resumen }) => resumen),
};