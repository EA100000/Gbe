/** @type {import('jest').Config} */
module.exports = {
  // En CI, chaque test en échec devient une annotation lisible sur GitHub (sans ouvrir les journaux).
  reporters: process.env.GITHUB_ACTIONS === 'true' ? ['default', 'github-actions'] : ['default'],
  preset: 'jest-expo',
  roots: ['<rootDir>/src'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  // Les paquets du dépôt sont en TypeScript source : Jest doit les transformer aussi.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|react-native-svg|@gbe/.*))',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/app/**',
    '!src/content/bundled-packs.generated.ts',
  ],
};
