import type { RichText } from '@gbe/content-schema';

/** Valeur brute d’une cellule : donnée externe, lue sans présumer de son type. */
export type CellValue = unknown;

/** Texte d'une cellule : chaîne nette, en Unicode NFC, espaces multiples réduits. */
export function cellText(value: CellValue): string {
  if (value === null || value === undefined) return '';
  const raw = value instanceof Date ? value.toISOString().slice(0, 10) : String(value);
  return raw.normalize('NFC').replace(/\s+/g, ' ').trim();
}

/** Comparaison tolérante des titres de feuilles et de colonnes (casse, apostrophes, espaces). */
export function headerKey(value: CellValue): string {
  return cellText(value).toLowerCase().replace(/[’`]/g, "'");
}

const YES = new Set(['oui', 'o', 'x', 'yes', 'y', '1', 'vrai', 'true']);
const NO = new Set(['non', 'n', 'no', '0', 'faux', 'false', '']);

/** « oui » / « non » (et variantes) ; `null` pour une réponse illisible. */
export function parseYesNo(value: CellValue): boolean | null {
  if (typeof value === 'boolean') return value;
  const key = headerKey(value);
  if (YES.has(key)) return true;
  if (NO.has(key)) return false;
  return null;
}

/** Ponctuation retirée au bord des tuiles : la phrase complète, elle, la garde. */
const EDGE_PUNCTUATION = /^[\s.,;:!?…«»"“”()–—-]+|[\s.,;:!?…«»"“”()–—-]+$/gu;

function stripEdges(token: string): string {
  return token.replace(EDGE_PUNCTUATION, '');
}

/** Découpage par défaut d'une phrase en tuiles : un mot par tuile, sans la ponctuation. */
export function splitTiles(sentence: string): string[] {
  return cellText(sentence)
    .split(' ')
    .map(stripEdges)
    .filter((tile) => tile.length > 0);
}

/** Découpage écrit par les experts : tuiles séparées par « / ». */
export function parseTiles(cell: string): string[] {
  return cellText(cell)
    .split('/')
    .map((tile) => stripEdges(tile.trim()))
    .filter((tile) => tile.length > 0);
}

/** Vrai si les tuiles, mises bout à bout, redonnent la phrase (ponctuation mise à part). */
export function tilesMatchSentence(sentence: string, tiles: readonly string[]): boolean {
  return splitTiles(sentence).join(' ') === tiles.flatMap(splitTiles).join(' ');
}

/** Clé de comparaison d'une tuile : distingue les tons, ignore la casse. */
export function tileKey(tile: string): string {
  return tile.normalize('NFC').toLocaleLowerCase('fr');
}

/**
 * Texte mixte : les mots fon sont écrits entre [crochets], le reste est en français.
 * `null` si un crochet n'est pas refermé (ou ouvert deux fois).
 */
export function parseRichText(cell: string): RichText | null {
  const text = cellText(cell);
  const parts: RichText = [];
  let rest = text;
  while (rest.length > 0) {
    const open = rest.indexOf('[');
    const close = rest.indexOf(']');
    if (open === -1) {
      if (close !== -1) return null;
      parts.push({ fr: rest });
      break;
    }
    if (close < open) return null;
    if (open > 0) parts.push({ fr: rest.slice(0, open) });
    const fon = rest.slice(open + 1, close).trim();
    if (fon.length === 0 || fon.includes('[')) return null;
    parts.push({ fon });
    rest = rest.slice(close + 1);
  }
  return parts.length > 0 ? parts : null;
}

/**
 * Durée estimée d'un enregistrement, en attendant le vrai fichier :
 * environ 80 ms par lettre, 600 ms au moins, une fois et demie plus long en vitesse lente.
 */
export function estimateDurationMs(fon: string, speed: 'normal' | 'slow'): number {
  const letters = [...fon.normalize('NFD')].filter((c) => /\p{L}/u.test(c)).length;
  const normal = Math.min(8000, Math.max(600, Math.round((300 + letters * 80) / 100) * 100));
  return speed === 'slow' ? Math.round((normal * 1.5) / 100) * 100 : normal;
}

/** Empreinte FNV-1a sur 32 bits : un ordre « mélangé » mais identique à chaque import. */
function fnv1a(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

/** Mélange déterministe : même graine et mêmes clés, même ordre. */
export function stableShuffle<T>(
  items: readonly T[],
  keyOf: (item: T) => string,
  seed: string,
): T[] {
  return items
    .map((item) => ({ item, rank: fnv1a(`${seed}:${keyOf(item)}`) }))
    .sort((a, b) => a.rank - b.rank)
    .map(({ item }) => item);
}

/** « De six à dix » → « de six à dix » (pour les étiquettes « Révision · … »). */
export function lowerFirst(text: string): string {
  return text.length === 0 ? text : text.charAt(0).toLocaleLowerCase('fr') + text.slice(1);
}
