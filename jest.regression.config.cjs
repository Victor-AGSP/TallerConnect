// Include new authentication suites automatically instead of maintaining a file list.
module.exports = {
  ...require('./package.json').jest,
  testMatch: [
    '**/__tests__/auth-*.test.ts?(x)',
    '**/__tests__/protected-routes.test.tsx',
    '**/__tests__/common-components.test.tsx',
    '**/__tests__/test-utils.test.tsx',
  ],
};
