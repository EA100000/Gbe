/**
 * Questions du démarrage (écrans 1a et 1b, propositions validées le 15/10/2026).
 * Les réponses restent sur le téléphone : elles ne sont pas envoyées au serveur.
 */

/** Raisons d'apprendre le fon, dans l'ordre d'affichage. */
export const LEARNING_REASONS = [
  'famille',
  'racines',
  'voyage',
  'couple',
  'travail',
  'curiosite',
  'autre',
] as const;

export type LearningReason = (typeof LEARNING_REASONS)[number];

export function isLearningReason(value: unknown): value is LearningReason {
  return (LEARNING_REASONS as readonly unknown[]).includes(value);
}

/** Niveaux déclarés par l'apprenant, du débutant au plus avancé. */
export const SELF_LEVELS = ['decouverte', 'quelques-mots', 'phrases-simples', 'un-peu'] as const;

export type SelfLevel = (typeof SELF_LEVELS)[number];

export function isSelfLevel(value: unknown): value is SelfLevel {
  return (SELF_LEVELS as readonly unknown[]).includes(value);
}

/** Nombre de barres affichées pour un niveau (1 à 4), comme pour l'objectif du jour. */
export function selfLevelBars(level: SelfLevel): number {
  return SELF_LEVELS.indexOf(level) + 1;
}

/**
 * Vrai pour un niveau qui mériterait un test de niveau. Il n'existe pas encore :
 * l'écran l'annonce, et tout le monde commence à la première leçon.
 */
export function suggestsPlacementTest(level: SelfLevel): boolean {
  return selfLevelBars(level) >= 3;
}
