/**
 * Construit l'API en fichiers autonomes dist/main.js et dist/migrate-cli.js (Node 22, CommonJS).
 * Tout le JavaScript est inclus (NestJS, Drizzle, pg, @gbe/domain…) : l'image de production
 * n'a besoin que des modules natifs listés dans NATIVE_MODULES, installés à part.
 */
import { join } from 'node:path';

import { build } from 'esbuild';

const root = join(__dirname, '..');

/** Modules compilés pour une plateforme précise : ils ne peuvent pas être inclus dans le bundle. */
const NATIVE_MODULES = ['@node-rs/argon2'];

/** Modules facultatifs que NestJS et pg ne chargent que s'ils sont utilisés (ce n'est pas le cas). */
const OPTIONAL_MODULES = [
  '@nestjs/microservices',
  '@nestjs/websockets',
  '@nestjs/websockets/socket-module',
  '@nestjs/microservices/microservices-module',
  'class-transformer',
  'class-validator',
  'pg-native',
];

build({
  entryPoints: [join(root, 'src', 'main.ts'), join(root, 'src', 'db', 'migrate-cli.ts')],
  outdir: join(root, 'dist'),
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  sourcemap: true,
  external: [...NATIVE_MODULES, ...OPTIONAL_MODULES],
  logLevel: 'info',
}).catch(() => process.exit(1));
