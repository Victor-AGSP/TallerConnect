import type {
  BudgetDetailResponseDto,
  BudgetPageResponseDto,
  BudgetVersionResponseDto,
} from '@/dto/budget.dto';

/**
 * Forma real de `VersionDetalle`: la API agrega `vigente`, que `BudgetVersionResponseDto`
 * no declara. Indica si la versión es la `version_vigente` del presupuesto.
 */
export type BudgetVersionGatewayResponse = BudgetVersionResponseDto & { vigente: boolean };

export type BudgetDetailGatewayResponse = Omit<BudgetDetailResponseDto, 'versiones'> & {
  versiones: BudgetVersionGatewayResponse[];
};

/**
 * Respuestas reales de GET /api/presupuestos y GET /api/presupuestos/{presupuesto_id}
 * obtenidas con la cuenta de prueba del rol administrador.
 * Anonimización: los identificadores se reemplazaron por valores ficticios que mantienen las
 * relaciones entre registros (órdenes 2xx, presupuestos 4xx, usuarios 5xx con 501 cliente y
 * 502 mecánico, repuestos 6xx, ítems 7xx, decisiones 8xx). Las fechas se reemplazaron por
 * valores ficticios que conservan su formato y su orden. Importes, cantidades, estados,
 * descripciones y motivos se mantienen tal como los entregó la API.
 */
export const budgetsPageGatewayResponse: BudgetPageResponseDto = {
  total: 4,
  desde: 0,
  limite: 50,
  presupuestos: [
    {
      presupuesto_id: 404,
      orden_id: 206,
      creado_en: '2026-03-10T05:41:45.874290Z',
      cantidad_versiones: 1,
      ultima_version: 1,
      estado_ultima_version: 'aprobada',
      total_ultima_version: '23990.00',
      version_vigente: 1,
    },
    {
      presupuesto_id: 403,
      orden_id: 203,
      creado_en: '2026-03-10T05:07:24.686397Z',
      cantidad_versiones: 1,
      ultima_version: 1,
      estado_ultima_version: 'rechazada',
      total_ultima_version: '35960.00',
      version_vigente: null,
    },
    {
      presupuesto_id: 402,
      orden_id: 202,
      creado_en: '2026-03-10T05:05:18.498825Z',
      cantidad_versiones: 1,
      ultima_version: 1,
      estado_ultima_version: 'aprobada',
      total_ultima_version: '29980.00',
      version_vigente: 1,
    },
    {
      presupuesto_id: 401,
      orden_id: 201,
      creado_en: '2026-03-10T04:55:12.688139Z',
      cantidad_versiones: 1,
      ultima_version: 1,
      estado_ultima_version: 'aprobada',
      total_ultima_version: '52000.00',
      version_vigente: 1,
    },
  ],
};

export const budgetDetailsGatewayResponse: BudgetDetailGatewayResponse[] = [
  {
    presupuesto_id: 401,
    orden_id: 201,
    creado_en: '2026-03-10T04:55:12.688139Z',
    cantidad_versiones: 1,
    ultima_version: 1,
    estado_ultima_version: 'aprobada',
    total_ultima_version: '52000.00',
    version_vigente: 1,
    versiones: [
      {
        numero: 1,
        estado: 'aprobada',
        es_modificacion: false,
        creado_por_id: 502,
        creado_en: '2026-03-10T04:55:12.688139Z',
        enviado_en: '2026-03-10T04:55:22.393791Z',
        bloqueada_en: '2026-03-10T04:55:32.747943Z',
        vigente: true,
        total: '52000.00',
        items: [
          {
            item_id: 701,
            tipo: 'mano_de_obra',
            descripcion: 'Cambio de aceite y filtro',
            cantidad: '1.00',
            precio_unitario: '25000.00',
            subtotal: '25000.00',
            repuesto_id: null,
            repuesto_nombre: null,
            proveedor_nombre: null,
          },
          {
            item_id: 702,
            tipo: 'mano_de_obra',
            descripcion: 'Revision de frenos',
            cantidad: '1.50',
            precio_unitario: '18000.00',
            subtotal: '27000.00',
            repuesto_id: null,
            repuesto_nombre: null,
            proveedor_nombre: null,
          },
        ],
        decision: {
          decision_id: 801,
          decision: 'aprobado',
          cliente_usuario_id: 501,
          fecha_hora: '2026-03-10T04:55:32.747943Z',
          motivo: null,
        },
      },
    ],
  },
  {
    presupuesto_id: 402,
    orden_id: 202,
    creado_en: '2026-03-10T05:05:18.498825Z',
    cantidad_versiones: 1,
    ultima_version: 1,
    estado_ultima_version: 'aprobada',
    total_ultima_version: '29980.00',
    version_vigente: 1,
    versiones: [
      {
        numero: 1,
        estado: 'aprobada',
        es_modificacion: false,
        creado_por_id: 502,
        creado_en: '2026-03-10T05:05:18.498825Z',
        enviado_en: '2026-03-10T05:05:30.942267Z',
        bloqueada_en: '2026-03-10T05:05:31.425951Z',
        vigente: true,
        total: '29980.00',
        items: [
          {
            item_id: 703,
            tipo: 'repuesto',
            descripcion: 'Filtro de aceite Toyota',
            cantidad: '2.00',
            precio_unitario: '8990.00',
            subtotal: '17980.00',
            repuesto_id: 601,
            repuesto_nombre: 'Filtro de aceite Toyota',
            proveedor_nombre: 'Repuestos Central UCT',
          },
          {
            item_id: 704,
            tipo: 'mano_de_obra',
            descripcion: 'Cambio de filtro',
            cantidad: '1.00',
            precio_unitario: '12000.00',
            subtotal: '12000.00',
            repuesto_id: null,
            repuesto_nombre: null,
            proveedor_nombre: null,
          },
        ],
        decision: {
          decision_id: 802,
          decision: 'aprobado',
          cliente_usuario_id: 501,
          fecha_hora: '2026-03-10T05:05:31.425951Z',
          motivo: null,
        },
      },
    ],
  },
  {
    presupuesto_id: 403,
    orden_id: 203,
    creado_en: '2026-03-10T05:07:24.686397Z',
    cantidad_versiones: 1,
    ultima_version: 1,
    estado_ultima_version: 'rechazada',
    total_ultima_version: '35960.00',
    version_vigente: null,
    versiones: [
      {
        numero: 1,
        estado: 'rechazada',
        es_modificacion: false,
        creado_por_id: 502,
        creado_en: '2026-03-10T05:07:24.686397Z',
        enviado_en: '2026-03-10T05:07:24.897654Z',
        bloqueada_en: null,
        vigente: false,
        total: '35960.00',
        items: [
          {
            item_id: 705,
            tipo: 'repuesto',
            descripcion: 'Filtro de aceite Toyota',
            cantidad: '4.00',
            precio_unitario: '8990.00',
            subtotal: '35960.00',
            repuesto_id: 601,
            repuesto_nombre: 'Filtro de aceite Toyota',
            proveedor_nombre: 'Repuestos Central UCT',
          },
        ],
        decision: {
          decision_id: 803,
          decision: 'rechazado',
          cliente_usuario_id: 501,
          fecha_hora: '2026-03-10T05:07:25.385269Z',
          motivo: 'Precio demasiado alto',
        },
      },
    ],
  },
  {
    presupuesto_id: 404,
    orden_id: 206,
    creado_en: '2026-03-10T05:41:45.874290Z',
    cantidad_versiones: 1,
    ultima_version: 1,
    estado_ultima_version: 'aprobada',
    total_ultima_version: '23990.00',
    version_vigente: 1,
    versiones: [
      {
        numero: 1,
        estado: 'aprobada',
        es_modificacion: false,
        creado_por_id: 502,
        creado_en: '2026-03-10T05:41:45.874290Z',
        enviado_en: '2026-03-10T05:42:57.929630Z',
        bloqueada_en: '2026-03-10T05:43:08.637592Z',
        vigente: true,
        total: '23990.00',
        items: [
          {
            item_id: 706,
            tipo: 'repuesto',
            descripcion: 'Filtro de aceite Toyota',
            cantidad: '1.00',
            precio_unitario: '8990.00',
            subtotal: '8990.00',
            repuesto_id: 601,
            repuesto_nombre: 'Filtro de aceite Toyota',
            proveedor_nombre: 'Repuestos Central UCT',
          },
          {
            item_id: 707,
            tipo: 'mano_de_obra',
            descripcion: 'Cambio de aceite',
            cantidad: '1.00',
            precio_unitario: '15000.00',
            subtotal: '15000.00',
            repuesto_id: null,
            repuesto_nombre: null,
            proveedor_nombre: null,
          },
        ],
        decision: {
          decision_id: 804,
          decision: 'aprobado',
          cliente_usuario_id: 501,
          fecha_hora: '2026-03-10T05:43:08.637592Z',
          motivo: null,
        },
      },
    ],
  },
];