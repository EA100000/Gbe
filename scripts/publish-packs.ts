/**
 * Prépare la diffusion des packs : un dossier statique prêt à envoyer sur le stockage (S3 + CDN).
 *
 *   dist-packs/catalog.json                       liste des packs (seul fichier qui change)
 *   dist-packs/packs/<id>/<version>/manifest.json empreintes SHA-256 de chaque fichier
 *   dist-packs/packs/<id>/<version>/pack.json     et les audios : jamais réécrits ensuite
 *
 * Usage : npm run packs:publish [-- --allow-unvalidated] [--out dossier]
 * Par défaut, seuls les packs validés par les experts sont publiés.
 * `--allow-unvalidated` sert aux tests et à la bêta : l'appli affiche alors son bandeau d'avertissement.
 */
import { copyFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

import {
  buildCatalog,
  CATALOG_FILE,
  catalogEntry,
  listPackFiles,
  MANIFEST_FILE,
  packPath,
  validatePack,
  verifyManifest,
  type CatalogEntry,
} from '@gbe/content-schema';

import { listPackDirs, readJson, ROOT, sha256File } from './lib/packs';

const { values } = parseArgs({
  options: {
    'allow-unvalidated': { type: 'boolean', default: false },
    out: { type: 'string', default: join(ROOT, 'dist-packs') },
  },
});
const outDir = resolve(values.out);
const allowUnvalidated = values['allow-unvalidated'];

const entries: CatalogEntry[] = [];
let failures = 0;

rmSync(outDir, { recursive: true, force: true });

for (const dir of listPackDirs()) {
  const name = basename(dir);
  const result = validatePack(readJson(join(dir, 'pack.json')));
  if (!result.ok) {
    console.error(`✗ ${name} : pack invalide (npm run content:validate)`);
    failures += 1;
    continue;
  }
  const { pack } = result;
  if (!pack.validated && !allowUnvalidated) {
    console.warn(
      `- ${name} : non validé par les experts, pas publié (--allow-unvalidated pour forcer)`,
    );
    continue;
  }

  // Le manifeste doit correspondre exactement aux fichiers : sinon, content:build n'a pas été relancé.
  const manifestPath = join(dir, MANIFEST_FILE);
  const actual = new Map(listPackFiles(pack).map((path) => [path, sha256File(join(dir, path))]));
  const manifest = verifyManifest(readJson(manifestPath), actual, pack);
  if (!manifest.ok) {
    console.error(`✗ ${name} : manifeste périmé (npm run content:build)`);
    failures += 1;
    continue;
  }

  const target = join(outDir, packPath(pack.id, pack.version));
  for (const path of [MANIFEST_FILE, ...listPackFiles(pack)]) {
    mkdirSync(dirname(join(target, path)), { recursive: true });
    copyFileSync(join(dir, path), join(target, path));
  }
  entries.push(catalogEntry(pack, manifest.manifest, sha256File(manifestPath)));
  console.log(`✓ ${pack.id} v${pack.version}${pack.validated ? '' : ' (NON VALIDÉ)'}`);
}

if (failures > 0) {
  process.exitCode = 1;
} else if (entries.length === 0) {
  console.error('Aucun pack à publier.');
  process.exitCode = 1;
} else {
  const catalog = buildCatalog(entries, new Date());
  writeFileSync(join(outDir, CATALOG_FILE), `${JSON.stringify(catalog, null, 2)}\n`);
  console.log(`Catalogue écrit : ${join(outDir, CATALOG_FILE)} (${entries.length} pack(s))`);
  console.log(
    'Étape suivante : npm run packs:upload (ou npm run packs:serve pour tester en local).',
  );
}
