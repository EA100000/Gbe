/**
 * Tests de l'API : SWC compile les décorateurs NestJS (y compris ceux des paramètres).
 *
 * Les tests *.e2e.test.ts demandent une vraie base PostgreSQL (TEST_DATABASE_URL).
 * Sans elle, sur un poste de développement, ils sont sautés avec un avertissement ;
 * en CI (CI=true), son absence est une erreur : on ne doit jamais croire la CI verte à tort.
 */
const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
if (!hasDatabase && process.env.CI === 'true') {
  throw new Error('TEST_DATABASE_URL est obligatoire en CI pour les tests de l’API.');
}
if (!hasDatabase) {
  console.warn(
    '\n⚠ Tests de l’API sur base de données sautés : TEST_DATABASE_URL absent (voir README).\n',
  );
}

/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  transform: {
    '^.+\\.ts$': [
      '@swc/jest',
      {
        jsc: {
          parser: { syntax: 'typescript', decorators: true },
          transform: { legacyDecorator: true, decoratorMetadata: true },
          target: 'es2022',
        },
        module: { type: 'commonjs' },
      },
    ],
  },
  testPathIgnorePatterns: hasDatabase
    ? ['/node_modules/']
    : ['/node_modules/', '\\.e2e\\.test\\.ts$'],
  collectCoverageFrom: ['src/**/*.ts', '!src/main.ts', '!src/db/migrate-cli.ts'],
  // Seuils vérifiés seulement quand toute la suite tourne (avec la base).
  coverageThreshold: hasDatabase
    ? { global: { lines: 85, branches: 75, functions: 85, statements: 85 } }
    : undefined,
};
