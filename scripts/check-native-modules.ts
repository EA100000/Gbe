/**
 * Contrôle des modules natifs de l'appli (ceux qu'Expo Go embarque pour le SDK 57).
 *
 * Deux défauts invisibles sur le web cassent l'appli sur un téléphone :
 * - deux copies d'un même module natif (ex. react-native-svg dans le dossier racine et dans
 *   apps/mobile) : « Tried to register two views with the same name » au démarrage ;
 * - une version hors de celle prévue par le SDK : module natif d'Expo Go incompatible.
 *
 * Usage : tsx scripts/check-native-modules.ts [--lock package-lock.json]
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

import { ROOT } from './lib/packs';

const { values } = parseArgs({
  options: { lock: { type: 'string', default: join(ROOT, 'package-lock.json') } },
});

interface LockFile {
  packages: Record<string, { version?: string }>;
}

/** Versions attendues par le SDK d'Expo installé (même source que `npx expo install`). */
const expected = JSON.parse(
  readFileSync(join(ROOT, 'node_modules', 'expo', 'bundledNativeModules.json'), 'utf8'),
) as Record<string, string>;
const lock = JSON.parse(readFileSync(values.lock, 'utf8')) as LockFile;

/** `x.y.z`, `~x.y.z` ou `^x.y.z` (les seules formes utilisées par Expo) ; `null` si inconnue. */
function satisfies(version: string, range: string): boolean | null {
  const parse = (v: string) => v.split('-')[0]?.split('.').map(Number) ?? [];
  const match = /^([~^]?)(\d+\.\d+\.\d+)$/.exec(range.trim());
  if (match === null) return null;
  const [, operator, base] = match;
  const [maj = 0, min = 0, pat = 0] = parse(version);
  const [bMaj = 0, bMin = 0, bPat = 0] = parse(base ?? '');
  const atLeast = maj > bMaj || (maj === bMaj && (min > bMin || (min === bMin && pat >= bPat)));
  if (operator === '') return maj === bMaj && min === bMin && pat === bPat;
  if (operator === '~') return atLeast && maj === bMaj && min === bMin;
  return atLeast && maj === bMaj && (bMaj > 0 || min === bMin);
}

const copies = new Map<string, { path: string; version: string }[]>();
for (const [path, info] of Object.entries(lock.packages)) {
  const marker = path.lastIndexOf('node_modules/');
  if (marker === -1 || info.version === undefined) continue;
  const name = path.slice(marker + 'node_modules/'.length);
  if (!(name in expected)) continue;
  copies.set(name, [...(copies.get(name) ?? []), { path, version: info.version }]);
}

const problems: string[] = [];
for (const [name, installed] of [...copies].sort(([a], [b]) => a.localeCompare(b))) {
  const range = expected[name] ?? '*';
  if (installed.length > 1) {
    problems.push(
      `${name} : ${installed.length} copies (${installed.map((c) => `${c.version} dans ${c.path}`).join(', ')})`,
    );
  }
  for (const copy of installed) {
    if (satisfies(copy.version, range) === false) {
      problems.push(`${name} ${copy.version} (${copy.path}) : le SDK attend ${range}`);
    }
  }
}

if (problems.length > 0) {
  console.error('Modules natifs à corriger :');
  for (const problem of problems) console.error(`  ✗ ${problem}`);
  console.error(
    'Une seule copie par module, à la version du SDK (voir "overrides" dans package.json).',
  );
  process.exit(1);
}
console.log(`✓ ${copies.size} modules natifs : une seule copie chacun, versions du SDK.`);
