import { fireEvent, renderWithProviders, screen } from '../test-utils';
import MecanicoScreen from '@/app/(mecanico)/mecanico';
import { InventoryScreen } from '@/components/inventory/InventoryScreen';
import { partsService } from '@/services/parts.service';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useRouter: () => ({ push: mockPush }),
}));
jest.mock('@/config/env', () => ({
  ...jest.requireActual('@/config/env'),
  ENV: { ...jest.requireActual('@/config/env').ENV, USE_DEMO_DATA: false },
}));

describe('Consultas del mecánico sin demostración', () => {
  afterEach(() => jest.restoreAllMocks());

  it('abre vehículos, órdenes e inventario sin inventar actividad del mecánico', async () => {
    mockPush.mockClear();
    await renderWithProviders(<MecanicoScreen />);
    expect(screen.queryByText('OT-00124')).toBeNull();
    expect(screen.queryByText(/demostración/)).toBeNull();
    for (const [label, path] of [
      ['Ver vehículos asignados', '/(mecanico)/vehiculos-asignados'],
      ['Ver órdenes asignadas', '/(mecanico)/ordenes'],
      ['Inventario', '/(mecanico)/inventario'],
    ]) {
      await fireEvent.press(screen.getByRole('button', { name: label }));
      expect(mockPush).toHaveBeenLastCalledWith(path);
    }
  });

  it('consulta repuestos y proveedores y conserva las respuestas vacías', async () => {
    const parts = jest.spyOn(partsService, 'getSpareParts').mockResolvedValue({ items: [], total: 0 });
    const suppliers = jest.spyOn(partsService, 'getSuppliers').mockResolvedValue({ items: [], total: 0 });
    await renderWithProviders(<InventoryScreen />);
    await screen.findByTestId('spare-part-list-empty');
    expect(parts).toHaveBeenCalledTimes(1);
    expect(suppliers).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Proveedores' }));
    await screen.findByTestId('supplier-list-empty');
    expect(suppliers).toHaveBeenCalledTimes(1);
  });


  it('abre el detalle del proveedor seleccionado consultando su identificador', async () => {
    const supplier = { id: 'test-supplier', name: 'Proveedor de prueba', contact: 'Contacto de prueba', partsCount: 0 };
    jest.spyOn(partsService, 'getSpareParts').mockResolvedValue({ items: [], total: 0 });
    jest.spyOn(partsService, 'getSuppliers').mockResolvedValue({ items: [supplier], total: 1 });
    const detail = jest.spyOn(partsService, 'getSupplierById').mockResolvedValue({ ...supplier, parts: [] });
    await renderWithProviders(<InventoryScreen />);
    await screen.findByTestId('spare-part-list-empty');
    await fireEvent.press(screen.getByRole('button', { name: 'Proveedores' }));
    await fireEvent.press(await screen.findByTestId('supplier-card-test-supplier'));
    await screen.findByTestId('supplier-detail-test-supplier');
    expect(detail).toHaveBeenCalledWith('test-supplier');
  });

  it('muestra el error HTTP de inventario sin sustituirlo por existencias demo', async () => {
    jest.spyOn(partsService, 'getSpareParts').mockRejectedValue(new Error('Acceso denegado'));
    await renderWithProviders(<InventoryScreen />);
    await screen.findByTestId('spare-part-list-error');
    expect(screen.queryByTestId('spare-part-list-empty')).toBeNull();
    expect(screen.queryByText(/demostración/)).toBeNull();
  });
});
