import fc from 'fast-check';

import { addDays, toDayKey } from './days';
import { computeStreak } from './streak';

const TODAY = '2026-10-13';

describe('computeStreak', () => {
  it('vaut zéro sans aucune leçon', () => {
    expect(computeStreak([], TODAY)).toEqual({ current: 0, activeToday: false });
  });

  it('compte une leçon aujourd’hui comme un jour de série', () => {
    expect(computeStreak([TODAY], TODAY)).toEqual({ current: 1, activeToday: true });
  });

  it('prolonge la série le jour suivant', () => {
    const days = ['2026-10-11', '2026-10-12', TODAY];
    expect(computeStreak(days, TODAY).current).toBe(3);
  });

  it('garde la série allumée si hier a été joué mais pas encore aujourd’hui', () => {
    const days = ['2026-10-11', '2026-10-12'];
    expect(computeStreak(days, TODAY)).toEqual({ current: 2, activeToday: false });
  });

  it('remet la série à zéro après un jour manqué', () => {
    const days = ['2026-10-10', '2026-10-11'];
    expect(computeStreak(days, TODAY).current).toBe(0);
  });

  it('repart de un après une interruption', () => {
    const days = ['2026-10-09', '2026-10-10', TODAY];
    expect(computeStreak(days, TODAY).current).toBe(1);
  });

  it('compte deux leçons le même jour comme un seul jour', () => {
    expect(computeStreak([TODAY, TODAY, '2026-10-12'], TODAY).current).toBe(2);
  });

  it('relie une leçon juste avant minuit et une autre juste après', () => {
    // Préparer : 23 h 59 le 12 puis 0 h 01 le 13, heure du Bénin
    const before = toDayKey(Date.UTC(2026, 9, 12, 22, 59), 60);
    const after = toDayKey(Date.UTC(2026, 9, 12, 23, 1), 60);
    // Agir
    const streak = computeStreak([before, after], TODAY);
    // Vérifier
    expect(streak.current).toBe(2);
  });

  it('garde les jours déjà joués quand le téléphone change de fuseau', () => {
    // Le 12 joué à Cotonou, le 13 joué à Paris : chaque jour est figé à l'instant de la leçon
    const atCotonou = toDayKey(Date.UTC(2026, 9, 12, 20, 0), 60);
    const atParis = toDayKey(Date.UTC(2026, 9, 13, 8, 0), 120);
    expect(computeStreak([atCotonou, atParis], TODAY).current).toBe(2);
  });

  it('ignore un jour dans le futur (horloge déréglée)', () => {
    expect(computeStreak(['2026-10-14', TODAY], TODAY).current).toBe(1);
  });

  it('vaut N pour N jours consécutifs finissant aujourd’hui (propriété)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 400 }), (n) => {
        const days = Array.from({ length: n }, (_, i) => addDays(TODAY, -i));
        expect(computeStreak(days, TODAY).current).toBe(n);
      }),
    );
  });

  it('ne dépasse jamais le nombre de jours joués (propriété)', () => {
    const anyDay = fc.integer({ min: -60, max: 0 }).map((offset) => addDays(TODAY, offset));
    fc.assert(
      fc.property(fc.array(anyDay, { maxLength: 60 }), (days) => {
        expect(computeStreak(days, TODAY).current).toBeLessThanOrEqual(new Set(days).size);
      }),
    );
  });
});
