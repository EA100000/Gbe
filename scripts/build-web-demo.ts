/**
 * Démo web en un seul fichier HTML, pour faire essayer l'appli par un simple lien.
 *
 * 1. exporte la version web de l'appli (Expo) ;
 * 2. intègre le code, les polices et les sons dans la page (adresses « data: ») :
 *    la démo ne dépend d'aucun autre fichier ni de l'adresse où elle est hébergée.
 *
 * Ce n'est pas la version de production (voir docs/adr/0004).
 * Usage : npm run demo:web  →  apps/mobile/dist-demo/index.html
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';

import { ROOT } from './lib/packs';

const MOBILE = join(ROOT, 'apps', 'mobile');
const DIST = join(MOBILE, 'dist');
const OUT_DIR = join(MOBILE, 'dist-demo');

const MIME: Record<string, string> = {
  '.ttf': 'font/ttf',
  '.m4a': 'audio/mp4',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function dataUri(path: string): string {
  const mime = MIME[extname(path)] ?? 'application/octet-stream';
  return `data:${mime};base64,${readFileSync(path).toString('base64')}`;
}

// --clear : Metro garde en cache les variables EXPO_PUBLIC_* d'une compilation précédente
// (une adresse de serveur de test, par exemple) ; la démo doit partir de l'environnement actuel.
execFileSync('npx', ['expo', 'export', '--platform', 'web', '--output-dir', 'dist', '--clear'], {
  cwd: MOBILE,
  stdio: 'inherit',
  env: { ...process.env, CI: '1', EXPO_OFFLINE: '1' },
});

const html = readFileSync(join(DIST, 'index.html'), 'utf8');
const entry = /<script src="(\/_expo\/static\/js\/web\/[^"]+\.js)" defer><\/script>/.exec(html);
if (entry?.[1] === undefined) throw new Error('Bundle web introuvable dans index.html');

// Sur le web, Metro remplace chaque ressource par son adresse « /assets/… » : on la remplace
// par le contenu du fichier lui-même.
let bundle = readFileSync(join(DIST, entry[1]), 'utf8');
let inlined = 0;
bundle = bundle.replace(
  /(["'])(\/assets\/[^"']+\.(?:ttf|m4a|png))\1/g,
  (match, quote: string, url: string) => {
    const file = join(DIST, decodeURIComponent(url));
    try {
      statSync(file);
    } catch {
      return match;
    }
    inlined += 1;
    return `${quote}${dataUri(file)}${quote}`;
  },
);

/**
 * Rend le code sûr dans une balise <script> : « <!-- », « <script » et « </script » changent
 * l'analyse HTML. « \x3C » vaut « < » dans les chaînes et les expressions régulières.
 */
function escapeForInlineScript(code: string): string {
  return code.replace(/<(!--|\/?script)/gi, (_match, rest: string) => `\\x3C${rest}`);
}

// L'hébergeur des pages ajoute lui-même <!doctype>, <html>, <head> et <body> :
// on ne garde que le contenu (titre, styles, racine, code).
const resetStyle = /<style id="expo-reset">[\s\S]*?<\/style>/.exec(html)?.[0];
if (resetStyle === undefined) throw new Error('Styles de base introuvables dans index.html');

// Remplacements par fonction : le code intégré contient des « $ » que String.replace interpréterait.
const page = [
  '<title>Tourismo</title>',
  resetStyle.replace(
    '</style>',
    () => `  /* Démo : largeur de téléphone centrée sur grand écran, fond explicite. */
      html, body { margin: 0; background: #FDF1D8; color: #211D18; }
      #root { max-width: 440px; margin: 0 auto; background: #FFFFFF; box-shadow: 0 0 0 1px #E7E1D7; }
    </style>`,
  ),
  '<noscript>Active JavaScript pour essayer Tourismo.</noscript>',
  '<div id="root"></div>',
  // L'hébergeur peut servir la page sous n'importe quel chemin (« /index.html », « /<id>/ ») :
  // le routeur de l'appli doit partir de « / », qui mène au démarrage ou au chemin.
  `<script>try { if (location.pathname !== '/') history.replaceState(null, '', '/'); } catch (e) {}</script>`,
  `<script>${escapeForInlineScript(bundle)}</script>`,
  '',
].join('\n');

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, 'index.html'), page);
const megabytes = (Buffer.byteLength(page) / 1024 / 1024).toFixed(1);
console.log(
  `Démo web : ${join(OUT_DIR, 'index.html')} (${megabytes} Mo, ${inlined} ressources intégrées)`,
);
