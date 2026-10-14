/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  transform: { '^.+\\.ts$': 'babel-jest' },
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.test.ts', '!src/index.ts'],
  // Le cahier exige au moins 90 % de couverture sur les règles du jeu.
  coverageThreshold: { global: { lines: 90, branches: 90, functions: 90, statements: 90 } },
};
