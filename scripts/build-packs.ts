/**
 * Prépare les packs pour la diffusion :
 * 1. écrit le manifeste (empreinte SHA-256 et taille de chaque fichier) ;
 * 2. génère la liste des packs embarqués dans l'appli mobile (premier lancement hors-ligne) ;
 * 3. écrit le programme du cours, content/programme.json (ADR 0018).
 *
 * Usage : npm run content:build
 */
import { statSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

import type { Manifest } from '@gbe/content-schema';
import { listPackFiles, validatePack } from '@gbe/content-schema';

import { renderBundleModule, type BundledPackSource } from './lib/bundle';
import { listPackDirs, MOBILE_BUNDLE_FILE, readJson, sha256File } from './lib/packs';
import { buildProgramme, PROGRAMME_JSON, renderProgramme } from './lib/programme';

const bundled: BundledPackSource[] = [];

for (const dir of listPackDirs()) {
  const result = validatePack(readJson(join(dir, 'pack.json')));
  if (!result.ok) {
    console.error(`Pack invalide, lance « npm run content:validate » : ${basename(dir)}`);
    process.exitCode = 1;
    continue;
  }
  const { pack } = result;
  const manifest: Manifest = {
    formatVersion: pack.formatVersion,
    packId: pack.id,
    version: pack.version,
    files: listPackFiles(pack).map((path) => ({
      path,
      sha256: sha256File(join(dir, path)),
      bytes: statSync(join(dir, path)).size,
    })),
  };
  writeFileSync(join(dir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  bundled.push({ dir, audioFiles: pack.audios.map((a) => a.file) });
  console.log(`Manifeste écrit : ${pack.id} v${pack.version} (${manifest.files.length} fichiers)`);
}

if (process.exitCode !== 1) {
  writeFileSync(MOBILE_BUNDLE_FILE, renderBundleModule(bundled));
  console.log(`Packs embarqués dans l’appli : ${bundled.length}`);
  const programme = buildProgramme();
  writeFileSync(PROGRAMME_JSON, renderProgramme(programme));
  console.log(`Programme : ${programme.units.length} unités prévues`);
}
