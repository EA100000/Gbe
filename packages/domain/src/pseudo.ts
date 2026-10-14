import type { Rng } from './random';

/**
 * Pseudos de la Ligue : un nom et un adjectif tirés au hasard, jamais du texte libre.
 * Pas de texte libre = pas d'insulte possible, rien à modérer, aucune donnée personnelle.
 * Les adjectifs sont invariables en genre : « Tortue sage » comme « Lion sage ».
 * Ces listes sont partagées par l'appli (tirage) et l'API (contrôle).
 */
export const PSEUDO_NOUNS = [
  'Lion',
  'Caméléon',
  'Pangolin',
  'Hibou',
  'Lamantin',
  'Tortue',
  'Gazelle',
  'Colibri',
  'Baobab',
  'Manguier',
  'Calebasse',
  'Pirogue',
  'Cauri',
  'Ananas',
  'Karité',
  'Tambour',
  'Lagune',
  'Soleil',
  'Étoile',
  'Hérisson',
] as const;

export const PSEUDO_ADJECTIVES = [
  'rapide',
  'calme',
  'sage',
  'agile',
  'brave',
  'habile',
  'tranquille',
  'solide',
  'fidèle',
  'aimable',
  'drôle',
  'énergique',
] as const;

const pick = <T>(items: readonly T[], rng: Rng): T => {
  const item = items[Math.floor(rng() * items.length)];
  if (item === undefined) throw new Error('Liste vide');
  return item;
};

/** Tire un pseudo. Avec `avoid`, en tire un différent (pour « Changer de pseudo »). */
export function generatePseudo(rng: Rng, avoid?: string | null): string {
  for (;;) {
    const pseudo = `${pick(PSEUDO_NOUNS, rng)} ${pick(PSEUDO_ADJECTIVES, rng)}`;
    if (pseudo !== avoid) return pseudo;
  }
}

const VALID = new Set(PSEUDO_NOUNS.flatMap((n) => PSEUDO_ADJECTIVES.map((a) => `${n} ${a}`)));

/** Vrai seulement pour un pseudo issu des listes (le serveur refuse tout le reste). */
export function isValidPseudo(value: unknown): value is string {
  return typeof value === 'string' && VALID.has(value.normalize('NFC'));
}
