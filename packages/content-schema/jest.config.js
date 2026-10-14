/** @type {import('jest').Config} */
module.exports = {
  // En CI, chaque test en échec devient une annotation lisible sur GitHub (sans ouvrir les journaux).
  reporters: process.env.GITHUB_ACTIONS === 'true' ? ['default', 'github-actions'] : ['default'],
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  transform: { '^.+\\.ts$': 'babel-jest' },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/index.ts',
    '!src/__fixtures__/**',
  ],
  coverageThreshold: { global: { lines: 90, branches: 85, functions: 90, statements: 90 } },
};
