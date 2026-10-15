/**
 * Alternance des voix (ADR 0016) : chaque écoute d'un texte enregistré par les deux experts
 * passe à la voix suivante. Le tour est commun à toute l'appli, si bien que deux mots écoutés
 * l'un après l'autre ne tombent pas toujours sur la même voix.
 */
let turn = 0;

/** Prise à jouer maintenant parmi celles d'un texte ; un texte à une seule prise la garde. */
export function nextTake(takes: readonly string[]): string | undefined {
  if (takes.length <= 1) return takes[0];
  const take = takes[turn % takes.length];
  turn += 1;
  return take;
}

/** Repart de la première voix (tests). */
export function resetTakeRotation(): void {
  turn = 0;
}
