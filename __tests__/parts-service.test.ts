import { apiClient } from '@/services/api/client';
import { partsService } from '@/services/parts.service';
import {
  INVALID_INVENTORY_RESPONSE,
  mapSparePartResponse,
  mapSparePartsPage,
  mapSupplierDetailResponse,
  mapSuppliersPage,
} from '@/mappers/parts.mapper';
import type {
  SparePartResponseDto,
  SparePartsPageDto,
  SupplierDetailResponseDto,
  SuppliersPageDto,
} from '@/dto/parts.dto';

jest.mock('@/services/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  },
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

/**
 * PartsService y su mapper frente al contrato del MS3
 * (`/ms3/openapi.json`, versión 0.1.0, consultado el 14-10-2026).
 *
 * Solo se simula el cliente HTTP: los mensajes de error provienen de
 * `normalizeApiError`, igual que en el resto de servicios.
 */

/** Campos obligatorios publicados por el contrato para cada esquema. */
const CONTRACT_REQUIRED = {
  RepuestoSalida: [
    'repuesto_id',
    'nombre',
    'proveedor_id',
    'proveedor_nombre',
    'stock',
    'umbral_particular',
    'umbral_efectivo',
    'bajo_umbral',
  ],
  PaginaRepuestos: ['total', 'desde', 'limite', 'umbral_general', 'repuestos'],
  ProveedorSalida: ['proveedor_id', 'nombre', 'contacto', 'cantidad_repuestos'],
  ProveedorDetalle: [
    'proveedor_id',
    'nombre',
    'contacto',
    'cantidad_repuestos',
    'repuestos',
  ],
  PaginaProveedores: ['total', 'desde', 'limite', 'proveedores'],
};

const PART_DTO: SparePartResponseDto = {
  repuesto_id: 7,
  nombre: 'Filtro de aceite',
  proveedor_id: 3,
  proveedor_nombre: 'Repuestos del Sur',
  stock: 12,
  umbral_particular: null,
  umbral_efectivo: 5,
  bajo_umbral: false,
};

const LOW_PART_DTO: SparePartResponseDto = {
  repuesto_id: 8,
  nombre: 'Bujía',
  proveedor_id: 3,
  proveedor_nombre: 'Repuestos del Sur',
  stock: 1,
  umbral_particular: 4,
  umbral_efectivo: 4,
  bajo_umbral: true,
};

const PARTS_PAGE: SparePartsPageDto = {
  total: 2,
  desde: 0,
  limite: 50,
  umbral_general: 5,
  repuestos: [PART_DTO, LOW_PART_DTO],
};

const SUPPLIER_DETAIL: SupplierDetailResponseDto = {
  proveedor_id: 3,
  nombre: 'Repuestos del Sur',
  contacto: 'ventas@repuestosdelsur.cl',
  cantidad_repuestos: 2,
  repuestos: [PART_DTO, LOW_PART_DTO],
};

const SUPPLIERS_PAGE: SuppliersPageDto = {
  total: 1,
  desde: 0,
  limite: 50,
  proveedores: [
    {
      proveedor_id: 3,
      nombre: 'Repuestos del Sur',
      contacto: 'ventas@repuestosdelsur.cl',
      cantidad_repuestos: 2,
    },
  ],
};

function httpError(status: number, detail?: string) {
  return {
    isAxiosError: true,
    message: `Request failed with status code ${status}`,
    response: { status, data: detail ? { detail } : {} },
  };
}

const NETWORK_ERROR = { isAxiosError: true, message: 'Network Error' };
const TIMEOUT_ERROR = {
  isAxiosError: true,
  code: 'ECONNABORTED',
  message: 'timeout of 15000ms exceeded',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Fixtures alineados con el contrato del MS3', () => {
  it.each([
    ['RepuestoSalida', PART_DTO],
    ['PaginaRepuestos', PARTS_PAGE],
    ['ProveedorSalida', SUPPLIERS_PAGE.proveedores[0]],
    ['ProveedorDetalle', SUPPLIER_DETAIL],
    ['PaginaProveedores', SUPPLIERS_PAGE],
  ] as const)('%s contiene exactamente los campos obligatorios', (name, dto) => {
    expect(Object.keys(dto).sort()).toEqual(
      [...CONTRACT_REQUIRED[name]].sort(),
    );
  });
});

describe('parts.mapper', () => {
  it('convierte un RepuestoSalida al modelo SparePart', () => {
    expect(mapSparePartResponse(LOW_PART_DTO)).toEqual({
      id: '8',
      name: 'Bujía',
      supplierId: '3',
      supplierName: 'Repuestos del Sur',
      stock: 1,
      ownThreshold: 4,
      effectiveThreshold: 4,
      belowThreshold: true,
    });
  });

  it('conserva los umbrales nulos (sin umbral propio ni general)', () => {
    const part = mapSparePartResponse({
      ...PART_DTO,
      umbral_particular: null,
      umbral_efectivo: null,
    });

    expect(part.ownThreshold).toBeNull();
    expect(part.effectiveThreshold).toBeNull();
  });

  it('convierte una PaginaRepuestos conservando el total del servidor', () => {
    const page = mapSparePartsPage({ ...PARTS_PAGE, total: 120 });

    expect(page.total).toBe(120);
    expect(page.items.map((part) => part.id)).toEqual(['7', '8']);
  });

  it('convierte un ProveedorDetalle con sus repuestos', () => {
    expect(mapSupplierDetailResponse(SUPPLIER_DETAIL)).toEqual({
      id: '3',
      name: 'Repuestos del Sur',
      contact: 'ventas@repuestosdelsur.cl',
      partsCount: 2,
      parts: [mapSparePartResponse(PART_DTO), mapSparePartResponse(LOW_PART_DTO)],
    });
  });

  it('convierte una PaginaProveedores', () => {
    expect(mapSuppliersPage(SUPPLIERS_PAGE)).toEqual({
      total: 1,
      items: [
        {
          id: '3',
          name: 'Repuestos del Sur',
          contact: 'ventas@repuestosdelsur.cl',
          partsCount: 2,
        },
      ],
    });
  });

  it.each([
    ['cuerpo null', null],
    ['objeto vacío', {}],
    ['lista que no es arreglo', { total: 0, repuestos: null }],
    ['repuesto sin identificador', { total: 1, repuestos: [{ nombre: 'X' }] }],
    ['repuesto null', { total: 1, repuestos: [null] }],
  ])('rechaza una PaginaRepuestos inválida: %s', (_, body) => {
    expect(() => mapSparePartsPage(body as unknown as SparePartsPageDto)).toThrow(
      INVALID_INVENTORY_RESPONSE,
    );
  });

  it.each([
    ['cuerpo null', null],
    ['objeto vacío', {}],
    ['sin lista de repuestos', { ...SUPPLIER_DETAIL, repuestos: undefined }],
  ])('rechaza un ProveedorDetalle inválido: %s', (_, body) => {
    expect(() =>
      mapSupplierDetailResponse(body as unknown as SupplierDetailResponseDto),
    ).toThrow(INVALID_INVENTORY_RESPONSE);
  });
});

describe('PartsService.getSpareParts', () => {
  it('consulta GET /repuestos y devuelve la página mapeada', async () => {
    mockedApiClient.get.mockResolvedValueOnce({ data: PARTS_PAGE });

    const page = await partsService.getSpareParts();

    expect(mockedApiClient.get).toHaveBeenCalledWith('/repuestos');
    expect(page.total).toBe(2);
    expect(page.items[1].belowThreshold).toBe(true);
  });

  it('devuelve una lista vacía cuando no hay repuestos', async () => {
    mockedApiClient.get.mockResolvedValueOnce({
      data: { ...PARTS_PAGE, total: 0, repuestos: [] },
    });

    await expect(partsService.getSpareParts()).resolves.toEqual({
      items: [],
      total: 0,
    });
  });

  it('rechaza una respuesta 200 que no cumple el contrato', async () => {
    mockedApiClient.get.mockResolvedValueOnce({ data: null });

    await expect(partsService.getSpareParts()).rejects.toThrow(
      INVALID_INVENTORY_RESPONSE,
    );
  });

  it.each([
    ['403 con detalle del backend', httpError(403, 'Rol no permitido'), 'Rol no permitido'],
    ['401 sin detalle', httpError(401), 'Sesión expirada o no autorizada. Por favor, inicia sesión nuevamente.'],
    ['500 sin detalle', httpError(500), 'Error interno en el servidor. Intenta nuevamente más tarde.'],
    ['sin conexión', NETWORK_ERROR, 'Backend no disponible o sin conexión a internet. Revisa tu conexión.'],
    ['tiempo agotado', TIMEOUT_ERROR, 'Tiempo de espera agotado. El servidor tardó demasiado en responder.'],
  ])('propaga el error normalizado: %s', async (_, error, message) => {
    mockedApiClient.get.mockRejectedValueOnce(error);

    await expect(partsService.getSpareParts()).rejects.toThrow(message);
  });
});

describe('PartsService.getSuppliers', () => {
  it('consulta GET /proveedores y devuelve la página mapeada', async () => {
    mockedApiClient.get.mockResolvedValueOnce({ data: SUPPLIERS_PAGE });

    const page = await partsService.getSuppliers();

    expect(mockedApiClient.get).toHaveBeenCalledWith('/proveedores');
    expect(page.items[0].name).toBe('Repuestos del Sur');
  });

  it('devuelve una lista vacía cuando no hay proveedores', async () => {
    mockedApiClient.get.mockResolvedValueOnce({
      data: { ...SUPPLIERS_PAGE, total: 0, proveedores: [] },
    });

    await expect(partsService.getSuppliers()).resolves.toEqual({
      items: [],
      total: 0,
    });
  });

  it('propaga el error del servidor', async () => {
    mockedApiClient.get.mockRejectedValueOnce(httpError(503));

    await expect(partsService.getSuppliers()).rejects.toThrow(
      'Error interno en el servidor. Intenta nuevamente más tarde.',
    );
  });
});

describe('PartsService: paginación con desde/limite (MS3)', () => {
  it('pide la primera página sin parámetros (desde=0, limite=50 por defecto)', async () => {
    mockedApiClient.get.mockResolvedValueOnce({ data: PARTS_PAGE });

    await partsService.getSpareParts({ offset: 0 });

    expect(mockedApiClient.get).toHaveBeenCalledWith('/repuestos');
  });

  it('pide una página posterior de repuestos con desde y limite', async () => {
    mockedApiClient.get.mockResolvedValueOnce({
      data: { ...PARTS_PAGE, total: 52, desde: 50, repuestos: [LOW_PART_DTO] },
    });

    const page = await partsService.getSpareParts({ offset: 50 });

    expect(mockedApiClient.get).toHaveBeenCalledTimes(1);
    expect(mockedApiClient.get).toHaveBeenCalledWith('/repuestos', {
      params: { desde: 50, limite: 50 },
    });
    expect(page).toEqual({ items: [expect.objectContaining({ id: '8' })], total: 52 });
  });

  it('pide una página posterior de proveedores con desde y limite', async () => {
    mockedApiClient.get.mockResolvedValueOnce({ data: { ...SUPPLIERS_PAGE, desde: 50 } });

    await partsService.getSuppliers({ offset: 50, limit: 200 });

    expect(mockedApiClient.get).toHaveBeenCalledWith('/proveedores', {
      params: { desde: 50, limite: 200 },
    });
  });

  it.each([
    [{ offset: -1 }],
    [{ offset: 1.5 }],
    [{ offset: 50, limit: 0 }],
    [{ offset: 50, limit: 201 }],
  ])('rechaza parámetros fuera del contrato sin llamar al MS3 (%o)', async (page) => {
    await expect(partsService.getSpareParts(page)).rejects.toThrow(
      'Parámetros de paginación inválidos.',
    );
    await expect(partsService.getSuppliers(page)).rejects.toThrow(
      'Parámetros de paginación inválidos.',
    );
    expect(mockedApiClient.get).not.toHaveBeenCalled();
  });

  it('propaga el error de una página posterior', async () => {
    mockedApiClient.get.mockRejectedValueOnce(httpError(503));

    await expect(partsService.getSpareParts({ offset: 50 })).rejects.toThrow(
      'Error interno en el servidor. Intenta nuevamente más tarde.',
    );
  });
});

describe('PartsService.getSupplierById', () => {
  it('consulta GET /proveedores/{id} y devuelve el detalle', async () => {
    mockedApiClient.get.mockResolvedValueOnce({ data: SUPPLIER_DETAIL });

    const supplier = await partsService.getSupplierById('3');

    expect(mockedApiClient.get).toHaveBeenCalledWith('/proveedores/3');
    expect(supplier.parts).toHaveLength(2);
  });

  it('codifica el identificador recibido en la ruta', async () => {
    mockedApiClient.get.mockResolvedValueOnce({ data: SUPPLIER_DETAIL });

    await partsService.getSupplierById('3/../repuestos');

    expect(mockedApiClient.get).toHaveBeenCalledWith(
      '/proveedores/3%2F..%2Frepuestos',
    );
  });

  it('propaga el 404 de un proveedor inexistente', async () => {
    mockedApiClient.get.mockRejectedValueOnce(
      httpError(404, 'Proveedor inexistente'),
    );

    await expect(partsService.getSupplierById('999')).rejects.toThrow(
      'Proveedor inexistente',
    );
  });
});
