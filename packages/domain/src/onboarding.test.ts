import {
  isLearningReason,
  isSelfLevel,
  LEARNING_REASONS,
  SELF_LEVELS,
  selfLevelBars,
  suggestsPlacementTest,
} from './onboarding';

describe('questions du démarrage', () => {
  it('reconnaît les sept raisons d’apprendre, et rien d’autre', () => {
    expect(LEARNING_REASONS).toHaveLength(7);
    expect(LEARNING_REASONS.every(isLearningReason)).toBe(true);
    expect(isLearningReason('argent')).toBe(false);
    expect(isLearningReason(null)).toBe(false);
  });

  it('reconnaît les quatre niveaux, et rien d’autre', () => {
    expect(SELF_LEVELS.every(isSelfLevel)).toBe(true);
    expect(isSelfLevel('expert')).toBe(false);
    expect(isSelfLevel(3)).toBe(false);
  });

  it('affiche une à quatre barres selon le niveau', () => {
    expect(SELF_LEVELS.map(selfLevelBars)).toEqual([1, 2, 3, 4]);
  });

  it('annonce le test de niveau à partir des phrases simples', () => {
    expect(SELF_LEVELS.map(suggestsPlacementTest)).toEqual([false, false, true, true]);
  });
});
