/**
 * Contrôle bloquant de la CI : chaque pack doit être valide avant d'arriver dans l'appli.
 * - schéma Zod et cohérence interne (NFC, références, bonnes réponses) ;
 * - chaque audio déclaré existe ;
 * - le manifeste correspond aux fichiers (empreintes SHA-256).
 *
 * Usage : npm run content:validate
 */
import { existsSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';

import {
  listPackFiles,
  validatePack,
  validateProgramme,
  verifyManifest,
} from '@gbe/content-schema';

import { renderBundleModule, type BundledPackSource } from './lib/bundle';
import { listPackDirs, MOBILE_BUNDLE_FILE, readJson, sha256File } from './lib/packs';
import { buildProgramme, PROGRAMME_JSON, renderProgramme } from './lib/programme';

let failures = 0;
const dirs = listPackDirs();
const bundled: BundledPackSource[] = [];

for (const dir of dirs) {
  const name = basename(dir);
  const result = validatePack(readJson(join(dir, 'pack.json')));
  if (!result.ok) {
    failures += 1;
    console.error(`✗ ${name} : pack invalide`);
    for (const issue of result.issues)
      console.error(`   - [${issue.code}] ${issue.path} : ${issue.message}`);
    continue;
  }
  const { pack } = result;

  const missing = listPackFiles(pack).filter((path) => !existsSync(join(dir, path)));
  if (missing.length > 0) {
    failures += 1;
    console.error(`✗ ${name} : fichiers absents (lance « npm run audio:placeholders »)`);
    for (const path of missing) console.error(`   - ${path}`);
    continue;
  }

  const manifestPath = join(dir, 'manifest.json');
  if (!existsSync(manifestPath)) {
    failures += 1;
    console.error(`✗ ${name} : manifest.json absent (lance « npm run content:build »)`);
    continue;
  }
  const hashes = new Map(listPackFiles(pack).map((path) => [path, sha256File(join(dir, path))]));
  const manifest = verifyManifest(readJson(manifestPath), hashes, pack);
  if (!manifest.ok) {
    failures += 1;
    console.error(`✗ ${name} : manifeste incorrect (lance « npm run content:build »)`);
    for (const issue of manifest.issues) console.error(`   - [${issue.code}] ${issue.message}`);
    continue;
  }

  bundled.push({ dir, audioFiles: pack.audios.map((a) => a.file) });
  const status = pack.validated ? 'validé par les experts' : 'NON VALIDÉ (contenu de test)';
  console.log(`✓ ${name} v${pack.version} : ${pack.audios.length} audios, ${status}`);
}

if (dirs.length === 0) console.warn('Aucun pack trouvé dans content/packs.');

// L'appli doit embarquer exactement les packs du dépôt.
const expectedBundle = renderBundleModule(bundled);
const actualBundle = existsSync(MOBILE_BUNDLE_FILE) ? readFileSync(MOBILE_BUNDLE_FILE, 'utf8') : '';
if (failures === 0 && actualBundle !== expectedBundle) {
  failures += 1;
  console.error('✗ Packs embarqués dans l’appli pas à jour (lance « npm run content:build »)');
}
// Le programme (titres des unités à venir) doit être valide et à jour.
const programme = existsSync(PROGRAMME_JSON)
  ? validateProgramme(readJson(PROGRAMME_JSON))
  : { ok: false as const, issues: ['fichier absent'] };
if (!programme.ok) {
  failures += 1;
  console.error('✗ content/programme.json invalide (lance « npm run content:build »)');
  for (const issue of programme.issues) console.error(`   - ${issue}`);
} else if (readFileSync(PROGRAMME_JSON, 'utf8') !== renderProgramme(buildProgramme())) {
  failures += 1;
  console.error('✗ content/programme.json pas à jour (lance « npm run content:build »)');
} else {
  console.log(`✓ programme : ${programme.programme.units.length} unités prévues`);
}
if (failures > 0) {
  console.error(`\n${failures} pack(s) en erreur.`);
  process.exit(1);
}
