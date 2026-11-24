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
    // SCRUM-162: errores y respuestas inválidas no se muestran como listas vacías.
    '**/__tests__/list-error-empty-regression.test.tsx',
    // SCRUM-224: estado visual del portal Cliente ante HTTP 500.
    '**/__tests__/http-500-client-states.test.tsx',
    // SCRUM-163: cifras hardcodeadas en entorno real.
    '**/__tests__/hardcoded-figures-detection.test.tsx',
    // SCRUM-225: cifras del portal Cliente derivadas de su fuente.
    '**/__tests__/cliente-portal-figures.test.tsx',
    // SCRUM-228: navegación del rol Cliente.
    '**/__tests__/cliente-navigation-flow.test.tsx',
    // SCRUM-166: modo demostración identificado y MS4 sin camino simulado.
    '**/__tests__/demo-mode-banner.test.tsx',
    // Integración con MS3: presupuestos, repuestos y proveedores.
    '**/__tests__/budget-*.test.ts?(x)',
    '**/__tests__/parts-*.test.ts?(x)',
    // Evidencias fotográficas (MS4).
    '**/__tests__/evidence-*.test.ts?(x)',
  ],
};
