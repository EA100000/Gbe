// Configuration ESLint unique du dépôt : paquets partagés, scripts et appli mobile.
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const projectRules = {
  '@typescript-eslint/no-explicit-any': 'error',
  '@typescript-eslint/ban-ts-comment': ['error', { 'ts-ignore': 'allow-with-description' }],
  '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
  '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  // console.log interdit en production ; warn et error restent permis pour les vrais incidents.
  'no-console': ['error', { allow: ['warn', 'error'] }],
};

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/coverage/**',
      '**/dist/**',
      '**/.expo/**',
      'apps/mobile/android/**',
      'apps/mobile/ios/**',
      '**/*.config.js',
      'test-results/**',
      'playwright-report/**',
      'apps/mobile/jest.setup.ts',
    ],
  },
  {
    files: ['packages/**/*.{ts,tsx}', 'scripts/**/*.ts', 'apps/**/*.{ts,tsx}', 'e2e/**/*.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { globals: { ...globals.node } },
    rules: projectRules,
  },
  {
    // Code React (appli et design system) : règles des hooks et du React Compiler.
    files: ['apps/mobile/**/*.{ts,tsx}', 'packages/ui/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    languageOptions: { globals: { ...globals.browser, __DEV__: 'readonly' } },
    rules: { ...reactHooks.configs['recommended-latest'].rules },
  },
  {
    // Les scripts en ligne de commande ont le droit d'écrire sur la console.
    files: ['scripts/**/*.ts'],
    rules: { 'no-console': 'off' },
  },
  {
    files: ['**/*.test.{ts,tsx}', '**/test-utils/**', '**/__fixtures__/**'],
    languageOptions: { globals: { ...globals.jest } },
  },
  prettier,
);
