import {
  getRouteByRole,
  ROLE_ROUTES,
} from '@/constants/routes';

describe('Navegación según rol', () => {
  it('debe enviar al cliente a /cliente', () => {
    expect(
      getRouteByRole('cliente')
    ).toBe('/cliente');
  });

  it('debe enviar al mecánico a /mecanico', () => {
    expect(
      getRouteByRole('mecanico')
    ).toBe('/mecanico');
  });

  it('debe enviar al administrador a /administrador', () => {
    expect(
      getRouteByRole('administrador')
    ).toBe('/administrador');
  });

  it('debe contener las tres rutas principales', () => {
    expect(ROLE_ROUTES).toEqual({
      cliente: '/cliente',
      mecanico: '/mecanico',
      administrador: '/administrador',
    });
  });
});