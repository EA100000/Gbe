/**
 * Sert l'export web de l'appli (apps/mobile/dist) pour les tests de parcours Playwright.
 * Toute adresse inconnue renvoie index.html : c'est Expo Router qui choisit l'écran.
 *
 * Usage : tsx scripts/serve-web.ts [--port 8770] [--dir apps/mobile/dist]
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { parseArgs } from 'node:util';

import { ROOT } from './lib/packs';

const { values } = parseArgs({
  options: {
    port: { type: 'string', default: '8770' },
    dir: { type: 'string', default: join(ROOT, 'apps', 'mobile', 'dist') },
  },
});
const root = resolve(values.dir);
const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.ttf': 'font/ttf',
  '.m4a': 'audio/mp4',
  '.svg': 'image/svg+xml',
};

createServer((req, res) => {
  const path = normalize(decodeURIComponent((req.url ?? '/').split('?')[0] ?? '/'));
  let file = join(root, path);
  const inside = file.startsWith(root + sep);
  if (!inside || !existsSync(file) || !statSync(file).isFile()) file = join(root, 'index.html');
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
}).listen(Number(values.port), '127.0.0.1', () => {
  console.log(`Appli web servie depuis ${root} sur http://127.0.0.1:${values.port}`);
});
