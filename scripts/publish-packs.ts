/**
 * Prépare la diffusion des packs : un dossier statique prêt à envoyer sur le stockage (S3 + CDN).
 *
 *   dist-packs/catalog.json                       liste des packs (seul fichier qui change)
 *   dist-packs/packs/<id>/<version>/manifest.json empreintes SHA-256 de chaque fichier
 *   dist-packs/packs/<id>/<version>/pack.json     et les audios : jamais réécrits ensuite
 *
 * Usage : npm run packs:publish [-- --allow-unvalidated] [--out dossier] [--test-version N]
 * Par défaut, seuls les packs validés par les experts sont publiés.
 * `--allow-unvalidated` sert aux tests et à la bêta : l'appli affiche alors son bandeau d'avertissement.
 * `--test-version N` (tests sur téléphone seulement) : publie le même contenu sous la version N,
 * pour vérifier qu'un téléphone télécharge bien une mise à jour. packs:upload refuse ce dossier.
 */
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

import {
  buildCatalog,
  CATALOG_FILE,
  catalogEntry,
  listPackFiles,
  MANIFEST_FILE,
  PACK_FILE,
  packPath,
  validatePack,
  verifyManifest,
  type CatalogEntry,
  type Manifest,
} from '@gbe/content-schema';

import { listPackDirs, readJson, ROOT, sha256File, TEST_MARKER_FILE } from './lib/packs';

const { values } = parseArgs({
  options: {
    'allow-unvalidated': { type: 'boolean', default: false },
    out: { type: 'string', default: join(ROOT, 'dist-packs') },
    'test-version': { type: 'string' },
  },
});
const outDir = resolve(values.out);
const allowUnvalidated = values['allow-unvalidated'];
const testVersion =
  values['test-version'] === undefined ? undefined : Number(values['test-version']);
if (testVersion !== undefined && (!Number.isInteger(testVersion) || testVersion < 1)) {
  throw new Error('--test-version attend un entier positif');
}
if (testVersion !== undefined && !allowUnvalidated) {
  throw new Error('--test-version sert aux tests : ajoute --allow-unvalidated');
}
const sha256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');

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

  if (testVersion === undefined) {
    const target = join(outDir, packPath(pack.id, pack.version));
    for (const path of [MANIFEST_FILE, ...listPackFiles(pack)]) {
      mkdirSync(dirname(join(target, path)), { recursive: true });
      copyFileSync(join(dir, path), join(target, path));
    }
    entries.push(catalogEntry(pack, manifest.manifest, sha256File(manifestPath)));
    console.log(`✓ ${pack.id} v${pack.version}${pack.validated ? '' : ' (NON VALIDÉ)'}`);
    continue;
  }

  // Version de test : même contenu, numéro de version changé, manifeste recalculé.
  if (testVersion <= pack.version) {
    console.error(`✗ ${name} : --test-version doit dépasser la version actuelle (${pack.version})`);
    failures += 1;
    continue;
  }
  const raw = readJson(join(dir, PACK_FILE)) as Record<string, unknown>;
  const packBytes = Buffer.from(`${JSON.stringify({ ...raw, version: testVersion }, null, 2)}\n`);
  const target = join(outDir, packPath(pack.id, testVersion));
  mkdirSync(target, { recursive: true });
  writeFileSync(join(target, PACK_FILE), packBytes);
  const testManifest: Manifest = {
    formatVersion: pack.formatVersion,
    packId: pack.id,
    version: testVersion,
    files: listPackFiles(pack).map((path) => {
      if (path === PACK_FILE) return { path, sha256: sha256(packBytes), bytes: packBytes.length };
      mkdirSync(dirname(join(target, path)), { recursive: true });
      copyFileSync(join(dir, path), join(target, path));
      return { path, sha256: sha256File(join(dir, path)), bytes: statSync(join(dir, path)).size };
    }),
  };
  const manifestBytes = Buffer.from(`${JSON.stringify(testManifest, null, 2)}\n`);
  writeFileSync(join(target, MANIFEST_FILE), manifestBytes);
  entries.push(
    catalogEntry({ ...pack, version: testVersion }, testManifest, sha256(manifestBytes)),
  );
  console.log(`✓ ${pack.id} v${testVersion} (VERSION DE TEST, même contenu que v${pack.version})`);
}

if (failures > 0) {
  process.exitCode = 1;
} else if (entries.length === 0) {
  console.error('Aucun pack à publier.');
  process.exitCode = 1;
} else {
  const catalog = buildCatalog(entries, new Date());
  writeFileSync(join(outDir, CATALOG_FILE), `${JSON.stringify(catalog, null, 2)}\n`);
  if (testVersion !== undefined) {
    // Garde-fou : packs:upload refuse d'envoyer un dossier qui contient une version de test.
    writeFileSync(join(outDir, TEST_MARKER_FILE), 'Version de test : ne jamais publier.\n');
  }
  console.log(`Catalogue écrit : ${join(outDir, CATALOG_FILE)} (${entries.length} pack(s))`);
  console.log(
    'Étape suivante : npm run packs:upload (ou npm run packs:serve pour tester en local).',
  );
}
