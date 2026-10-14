import { leagueDaysLeft, leagueWeek, rankLeague } from './league';

/** Instant donné en heure du Bénin (UTC+1). */
const benin = (y: number, m: number, d: number, h = 0, min = 0) =>
  Date.UTC(y, m - 1, d, h - 1, min);

describe('semaine de Ligue', () => {
  it('commence le lundi à minuit, heure du Bénin', () => {
    // Le 14 octobre 2026 est un mercredi.
    const week = leagueWeek(benin(2026, 10, 14, 15));
    expect(week.key).toBe('2026-10-12');
    expect(week.start).toBe(benin(2026, 10, 12));
    expect(week.end).toBe(benin(2026, 10, 19));
  });

  it('range le dimanche à 23 h 59 dans la semaine qui finit', () => {
    expect(leagueWeek(benin(2026, 10, 18, 23, 59)).key).toBe('2026-10-12');
    expect(leagueWeek(benin(2026, 10, 19, 0, 0)).key).toBe('2026-10-19');
  });

  it('compte les jours restants comme la maquette (« Encore 3 jours »)', () => {
    const now = benin(2026, 10, 16, 9);
    expect(leagueDaysLeft(leagueWeek(now).end, now)).toBe(3);
    const lastMinute = benin(2026, 10, 18, 23, 59);
    expect(leagueDaysLeft(leagueWeek(lastMinute).end, lastMinute)).toBe(1);
  });

  it('gère les dates avant 1970 sans se tromper de lundi', () => {
    expect(leagueWeek(benin(1969, 12, 31, 12)).key).toBe('1969-12-29');
  });
});

describe('classement d’un groupe', () => {
  it('classe par XP de la semaine, puis par ordre d’arrivée', () => {
    const ranked = rankLeague([
      { name: 'b', xp: 30, joinedAt: 2 },
      { name: 'a', xp: 30, joinedAt: 1 },
      { name: 'c', xp: 90, joinedAt: 3 },
      { name: 'd', xp: 0, joinedAt: 0 },
    ]);
    expect(ranked.map((e) => [e.name, e.rank])).toEqual([
      ['c', 1],
      ['a', 2],
      ['b', 3],
      ['d', 4],
    ]);
  });
});
