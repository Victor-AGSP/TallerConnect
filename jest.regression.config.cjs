// Include new authentication suites automatically instead of maintaining a file list.
module.exports = {
  ...require('./package.json').jest,
  testMatch: [
    '**/__tests__/auth-*.test.ts?(x)',
    '**/__tests__/protected-routes.test.tsx',
    '**/__tests__/common-components.test.tsx',
    '**/__tests__/test-utils.test.tsx',
    // Módulo de órdenes: flujo orden → presupuesto → repuestos y sus vistas.
    '**/__tests__/order-*.test.ts?(x)',
    '**/__tests__/views-services-integration.test.tsx',
    '**/__tests__/manual-refresh-retry.test.tsx',
    '**/__tests__/use-data-query.test.ts',
    '**/__tests__/services-response-scenarios.test.ts',
    // Integración con MS3: presupuestos, repuestos y proveedores.
    '**/__tests__/budget-*.test.ts?(x)',
    '**/__tests__/parts-*.test.ts?(x)',
  ],
};
