// Outils partagés par les scripts de contenu (exécutés avec tsx, jamais dans l'appli).
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const PACKS_DIR = join(ROOT, 'content', 'packs');
export const MOBILE_BUNDLE_FILE = join(
  ROOT,
  'apps',
  'mobile',
  'src',
  'content',
  'bundled-packs.generated.ts',
);

/** Présent dans dist-packs/ quand il contient une version de test : packs:upload refuse alors d'envoyer. */
export const TEST_MARKER_FILE = '.version-de-test';

/** Dossiers de packs : un sous-dossier de content/packs contenant un pack.json. */
export function listPackDirs(): string[] {
  if (!existsSync(PACKS_DIR)) return [];
  return readdirSync(PACKS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(PACKS_DIR, entry.name, 'pack.json')))
    .map((entry) => join(PACKS_DIR, entry.name))
    .sort();
}

export function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function sha256File(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}
