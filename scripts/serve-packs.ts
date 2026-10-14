/**
 * Sert dist-packs/ en local, pour tester le téléchargement des packs sans stockage S3.
 * Sur un téléphone (Expo Go), mettre dans apps/mobile/.env :
 *   EXPO_PUBLIC_PACKS_URL=http://<adresse-IP-du-poste>:8090
 *
 * Usage : npm run packs:serve [-- --port 8090 --dir dist-packs]
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { parseArgs } from 'node:util';

import { ROOT } from './lib/packs';

const { values } = parseArgs({
  options: {
    port: { type: 'string', default: '8090' },
    dir: { type: 'string', default: join(ROOT, 'dist-packs') },
  },
});
const root = resolve(values.dir);
const TYPES: Record<string, string> = { '.json': 'application/json', '.m4a': 'audio/mp4' };

createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const path = normalize(decodeURIComponent((req.url ?? '/').split('?')[0] ?? '/'));
  const file = join(root, path);
  // Refuse tout chemin qui sortirait du dossier servi.
  if (!file.startsWith(root + sep) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
}).listen(Number(values.port), '0.0.0.0', () => {
  console.log(`Packs servis depuis ${root} sur http://0.0.0.0:${values.port}`);
});
