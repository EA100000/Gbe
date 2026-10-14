/**
 * Normalisation du texte en fon.
 *
 * Règle du projet : tout texte fon est normalisé en NFC à la saisie, au stockage
 * et avant toute comparaison. La recherche peut ignorer les tons ; la correction
 * et l'affichage, jamais.
 */

/** Diacritiques de ton : aigu, grave, circonflexe, macron, caron (combinants). */
const TONE_MARKS = /[\u0300\u0301\u0302\u0304\u030c]/g;

/** Forme canonique d'un texte fon : NFC, espaces simples, sans espace en bordure. */
export function normalizeFon(text: string): string {
  return text.normalize('NFC').replace(/\s+/g, ' ').trim().normalize('NFC');
}

/** Deux textes fon sont égaux s'ils ont la même forme canonique (tons compris). */
export function fonEquals(a: string, b: string): boolean {
  return normalizeFon(a) === normalizeFon(b);
}

/**
 * Clé de recherche : sans tons et en minuscules.
 * Les lettres propres au fon (ɖ, ɛ, ɔ) sont conservées.
 * À n'utiliser que pour chercher, jamais pour corriger.
 */
export function stripTonesForSearch(text: string): string {
  return normalizeFon(text.normalize('NFD').replace(TONE_MARKS, '').toLowerCase());
}
