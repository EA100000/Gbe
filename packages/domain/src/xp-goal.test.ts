import {
  DAILY_GOALS,
  dailyGoalProgress,
  DEFAULT_DAILY_GOAL,
  goalMinutes,
  isDailyGoalId,
} from './goal';
import { ACCURACY_BONUS_XP, computeAccuracy, LESSON_XP, lessonXp } from './xp';

describe('computeAccuracy', () => {
  it('donne la part d’exercices réussis du premier coup', () => {
    expect(computeAccuracy(9, 10)).toBe(0.9);
  });

  it('vaut zéro pour une leçon vide', () => {
    expect(computeAccuracy(0, 0)).toBe(0);
  });

  it('reste entre 0 et 1 même avec des valeurs incohérentes', () => {
    expect(computeAccuracy(12, 10)).toBe(1);
    expect(computeAccuracy(-1, 10)).toBe(0);
  });
});

describe('lessonXp', () => {
  it('donne le bonus quand la précision est bonne (exemple de la maquette : 90 % → +15)', () => {
    expect(lessonXp(0.9)).toBe(LESSON_XP + ACCURACY_BONUS_XP);
  });

  it('donne la base seule quand la précision est faible', () => {
    expect(lessonXp(0.5)).toBe(LESSON_XP);
  });
});

describe('objectif du jour', () => {
  it('propose les quatre objectifs de la maquette, de 5 à 20 minutes', () => {
    expect(DAILY_GOALS.map((g) => g.minutes)).toEqual([5, 10, 15, 20]);
    expect(DAILY_GOALS.map((g) => g.level)).toEqual([1, 2, 3, 4]);
  });

  it('choisit « Régulier » par défaut, comme la maquette', () => {
    expect(goalMinutes(DEFAULT_DAILY_GOAL)).toBe(10);
  });

  it('reconnaît un identifiant d’objectif stocké', () => {
    expect(isDailyGoalId('serious')).toBe(true);
    expect(isDailyGoalId('toString')).toBe(false);
  });

  it('calcule l’avancement à partir du temps passé', () => {
    expect(dailyGoalProgress(5 * 60_000, 'regular')).toEqual({ ratio: 0.5, reached: false });
  });

  it('plafonne l’avancement à 100 % une fois l’objectif atteint', () => {
    expect(dailyGoalProgress(30 * 60_000, 'relaxed')).toEqual({ ratio: 1, reached: true });
  });
});
