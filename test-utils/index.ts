import { getCurrentTestPathname } from './test-utils';

export {
  act,
  cleanup,
  fireEvent,
  renderHook,
  waitFor,
  waitForElementToBeRemoved,
  within,
} from 'expo-router/testing-library';
export { screen } from 'expo-router/testing-library';
export * from './test-utils';
export * from './zustand';


/**
 * Matcher de rutas compatible con RNTL 14.
 * Evita depender de screen.getPathname(), que no siempre
 * queda registrado por Expo Router.
 *
 * Solo se utiliza durante las pruebas Jest.
 */
declare global {
  namespace jest {
    interface Matchers<R, T = {}> {
      toHavePathname(expected: string): R;
    }
  }
}

expect.extend({
  toHavePathname(_received: unknown, expected: string) {
    const actual = getCurrentTestPathname();

    if (typeof actual !== 'string') {
      return {
        pass: false,
        message: () =>
          'No se pudo consultar la ruta actual de Expo Router.',
      };
    }

    return {
      pass: actual === expected,
      message: () =>
        `Ruta esperada: ${expected}\nRuta actual: ${actual}`,
    };
  },
});
