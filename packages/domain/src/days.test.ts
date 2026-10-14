import { addDays, daysBetween, isDayKey, toDayKey } from './days';

const BENIN = 60; // UTC+1, sans heure d'été

describe('toDayKey', () => {
  it('donne le jour local au Bénin juste avant minuit', () => {
    // 22 h 59 UTC = 23 h 59 à Cotonou
    expect(toDayKey(Date.UTC(2026, 9, 13, 22, 59), BENIN)).toBe('2026-10-13');
  });

  it('passe au jour suivant juste après minuit local', () => {
    // 23 h 01 UTC = 0 h 01 à Cotonou, le 14
    expect(toDayKey(Date.UTC(2026, 9, 13, 23, 1), BENIN)).toBe('2026-10-14');
  });

  it('tient compte d’un fuseau en retard sur UTC', () => {
    // 2 h UTC = 22 h la veille à New York en heure d'été (UTC-4)
    expect(toDayKey(Date.UTC(2026, 9, 14, 2, 0), -240)).toBe('2026-10-13');
  });
});

describe('addDays', () => {
  it('passe d’un mois à l’autre', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
  });

  it('recule en franchissant une année', () => {
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
  });

  it('gère le 29 février des années bissextiles', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('refuse un jour mal formé', () => {
    expect(() => addDays('13/10/2026', 1)).toThrow('Jour invalide');
  });

  it('refuse une date qui n’existe pas', () => {
    expect(() => addDays('2026-02-30', 1)).toThrow('Jour invalide');
  });
});

describe('daysBetween', () => {
  it('compte les jours dans les deux sens', () => {
    expect(daysBetween('2026-10-01', '2026-10-13')).toBe(12);
    expect(daysBetween('2026-10-13', '2026-10-01')).toBe(-12);
  });
});

describe('isDayKey', () => {
  it('reconnaît un jour valide et rejette le reste', () => {
    expect(isDayKey('2026-10-13')).toBe(true);
    expect(isDayKey('2026-13-01')).toBe(false);
    expect(isDayKey('hier')).toBe(false);
  });
});
